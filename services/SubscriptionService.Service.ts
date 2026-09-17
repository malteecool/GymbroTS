import { supabase } from '../supabaseConfig';
import {
    CreatorPlan, CreatorPlanDraft, CreatorSubscription, isEntitled,
} from '../interfaces/Subscription.Interface';

/**
 * Creator plans and entitlements, read from Postgres.
 *
 * This service reads the *record* of a subscription. It does not create one —
 * `subscription` has a SELECT policy and no write policy of any kind, so every
 * INSERT/UPDATE/DELETE from this client is refused no matter what it sends.
 * Rows arrive from the billing webhook holding the service role key
 * (supabase/functions/billing-webhook/). Purchases go through
 * PurchaseService.Service.ts, which talks to the store; the entitlement shows
 * up here afterwards, when the webhook has been delivered.
 *
 * Everything here is for RENDERING. The paywall itself is has_creator_access()
 * inside the database, evaluated on every read of gated content and on every
 * signed-URL request. A client that patched out the checks in this file would
 * change what it draws and nothing about what it can fetch.
 */

function mapPlanRow(row: any): CreatorPlan {
    return {
        creatorId: row.creator_id,
        priceMinor: row.price_minor,
        currency: row.currency,
        isAcceptingSubscribers: row.is_accepting_subscribers ?? false,
        blurb: row.blurb ?? null,
        externalProductId: row.external_product_id ?? null,
    };
}

function mapSubscriptionRow(row: any): CreatorSubscription {
    return {
        id: row.id,
        subscriberId: row.subscriber_id,
        creatorId: row.creator_id,
        status: row.status,
        cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
        accessExpiresAt: row.access_expires_at,
        provider: row.provider,
    };
}

/**
 * A creator's plan, or null when they have never set one up.
 *
 * Readable by anyone signed in — it is a price tag, and the shop window has to
 * be browsable for anyone to consider paying for it.
 */
export async function getCreatorPlan(creatorId: string): Promise<CreatorPlan | null> {
    try {
        const { data, error } = await supabase
            .from('creator_plan')
            .select('*')
            .eq('creator_id', creatorId)
            .maybeSingle();

        if (error) throw error;
        return data ? mapPlanRow(data) : null;
    } catch (error) {
        console.error('Error getting creator plan:', error);
        throw error;
    }
}

/**
 * Creates or updates the signed-in user's own plan.
 *
 * `external_product_id` is deliberately absent from the payload and must stay
 * that way. It is not merely policy-protected but privilege-protected: the
 * table UPDATE grant is revoked and re-granted column by column, and that
 * column is not among them. Adding it here produces a database error, not a
 * silent no-op — which is the intended outcome, since a creator who could claim
 * a product identifier could point their plan at a product someone else sells.
 */
export async function upsertOwnCreatorPlan(
    creatorId: string,
    draft: CreatorPlanDraft,
): Promise<CreatorPlan> {
    try {
        const { data, error } = await supabase
            .from('creator_plan')
            .upsert({
                creator_id: creatorId,
                price_minor: draft.priceMinor,
                currency: draft.currency,
                is_accepting_subscribers: draft.isAcceptingSubscribers,
                blurb: draft.blurb,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'creator_id' })
            .select()
            .single();

        if (error) throw error;
        return mapPlanRow(data);
    } catch (error) {
        console.error('Error saving creator plan:', error);
        throw error;
    }
}

/**
 * The signed-in user's subscription row for one creator, or null.
 *
 * Returns the row whatever its state — an expired or refunded subscription is
 * still worth showing ("your access ended on …") and the caller decides. Use
 * isEntitled() rather than checking `status` alone: an 'active' row whose
 * access_expires_at has passed is not access.
 */
export async function getSubscriptionForCreator(
    creatorId: string,
): Promise<CreatorSubscription | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('subscription')
            .select('*')
            .eq('subscriber_id', user.id)
            .eq('creator_id', creatorId)
            .maybeSingle();

        if (error) throw error;
        return data ? mapSubscriptionRow(data) : null;
    } catch (error) {
        console.error('Error getting subscription for creator:', error);
        throw error;
    }
}

/**
 * Mirrors the database's has_creator_access(), including the part people forget:
 * a creator always has access to their own content. Diverging from the SQL here
 * shows up as a paywall over content the server would happily serve, or a
 * spinner over content it will not.
 */
export async function hasAccessToCreator(creatorId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    if (user.id === creatorId) return true;

    return isEntitled(await getSubscriptionForCreator(creatorId));
}

/** Every creator the signed-in user currently has access to. */
export async function getActiveSubscriptions(): Promise<CreatorSubscription[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('subscription')
            .select('*')
            .eq('subscriber_id', user.id)
            .eq('status', 'active')
            .gt('access_expires_at', new Date().toISOString())
            .order('access_expires_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapSubscriptionRow);
    } catch (error) {
        console.error('Error getting active subscriptions:', error);
        throw error;
    }
}

/**
 * How many people currently pay the signed-in creator.
 *
 * The SELECT policy covers both parties to a subscription, so a creator reading
 * their own subscriber count is reading rows they are entitled to. Counted
 * server-side rather than fetched — the app only ever needs the number.
 */
export async function getOwnSubscriberCount(creatorId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('subscription')
            .select('id', { count: 'exact', head: true })
            .eq('creator_id', creatorId)
            .eq('status', 'active')
            .gt('access_expires_at', new Date().toISOString());

        if (error) throw error;
        return count ?? 0;
    } catch (error) {
        console.error('Error getting subscriber count:', error);
        throw error;
    }
}
