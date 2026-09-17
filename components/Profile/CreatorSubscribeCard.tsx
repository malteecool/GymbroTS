import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { CreatorPaywallSheet } from '../Social/CreatorPaywallSheet';
import { CreatorAccess } from '../../hooks/useCreatorAccess';
import { formatPlanPrice } from '../../interfaces/Subscription.Interface';

interface CreatorSubscribeCardProps {
    creatorId: string;
    creatorName: string;
    access: CreatorAccess;
}

/** "3 March 2026" — the date access runs out, in the reader's locale. */
function formatExpiry(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    } catch {
        return iso.slice(0, 10);
    }
}

/**
 * A creator's shop window on their profile.
 *
 * The price belongs here as well as on the workout list: someone who lands on a
 * profile should be able to see what a subscription costs without first digging
 * into the workouts to find a locked one.
 *
 * Renders nothing at all when there is nothing to say — no plan, a plan closed
 * to new subscribers, or your own profile. A dormant "Subscribe" card on every
 * profile in the app would be noise, and on your own it would be nonsense.
 */
export function CreatorSubscribeCard({ creatorId, creatorName, access }: CreatorSubscribeCardProps) {
    const [paywallVisible, setPaywallVisible] = useState(false);

    const { plan, subscription, hasAccess, isOwnContent, loading } = access;

    if (loading || isOwnContent) return null;
    // Someone who already subscribed still sees their status even after the
    // creator closes the door, which is why hasAccess is checked separately.
    if (!plan || (!plan.isAcceptingSubscribers && !hasAccess)) return null;

    if (hasAccess && subscription) {
        return (
            <View style={[styles.card, styles.cardSubscribed]}>
                <MaterialCommunityIcons name="check-decagram" size={20} color={Theme.colors.green} />
                <View style={styles.textBlock}>
                    <Text style={styles.title}>Subscribed</Text>
                    <Text style={styles.hint}>
                        {subscription.cancelAtPeriodEnd
                            // Cancelled is not expired. They keep what they paid
                            // for, and saying otherwise would be a lie that also
                            // loses the renewal.
                            ? `Access until ${formatExpiry(subscription.accessExpiresAt)}. It will not renew.`
                            : `Renews ${formatExpiry(subscription.accessExpiresAt)}.`}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <>
            <TouchableOpacity
                style={styles.card}
                onPress={() => setPaywallVisible(true)}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="star-circle-outline" size={20} color={Theme.colors.accent} />
                <View style={styles.textBlock}>
                    <Text style={styles.title}>
                        Subscribe · {formatPlanPrice(plan.priceMinor, plan.currency)}
                    </Text>
                    <Text style={styles.hint} numberOfLines={2}>
                        {plan.blurb ?? `Unlock ${creatorName}'s subscriber-only workouts.`}
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.colors.accent} />
            </TouchableOpacity>

            <CreatorPaywallSheet
                visible={paywallVisible}
                onRequestClose={() => setPaywallVisible(false)}
                creatorId={creatorId}
                creatorName={creatorName}
                plan={plan}
                onSubscribed={access.refresh}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.accentFaint,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginTop: Theme.spacing.sm,
    },
    cardSubscribed: {
        backgroundColor: Theme.colors.successSoft,
    },
    textBlock: {
        flex: 1,
    },
    title: {
        ...Theme.typography.bodyStrong,
    },
    hint: {
        ...Theme.typography.caption,
        marginTop: 2,
    },
});
