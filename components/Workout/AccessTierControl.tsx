import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { AccessTier, CreatorPlan } from '../../interfaces/Subscription.Interface';

interface AccessTierControlProps {
    value: AccessTier;
    onChange: (tier: AccessTier) => void;
    /** Whether the workout is shared at all. Tier is meaningless while false. */
    isPublic: boolean;
    /** The owner's own plan, or null if they have never set one up. */
    plan: CreatorPlan | null;
    saving?: boolean;
    /** Opens the creator plan screen from the warning below. */
    onSetUpPlan: () => void;
}

/**
 * Free vs subscriber-only, for a workout you own.
 *
 * Sits next to the share toggle because the two compose and neither replaces
 * the other: sharing decides whether the workout is LISTED, this decides
 * whether its CONTENTS are free. A subscriber-only workout is still publicly
 * visible as a listing — that is the shop window, and it has to be browsable
 * for anyone to consider paying for it.
 *
 * Two states here exist to stop a creator quietly shipping a broken paywall:
 *
 *  - While the workout is private the control is disabled rather than hidden.
 *    Hiding it would let someone set a tier, un-share, and lose track of the
 *    fact that re-sharing does not make it free again.
 *  - A 'subscribers' tier with no sellable plan behind it is a workout nobody
 *    can unlock and nobody can pay to unlock. The database is perfectly happy
 *    with that, so the warning has to come from here.
 */
export function AccessTierControl({
    value, onChange, isPublic, plan, saving, onSetUpPlan,
}: AccessTierControlProps) {
    // Sellable means all three: a plan exists, it is open for business, and a
    // store product maps back to it. Missing the last one is the easy mistake —
    // external_product_id is set with the service role, not by the creator.
    const isSellable = Boolean(plan?.isAcceptingSubscribers && plan?.externalProductId);
    const showPlanWarning = isPublic && value === 'subscribers' && !isSellable;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <View style={styles.labelBlock}>
                    <Text style={styles.label}>Who can open it</Text>
                    <Text style={styles.hint}>
                        {!isPublic
                            ? 'Share the workout to choose'
                            : value === 'subscribers'
                                ? 'Listed for everyone; exercises for subscribers'
                                : 'Anyone can see the exercises'}
                    </Text>
                </View>
                {saving
                    ? <ActivityIndicator size="small" color={Theme.colors.accent} />
                    : (
                        <View style={!isPublic && styles.disabled} pointerEvents={isPublic ? 'auto' : 'none'}>
                            <SegmentedTabs<AccessTier>
                                options={[
                                    { value: 'free', label: 'Free' },
                                    { value: 'subscribers', label: 'Subscribers' },
                                ]}
                                value={value}
                                onChange={onChange}
                            />
                        </View>
                    )}
            </View>

            {showPlanWarning && (
                <TouchableOpacity style={styles.warning} onPress={onSetUpPlan} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="alert-outline" size={16} color={Theme.colors.accent} />
                    <Text style={styles.warningText}>
                        {plan?.isAcceptingSubscribers
                            // A plan that is open but unmapped: the creator has
                            // done their half and is waiting on the store side.
                            ? 'No store product is linked to your plan yet, so nobody can subscribe.'
                            : 'Set up your creator plan so people can subscribe.'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={Theme.colors.accent} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: Theme.spacing.md,
        marginTop: Theme.spacing.sm,
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Theme.spacing.sm,
    },
    labelBlock: {
        flexShrink: 1,
    },
    label: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
    },
    hint: {
        ...Theme.typography.caption,
        marginTop: 2,
    },
    disabled: {
        opacity: 0.4,
    },
    warning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        marginTop: Theme.spacing.sm,
        paddingTop: Theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.divider,
    },
    warningText: {
        ...Theme.typography.caption,
        color: Theme.colors.accent,
        flexShrink: 1,
    },
});
