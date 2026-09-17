import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Billing webhook — the only thing in the system allowed to grant entitlements.
 *
 * `subscription` has a SELECT policy and no write policy at all, so no client
 * can grant itself access no matter what it sends. This function holds the
 * service role key, which bypasses RLS, and is therefore the single door. It is
 * deployed with verify_jwt = false because the caller is RevenueCat, not a
 * signed-in user — which means the authentication below is the ONLY thing
 * standing between the open internet and free subscriptions. Treat it as such.
 *
 * Deploy:
 *   supabase functions deploy billing-webhook --no-verify-jwt
 *
 * Secrets (never in the app bundle — these are server-side only):
 *   supabase secrets set BILLING_WEBHOOK_SECRET=<the value you paste into RevenueCat>
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
 */

const PROVIDER = "revenuecat";

const WEBHOOK_SECRET = Deno.env.get("BILLING_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/**
 * Sandbox purchases cost nothing. Granting real entitlements for them would
 * make the paywall free to anyone who can run a debug build, so they are
 * rejected unless explicitly allowed — which you only want on a test project.
 */
const ALLOW_SANDBOX = (Deno.env.get("BILLING_ALLOW_SANDBOX") ?? "false") === "true";

/** Compares in constant time, so a wrong secret leaks nothing through timing. */
function secretMatches(provided: string, expected: string): boolean {
    if (expected.length === 0) return false;
    const a = new TextEncoder().encode(provided);
    const b = new TextEncoder().encode(expected);
    // Length is compared inside the loop rather than early-returning on it, so a
    // wrong length costs the same as a wrong byte.
    let diff = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return diff === 0;
}

type Normalized = {
    externalEventId: string;
    eventType: string;
    subscriberId: string;
    productId: string | null;
    externalSubscriptionId: string | null;
    eventAt: Date;
    isSandbox: boolean;
};

/**
 * RevenueCat's payload, reduced to the handful of fields that decide anything.
 * Keeping this separate from the logic below is what makes a second provider an
 * additional parser rather than a rewrite.
 */
function parseRevenueCat(body: any): Normalized | null {
    const e = body?.event;
    if (!e || typeof e.id !== "string" || typeof e.type !== "string") return null;

    const subscriberId = e.app_user_id ?? e.original_app_user_id;
    if (typeof subscriberId !== "string" || subscriberId.length === 0) return null;

    return {
        externalEventId: e.id,
        eventType: e.type,
        subscriberId,
        productId: typeof e.product_id === "string" ? e.product_id : null,
        // RevenueCat has no stable per-subscription id, so the (subscriber,
        // product) pair stands in for one. It only has to be stable enough to
        // recognise the same subscription again.
        externalSubscriptionId: e.product_id ? `${subscriberId}:${e.product_id}` : null,
        eventAt: new Date(e.event_timestamp_ms ?? Date.now()),
        isSandbox: e.environment === "SANDBOX",
    };
}

type Outcome = {
    status: "active" | "expired" | "refunded";
    cancelAtPeriodEnd: boolean;
    /** null means "end access now" — computed against the event, not the clock. */
    accessExpiresAt: Date | null;
};

/**
 * Event type -> entitlement state.
 *
 * The distinction that matters: CANCELLATION is not EXPIRATION. Cancelling
 * means "do not renew", and the subscriber keeps what they already paid for
 * until the period ends. A refund is the opposite — the money went back, so
 * access stops immediately regardless of how much time was left.
 */
function decide(eventType: string, expirationMs: number | null): Outcome | null {
    const expiresAt = expirationMs ? new Date(expirationMs) : null;

    switch (eventType) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
        case "UNCANCELLATION":
        case "PRODUCT_CHANGE":
        case "NON_RENEWING_PURCHASE":
            return { status: "active", cancelAtPeriodEnd: false, accessExpiresAt: expiresAt };

        case "CANCELLATION":
            // Still paid up. Only the renewal is off.
            return { status: "active", cancelAtPeriodEnd: true, accessExpiresAt: expiresAt };

        case "BILLING_ISSUE":
            // The store retries for days before giving up. Keep access until the
            // paid period genuinely ends; an EXPIRATION will follow if it fails.
            return { status: "active", cancelAtPeriodEnd: true, accessExpiresAt: expiresAt };

        case "EXPIRATION":
            return { status: "expired", cancelAtPeriodEnd: true, accessExpiresAt: null };

        case "REFUND":
        case "CHARGEBACK":
            return { status: "refunded", cancelAtPeriodEnd: true, accessExpiresAt: null };

        // TRANSFER, SUBSCRIBER_ALIAS, TEST and anything RevenueCat adds later:
        // understood, deliberately not acted on. Answered 2xx so the provider
        // stops retrying, and recorded so the decision is visible afterwards.
        default:
            return null;
    }
}

function json(status: number, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

Deno.serve(async (req: Request) => {
    if (req.method !== "POST") {
        return json(405, { error: "method not allowed" });
    }

    if (!WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
        // Refuse rather than run unauthenticated. A missing secret must never
        // degrade into "accept everything".
        console.error("billing-webhook is misconfigured: missing required env");
        return json(500, { error: "not configured" });
    }

    if (!secretMatches(req.headers.get("Authorization") ?? "", WEBHOOK_SECRET)) {
        return json(401, { error: "unauthorized" });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return json(400, { error: "invalid json" });
    }

    const event = parseRevenueCat(body);
    if (!event) {
        return json(400, { error: "unrecognised payload" });
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    // Claim the event first. The unique (provider, external_event_id) index
    // makes this the idempotency gate: a redelivery loses the race here and
    // never reaches the entitlement write.
    const { error: claimError } = await db.from("billing_event").insert({
        provider: PROVIDER,
        external_event_id: event.externalEventId,
        event_type: event.eventType,
        payload: body as Record<string, unknown>,
    });

    if (claimError) {
        if (claimError.code === "23505") {
            return json(200, { ok: true, deduplicated: true });
        }
        // Could not even record it — let the provider retry.
        console.error("failed to record billing event", claimError);
        return json(500, { error: "could not record event" });
    }

    const finish = async (status: string, detail: string, httpStatus = 200) => {
        await db.from("billing_event")
            .update({ status, detail })
            .eq("provider", PROVIDER)
            .eq("external_event_id", event.externalEventId);
        return json(httpStatus, { ok: httpStatus < 400, status, detail });
    };

    if (event.isSandbox && !ALLOW_SANDBOX) {
        return await finish("ignored", "sandbox event rejected on a production project");
    }

    const expirationMs = (body as any)?.event?.expiration_at_ms ?? null;
    const outcome = decide(event.eventType, expirationMs);
    if (!outcome) {
        return await finish("ignored", `no entitlement change for ${event.eventType}`);
    }

    if (!event.productId) {
        return await finish("failed", "event carried no product_id", 400);
    }

    // Product -> creator. An unknown product is a real misconfiguration (a
    // creator onboarded in the store but not here), so it is recorded as failed
    // rather than quietly ignored.
    const { data: plan } = await db
        .from("creator_plan")
        .select("creator_id")
        .eq("external_product_id", event.productId)
        .maybeSingle();

    if (!plan) {
        return await finish("failed", `no creator_plan for product ${event.productId}`, 400);
    }

    // The subscriber id is whatever the app passed to Purchases.logIn(). If it
    // is not one of our users, granting on it would create an entitlement
    // nobody can use and hide a real integration bug.
    const { data: subscriber } = await db
        .from("app_user")
        .select("id")
        .eq("id", event.subscriberId)
        .maybeSingle();

    if (!subscriber) {
        return await finish("failed", `unknown subscriber ${event.subscriberId}`, 400);
    }

    if (plan.creator_id === subscriber.id) {
        // The CHECK constraint would reject it anyway; caught here so it reads
        // as a decision rather than a database error.
        return await finish("ignored", "creator cannot subscribe to themselves");
    }

    // Out-of-order guard. An event older than the last one applied to this
    // subscription is dropped, so a late CANCELLATION cannot undo the RENEWAL
    // that actually came after it.
    const { data: existing } = await db
        .from("subscription")
        .select("id, last_event_at")
        .eq("subscriber_id", subscriber.id)
        .eq("creator_id", plan.creator_id)
        .maybeSingle();

    if (existing?.last_event_at && new Date(existing.last_event_at) >= event.eventAt) {
        return await finish("ignored", "stale event, newer state already applied");
    }

    const accessExpiresAt = outcome.accessExpiresAt ?? new Date();

    const { error: upsertError } = await db.from("subscription").upsert({
        subscriber_id: subscriber.id,
        creator_id: plan.creator_id,
        status: outcome.status,
        cancel_at_period_end: outcome.cancelAtPeriodEnd,
        access_expires_at: accessExpiresAt.toISOString(),
        provider: PROVIDER,
        external_subscription_id: event.externalSubscriptionId,
        last_event_at: event.eventAt.toISOString(),
        updated_at: new Date().toISOString(),
    }, { onConflict: "subscriber_id,creator_id" });

    if (upsertError) {
        console.error("failed to apply entitlement", upsertError);
        // 5xx so the provider retries: the event is recorded but unapplied, and
        // a retry will find it already claimed... so this is the one path that
        // needs manual attention. Logged loudly for that reason.
        await db.from("billing_event")
            .update({ status: "failed", detail: upsertError.message })
            .eq("provider", PROVIDER)
            .eq("external_event_id", event.externalEventId);
        return json(500, { error: "could not apply entitlement" });
    }

    return await finish("applied", `${event.eventType} -> ${outcome.status}`);
});
