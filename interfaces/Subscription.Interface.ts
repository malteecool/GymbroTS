/**
 * Creator subscriptions — the app-side shape of `creator_plan` and
 * `subscription` (migration/rls-step4-subscriptions.sql).
 *
 * Nothing in this file is trusted for authorization. The database decides what
 * a viewer may read, through has_creator_access(); these types exist so the UI
 * can tell a paywall from a spinner from an error. A client that lied to itself
 * about any of this would still get nothing back.
 */

/**
 * A workout's content tier. Composes with `isPublic` rather than replacing it:
 *
 *   isPublic false                      -> private, not shared at all
 *   isPublic true,  tier 'free'         -> shared, contents free
 *   isPublic true,  tier 'subscribers'  -> listed publicly, contents gated
 *
 * The tier is meaningless while isPublic is false, and deliberately not reset
 * when a workout is un-shared — re-sharing must not silently make paid content
 * free.
 */
export type AccessTier = 'free' | 'subscribers';

/**
 * What a creator charges. Display metadata only.
 *
 * The real price is whatever the store charges for `externalProductId`, and
 * that is the number the user is actually billed. These fields exist so a
 * creator's shop window reads correctly before the store product has loaded —
 * never treat `priceMinor` as authoritative for a transaction.
 */
export interface CreatorPlan {
    creatorId: string;
    /** Minor units (cents/öre). Integer, because floating point money is a bug. */
    priceMinor: number;
    /** ISO 4217, uppercase. */
    currency: string;
    isAcceptingSubscribers: boolean;
    blurb: string | null;
    /**
     * The store product that maps back to this creator, one product per creator.
     *
     * Readable here, and NOT writable by the creator: letting them claim a
     * product identifier would let them point their plan at a product someone
     * else sells and collect on it. The column privilege is revoked in
     * rls-step8-billing-webhook.sql, so an attempt to write it fails at the
     * database, not here. Set it with the service role — see
     * docs/creator-onboarding.md.
     */
    externalProductId: string | null;
}

/** What a creator may edit about their own plan. */
export type CreatorPlanDraft = Pick<
    CreatorPlan, 'priceMinor' | 'currency' | 'isAcceptingSubscribers' | 'blurb'
>;

export type SubscriptionStatus = 'active' | 'expired' | 'refunded';

/**
 * One entitlement row, written only by the billing webhook holding the service
 * role key. `subscription` has a SELECT policy and no write policy of any kind,
 * so this is read-only from the app in the strongest sense available.
 */
export interface CreatorSubscription {
    id: string;
    subscriberId: string;
    creatorId: string;
    status: SubscriptionStatus;
    /**
     * True after a CANCELLATION: the subscriber keeps what they paid for until
     * `accessExpiresAt`, they just will not be charged again. Cancelled is not
     * the same as expired, and the UI should not conflate them.
     */
    cancelAtPeriodEnd: boolean;
    accessExpiresAt: string;
    provider: string;
}

/**
 * Entitled means exactly this, and it is the same predicate the database uses
 * inside has_creator_access(). Keeping the two in step is what stops the UI
 * promising content the server will then refuse to hand over.
 */
export function isEntitled(subscription: CreatorSubscription | null): boolean {
    if (!subscription) return false;
    return subscription.status === 'active' && new Date(subscription.accessExpiresAt) > new Date();
}

/** "9.99 USD" from (999, 'USD'), falling back gracefully off the happy path. */
export function formatPlanPrice(priceMinor: number, currency: string): string {
    const major = priceMinor / 100;
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major);
    } catch {
        // An unexpected currency code should not blank the price tag.
        return `${major.toFixed(2)} ${currency}`;
    }
}
