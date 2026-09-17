import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { CreatorPlan, formatPlanPrice } from '../../interfaces/Subscription.Interface';
import {
    PurchaseCancelledError, getCreatorProduct, isPurchasesAvailable,
    purchaseCreatorSubscription, restorePurchases,
} from '../../services/PurchaseService.Service';
import { awaitEntitlement } from '../../hooks/useCreatorAccess';

interface CreatorPaywallSheetProps {
    visible: boolean;
    onRequestClose: () => void;
    creatorId: string;
    creatorName?: string;
    plan: CreatorPlan | null;
    /**
     * Fires once the entitlement is actually readable from Postgres, not when
     * the purchase completes. Callers should reload gated content here.
     */
    onSubscribed: () => void;
}

/** What the sheet is currently doing, which is most of its rendering logic. */
type Phase =
    | 'loading'         // fetching the store's price
    | 'ready'           // showing a price and a buy button
    | 'purchasing'      // the store's own sheet is up
    | 'confirming'      // paid; waiting for the webhook to write the entitlement
    | 'slow'            // paid; the entitlement has not landed within the wait
    | 'unavailable';    // nothing to sell here, for one of several reasons

/**
 * The paywall.
 *
 * Worth being clear about what this is and is not. It is a shop window: it
 * explains what is behind the gate and offers to open it. It is NOT what keeps
 * anyone out — that is has_creator_access() inside the database, evaluated on
 * every read of a gated exercise list and on every signed-URL request for a
 * paid asset. Someone who deleted this component from the bundle would see an
 * unlocked-looking screen with nothing on it.
 *
 * The two states people get wrong:
 *
 *  - 'confirming' exists because a purchase is not an entitlement. The store
 *    says yes, then RevenueCat posts to billing-webhook, then the row appears.
 *    Unlocking the UI on the purchase result would show content the next query
 *    refuses to return.
 *  - 'slow' is not an error. The money is taken and the webhook retries; the
 *    only honest thing to say is that it is on its way.
 */
export function CreatorPaywallSheet({
    visible, onRequestClose, creatorId, creatorName, plan, onSubscribed,
}: CreatorPaywallSheetProps) {
    const [phase, setPhase] = useState<Phase>('loading');
    const [storePrice, setStorePrice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const productId = plan?.externalProductId ?? null;
    const isOpenForBusiness = Boolean(plan?.isAcceptingSubscribers && productId);

    /**
     * Reads the price from the store rather than from creator_plan.
     *
     * plan.priceMinor is what the creator typed into a form; the store product
     * is what the user will actually be charged, already localised into their
     * currency. The plan price is only a placeholder while this resolves, and a
     * fallback if it never does.
     */
    const loadPrice = useCallback(async () => {
        setError(null);

        if (!isPurchasesAvailable() || !isOpenForBusiness || !productId) {
            setPhase('unavailable');
            return;
        }

        setPhase('loading');
        const product = await getCreatorProduct(productId);
        // A missing product means the creator exists here but not in the store,
        // which is a real misconfiguration and not something to paper over with
        // a buy button that cannot work.
        if (!product) {
            setPhase('unavailable');
            return;
        }

        setStorePrice(product.priceString);
        setPhase('ready');
    }, [isOpenForBusiness, productId]);

    useEffect(() => {
        if (visible) loadPrice();
    }, [visible, loadPrice]);

    const handleSubscribe = async () => {
        if (!productId) return;
        setError(null);

        try {
            setPhase('purchasing');
            await purchaseCreatorSubscription(productId);

            setPhase('confirming');
            const entitled = await awaitEntitlement(creatorId);
            if (entitled) {
                onSubscribed();
                onRequestClose();
                return;
            }
            setPhase('slow');
        } catch (e) {
            if (e instanceof PurchaseCancelledError) {
                setPhase('ready');
                return;
            }
            console.error('Error purchasing creator subscription:', e);
            setError(e instanceof Error ? e.message : 'Could not complete the purchase.');
            setPhase('ready');
        }
    };

    /**
     * Restore is the answer to a reinstall, a new device, and to a webhook that
     * was genuinely lost. It asks RevenueCat to re-examine the store account,
     * which re-fires the webhook — so a restore still grants through the same
     * single door, and still has to be waited for.
     */
    const handleRestore = async () => {
        setError(null);
        try {
            setPhase('confirming');
            await restorePurchases();
            const entitled = await awaitEntitlement(creatorId);
            if (entitled) {
                onSubscribed();
                onRequestClose();
                return;
            }
            setPhase('ready');
            setError('No purchase found for this creator on your store account.');
        } catch (e) {
            console.error('Error restoring purchases:', e);
            setPhase('ready');
            setError('Could not restore purchases.');
        }
    };

    // Dismissing mid-purchase would orphan the wait the sheet is running.
    const busy = phase === 'purchasing' || phase === 'confirming';

    const displayPrice = storePrice
        ?? (plan ? formatPlanPrice(plan.priceMinor, plan.currency) : null);

    return (
        <BottomSheet
            visible={visible}
            onRequestClose={onRequestClose}
            dismissible={!busy}
        >
            <View style={styles.header}>
                <MaterialCommunityIcons name="lock-open-variant-outline" size={22} color={Theme.colors.accent} />
                <Text style={styles.title}>
                    {creatorName ? `Subscribe to ${creatorName}` : 'Subscribe'}
                </Text>
            </View>

            {plan?.blurb ? (
                <Text style={styles.blurb}>{plan.blurb}</Text>
            ) : (
                <Text style={styles.blurb}>
                    Unlock this creator&apos;s subscriber-only workouts, including every
                    exercise, and any videos or guides attached to them.
                </Text>
            )}

            {phase === 'loading' && (
                <View style={styles.statusBlock}>
                    <ActivityIndicator size="small" color={Theme.colors.accent} />
                    <Text style={styles.statusText}>Checking the price…</Text>
                </View>
            )}

            {phase === 'unavailable' && (
                <View style={styles.statusBlock}>
                    <MaterialCommunityIcons name="store-off-outline" size={18} color={Theme.colors.textMuted} />
                    <Text style={styles.statusText}>
                        {!isPurchasesAvailable()
                            ? 'Subscriptions are not available in this build.'
                            : 'This creator is not accepting subscribers right now.'}
                    </Text>
                </View>
            )}

            {phase === 'confirming' && (
                <View style={styles.statusBlock}>
                    <ActivityIndicator size="small" color={Theme.colors.accent} />
                    <Text style={styles.statusText}>Confirming your subscription…</Text>
                </View>
            )}

            {phase === 'slow' && (
                <View style={styles.statusBlock}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={Theme.colors.accent} />
                    <Text style={styles.statusText}>
                        Your purchase went through. Access usually appears within a
                        minute — pull to refresh if it has not.
                    </Text>
                </View>
            )}

            {error && (
                <View style={styles.statusBlock}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Theme.colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {(phase === 'ready' || phase === 'purchasing') && (
                <Button
                    title={displayPrice ? `Subscribe · ${displayPrice}` : 'Subscribe'}
                    onPress={handleSubscribe}
                    loading={phase === 'purchasing'}
                    disabled={phase === 'purchasing'}
                    buttonStyle={styles.subscribeButton}
                    titleStyle={styles.subscribeButtonText}
                    containerStyle={styles.subscribeContainer}
                />
            )}

            {phase === 'ready' && (
                <TouchableOpacity onPress={handleRestore} activeOpacity={0.7} style={styles.restoreRow}>
                    <Text style={styles.restoreText}>Already subscribed? Restore purchase</Text>
                </TouchableOpacity>
            )}

            {phase === 'slow' && (
                <Button
                    title="Done"
                    onPress={() => { onSubscribed(); onRequestClose(); }}
                    buttonStyle={styles.subscribeButton}
                    titleStyle={styles.subscribeButtonText}
                    containerStyle={styles.subscribeContainer}
                />
            )}

            <Text style={styles.footnote}>
                Billed through the Play Store and managed there. Cancelling stops
                the renewal; access continues until the period you paid for ends.
            </Text>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
    },
    title: {
        ...Theme.typography.cardTitle,
        flexShrink: 1,
    },
    blurb: {
        ...Theme.typography.meta,
        marginTop: Theme.spacing.xs,
    },
    statusBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.surfaceRaised,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginTop: Theme.spacing.sm,
    },
    statusText: {
        ...Theme.typography.meta,
        flexShrink: 1,
    },
    errorText: {
        color: Theme.colors.danger,
        fontSize: Theme.fontSize.sm,
        flexShrink: 1,
    },
    subscribeContainer: {
        marginTop: Theme.spacing.md,
    },
    subscribeButton: {
        backgroundColor: Theme.colors.accent,
        borderRadius: Theme.borderRadius.xl,
        paddingVertical: Theme.spacing.md,
    },
    subscribeButtonText: {
        color: Theme.colors.textOnAccent,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
    restoreRow: {
        alignItems: 'center',
        paddingVertical: Theme.spacing.sm,
    },
    restoreText: {
        ...Theme.typography.meta,
        textDecorationLine: 'underline',
    },
    footnote: {
        ...Theme.typography.caption,
        textAlign: 'center',
        marginTop: Theme.spacing.xs,
    },
});
