import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Button } from '../../components/ui/Button';
import { getStordUserData } from '../../services/UserService.Service';
import {
    getCreatorPlan, getOwnSubscriberCount, upsertOwnCreatorPlan,
} from '../../services/SubscriptionService.Service';
import { CreatorPlan, formatPlanPrice } from '../../interfaces/Subscription.Interface';

/** Kept short and uppercase; the column has a ^[A-Z]{3}$ check on it. */
const DEFAULT_CURRENCY = 'USD';

/**
 * A creator's own shop window: what they charge, what they say about it, and
 * whether they are open for business.
 *
 * WHAT THIS SCREEN DELIBERATELY CANNOT DO
 * ---------------------------------------
 * It cannot set `external_product_id`, the store product that maps a payment
 * back to a creator. That is not an oversight and not merely a policy: the
 * table's UPDATE privilege is revoked and re-granted column by column, and that
 * column is not among them (migration/rls-step8-billing-webhook.sql). A creator
 * who could claim a product identifier could point their plan at a product
 * someone else sells and collect on it, so the mapping is set with the service
 * role. See docs/creator-onboarding.md.
 *
 * Which means a plan saved here is not yet sellable. The screen says so rather
 * than leaving someone to discover it when nobody can subscribe.
 *
 * The price below is display metadata. The real charge is whatever the store
 * charges for the linked product, and the two are kept in step by hand — this
 * field does not drive billing and never sees a payment.
 */
export default function CreatorPlanScreen() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [plan, setPlan] = useState<CreatorPlan | null>(null);
    const [subscriberCount, setSubscriberCount] = useState(0);

    // Held as typed text rather than a number so a half-entered "4." does not
    // round-trip through parseFloat on every keystroke.
    const [priceText, setPriceText] = useState('');
    const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
    const [blurb, setBlurb] = useState('');
    const [accepting, setAccepting] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const user = await getStordUserData();
            if (!user) return;
            setUserId(user.id);

            const [existing, count] = await Promise.all([
                getCreatorPlan(user.id),
                getOwnSubscriberCount(user.id),
            ]);
            setSubscriberCount(count);

            if (existing) {
                setPlan(existing);
                setPriceText((existing.priceMinor / 100).toFixed(2));
                setCurrency(existing.currency);
                setBlurb(existing.blurb ?? '');
                setAccepting(existing.isAcceptingSubscribers);
            }
        } catch (error) {
            console.error('Error loading creator plan:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!userId) return;

        const major = Number(priceText.replace(',', '.'));
        if (!Number.isFinite(major) || major < 0) {
            Alert.alert('Check the price', 'Enter a price like 4.99.');
            return;
        }
        const normalisedCurrency = currency.trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(normalisedCurrency)) {
            Alert.alert('Check the currency', 'Use a three-letter code, like USD or SEK.');
            return;
        }

        try {
            setSaving(true);
            // Rounded rather than truncated, and stored in minor units: the
            // column is an integer because floating point money is a bug
            // waiting to happen.
            const saved = await upsertOwnCreatorPlan(userId, {
                priceMinor: Math.round(major * 100),
                currency: normalisedCurrency,
                isAcceptingSubscribers: accepting,
                blurb: blurb.trim() || null,
            });
            setPlan(saved);
            setCurrency(saved.currency);
        } catch (error) {
            console.error('Error saving creator plan:', error);
            Alert.alert('Could not save', 'Your plan was not saved. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
            </View>
        );
    }

    const isLinked = Boolean(plan?.externalProductId);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={[styles.statusCard, isLinked ? styles.statusOk : styles.statusPending]}>
                <MaterialCommunityIcons
                    name={isLinked ? 'check-decagram-outline' : 'progress-clock'}
                    size={20}
                    color={isLinked ? Theme.colors.green : Theme.colors.accent}
                />
                <View style={styles.statusTextBlock}>
                    <Text style={styles.statusTitle}>
                        {isLinked ? 'Your plan is live' : 'Not sellable yet'}
                    </Text>
                    <Text style={styles.statusHint}>
                        {isLinked
                            ? `Subscribers are charged through the store for ${plan!.externalProductId}.`
                            : 'A store product still has to be linked to your plan before anyone can subscribe. That step is done by an admin.'}
                    </Text>
                </View>
            </View>

            {subscriberCount > 0 && (
                <View style={styles.row}>
                    <MaterialCommunityIcons name="account-multiple-outline" size={20} color={Theme.colors.secondary} />
                    <Text style={styles.rowLabel}>
                        {subscriberCount} active subscriber{subscriberCount === 1 ? '' : 's'}
                    </Text>
                </View>
            )}

            <Text style={styles.sectionLabel}>Price</Text>
            <View style={styles.priceRow}>
                <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={priceText}
                    onChangeText={setPriceText}
                    keyboardType="decimal-pad"
                    placeholder="4.99"
                    placeholderTextColor={Theme.colors.placeholder}
                />
                <TextInput
                    style={[styles.input, styles.currencyInput]}
                    value={currency}
                    onChangeText={setCurrency}
                    autoCapitalize="characters"
                    maxLength={3}
                    placeholder="USD"
                    placeholderTextColor={Theme.colors.placeholder}
                />
            </View>
            <Text style={styles.fieldHint}>
                Shown on your profile. The amount actually charged is set by the
                store product linked to your plan — keep the two in step.
            </Text>

            <Text style={styles.sectionLabel}>What subscribers get</Text>
            <TextInput
                style={[styles.input, styles.blurbInput]}
                value={blurb}
                onChangeText={setBlurb}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Full programmes, form videos, and weekly updates."
                placeholderTextColor={Theme.colors.placeholder}
            />

            <View style={styles.switchRow}>
                <View style={styles.switchTextBlock}>
                    <Text style={styles.rowLabel}>Accepting subscribers</Text>
                    <Text style={styles.fieldHint}>
                        Turning this off hides the subscribe button. It does not
                        cancel anyone — existing subscribers keep the access they
                        paid for until it expires.
                    </Text>
                </View>
                <Switch
                    value={accepting}
                    onValueChange={setAccepting}
                    trackColor={{ false: Theme.colors.border, true: Theme.colors.accent }}
                    thumbColor={Theme.colors.white}
                />
            </View>

            <Button
                title="Save plan"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                buttonStyle={styles.saveButton}
                titleStyle={styles.saveButtonText}
                containerStyle={styles.saveContainer}
            />

            {plan && (
                <Text style={styles.footnote}>
                    Currently saved as {formatPlanPrice(plan.priceMinor, plan.currency)}
                    {plan.isAcceptingSubscribers ? ', open for subscribers.' : ', closed to new subscribers.'}
                </Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    content: {
        padding: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.md,
    },
    statusOk: {
        backgroundColor: Theme.colors.successSoft,
    },
    statusPending: {
        backgroundColor: Theme.colors.accentFaint,
    },
    statusTextBlock: {
        flex: 1,
    },
    statusTitle: {
        ...Theme.typography.bodyStrong,
    },
    statusHint: {
        ...Theme.typography.caption,
        marginTop: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.md,
    },
    rowLabel: {
        ...Theme.typography.bodyStrong,
    },
    sectionLabel: {
        ...Theme.typography.sectionLabel,
        marginTop: Theme.spacing.sm,
        marginBottom: Theme.spacing.xs,
    },
    priceRow: {
        flexDirection: 'row',
        gap: Theme.spacing.sm,
    },
    input: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
        color: Theme.colors.font,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        fontSize: Theme.fontSize.md,
    },
    priceInput: {
        flex: 1,
    },
    currencyInput: {
        width: 90,
        textAlign: 'center',
    },
    blurbInput: {
        minHeight: 96,
    },
    fieldHint: {
        ...Theme.typography.caption,
        marginTop: Theme.spacing.xs,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginTop: Theme.spacing.lg,
    },
    switchTextBlock: {
        flex: 1,
    },
    saveContainer: {
        marginTop: Theme.spacing.lg,
    },
    saveButton: {
        backgroundColor: Theme.colors.accent,
        borderRadius: Theme.borderRadius.xl,
        paddingVertical: Theme.spacing.md,
    },
    saveButtonText: {
        color: Theme.colors.textOnAccent,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
    footnote: {
        ...Theme.typography.caption,
        textAlign: 'center',
        marginTop: Theme.spacing.md,
    },
});
