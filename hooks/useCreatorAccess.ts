import { useCallback, useEffect, useState } from 'react';
import { CreatorPlan, CreatorSubscription, isEntitled } from '../interfaces/Subscription.Interface';
import {
    getCreatorPlan, getSubscriptionForCreator,
} from '../services/SubscriptionService.Service';
import { getStordUserData } from '../services/UserService.Service';

/**
 * Everything a screen needs to decide between showing content, showing a
 * paywall, or showing a spinner, for one creator.
 *
 * `hasAccess` here is a rendering decision and nothing more. The database makes
 * the real one on every read, so the worst a wrong answer can do is draw the
 * wrong thing over content the server was never going to hand over anyway.
 */
export interface CreatorAccess {
    loading: boolean;
    /** True for your own content too, matching has_creator_access() in SQL. */
    hasAccess: boolean;
    isOwnContent: boolean;
    plan: CreatorPlan | null;
    subscription: CreatorSubscription | null;
    refresh: () => Promise<void>;
}

/**
 * How long to keep asking Postgres whether a purchase has landed.
 *
 * A purchase completes at the store, RevenueCat posts to billing-webhook, and
 * the webhook writes the entitlement. That round trip is normally a second or
 * two and occasionally much worse — retries, a cold function. 30s is long
 * enough to cover the ordinary case without leaving someone staring at a
 * spinner when delivery has genuinely stalled; past it the UI tells them the
 * purchase went through and access will appear shortly, which is true.
 */
const ENTITLEMENT_POLL_TIMEOUT_MS = 30_000;
const ENTITLEMENT_POLL_INTERVAL_MS = 1_500;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Waits for a just-made purchase to become a readable entitlement.
 *
 * This polls the database rather than trusting the purchase result, because the
 * purchase result is the store's opinion and the database is the thing that
 * actually gates content. Resolves true once the row is there and active,
 * false if it has not arrived before the timeout — which is not a failure,
 * merely an unknown. The money is taken either way and the webhook will retry.
 */
export async function awaitEntitlement(creatorId: string): Promise<boolean> {
    const deadline = Date.now() + ENTITLEMENT_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
        try {
            if (isEntitled(await getSubscriptionForCreator(creatorId))) return true;
        } catch (error) {
            // A transient read failure should not end the wait — the purchase
            // is already made and the entitlement may still be on its way.
            console.error('Error polling for entitlement:', error);
        }
        await sleep(ENTITLEMENT_POLL_INTERVAL_MS);
    }

    return false;
}

/**
 * Resolves access to one creator's paid content.
 *
 * Pass undefined while the creator is still unknown (a screen whose params have
 * not resolved yet); the hook stays in its loading state rather than answering
 * "no access" about nobody.
 */
export function useCreatorAccess(creatorId?: string): CreatorAccess {
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [isOwnContent, setIsOwnContent] = useState(false);
    const [plan, setPlan] = useState<CreatorPlan | null>(null);
    const [subscription, setSubscription] = useState<CreatorSubscription | null>(null);

    const refresh = useCallback(async () => {
        // No creator to resolve access for. Settle rather than stay loading —
        // a caller gating its own spinner on this would otherwise hang.
        if (!creatorId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);

            const storedUser = await getStordUserData();
            const own = storedUser?.id === creatorId;
            setIsOwnContent(own);

            // A creator always has access to their own content, and has no plan
            // to be shown their own price tag from. Skipping the subscription
            // read here also avoids a pointless query on every own-profile view.
            if (own) {
                setHasAccess(true);
                setSubscription(null);
                setPlan(await getCreatorPlan(creatorId));
                return;
            }

            const [creatorPlan, existing] = await Promise.all([
                getCreatorPlan(creatorId),
                getSubscriptionForCreator(creatorId),
            ]);

            setPlan(creatorPlan);
            setSubscription(existing);
            setHasAccess(isEntitled(existing));
        } catch (error) {
            console.error('Error resolving creator access:', error);
            // Fail closed. Showing a paywall to someone who has paid is a
            // support ticket; showing content to someone who has not would be
            // a refund — and the server would refuse the content regardless.
            setHasAccess(false);
        } finally {
            setLoading(false);
        }
    }, [creatorId]);

    useEffect(() => { refresh(); }, [refresh]);

    return { loading, hasAccess, isOwnContent, plan, subscription, refresh };
}
