import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Workout } from '../../interfaces/Workout.Interface';
import {
    getPublicWorkouts, getWorkoutExercises, copyWorkout, linkWorkout, WorkoutLockedError,
} from '../../services/WorkoutService.Service';
import { getStordUserData } from '../../services/UserService.Service';
import { StarRating } from '../../components/ui/StarRating';
import { CreatorPaywallSheet } from '../../components/Social/CreatorPaywallSheet';
import { useCreatorAccess } from '../../hooks/useCreatorAccess';

interface WorkoutRow {
    workout: Workout;
    exerciseNames: string[];
    actionLoading: 'copy' | 'follow' | null;
}

export default function UserWorkoutsScreen() {
    const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>();
    const router = useRouter();

    const [rows, setRows] = useState<WorkoutRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');
    const [paywallVisible, setPaywallVisible] = useState(false);

    // Access is per-creator, not per-workout: subscribing unlocks everything
    // this person has marked subscriber-only, so one lookup covers the screen.
    const access = useCreatorAccess(userId);

    const load = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const [user, workouts] = await Promise.all([
                getStordUserData(),
                getPublicWorkouts(userId),
            ]);
            if (user) setCurrentUserId(user.id);

            // A subscriber-only workout comes back with an empty exercise list
            // for anyone who has not paid - RLS filters the rows, which is the
            // paywall doing its job. The renderer tells that apart from a
            // genuinely empty workout by looking at the tier, not at the count.
            const withExercises = await Promise.all(workouts.map(async workout => {
                const exercises = await getWorkoutExercises(workout.id);
                return {
                    workout,
                    exerciseNames: exercises.map(e => e.exeName),
                    actionLoading: null as null,
                };
            }));
            setRows(withExercises);
        } catch (e) {
            console.error('Error loading public workouts:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const setRowLoading = (workoutId: string, actionLoading: 'copy' | 'follow' | null) => {
        setRows(prev => prev.map(r => r.workout.id === workoutId ? { ...r, actionLoading } : r));
    };

    /** True for a workout whose exercises this viewer may not read. */
    const isLocked = (workout: Workout) =>
        workout.accessTier === 'subscribers' && !access.hasAccess;

    /**
     * Copy and follow share one guard because they share one failure. Cloning a
     * workout you have not paid for already fails safe - the exercise rows are
     * unreadable, so the clone comes out empty - but it fails as an empty
     * workout, which reads as a bug rather than as a price. WorkoutLockedError
     * turns it into the paywall, and is caught below as well as checked here:
     * the pre-check keeps the common path quick, the catch covers a
     * subscription that lapsed between loading this screen and tapping.
     */
    const runClone = async (
        workout: Workout,
        action: 'copy' | 'follow',
        clone: (sourceId: string, userId: string) => Promise<string>,
    ) => {
        if (!currentUserId) return;

        if (isLocked(workout)) {
            setPaywallVisible(true);
            return;
        }

        try {
            setRowLoading(workout.id, action);
            const newWorkoutId = await clone(workout.id, currentUserId);
            router.push({ pathname: '/workout/workoutDetails', params: { workoutId: newWorkoutId } });
        } catch (e) {
            if (e instanceof WorkoutLockedError) {
                await access.refresh();
                setPaywallVisible(true);
                return;
            }
            Alert.alert('Error', `Could not ${action} this workout. Please try again.`);
        } finally {
            setRowLoading(workout.id, null);
        }
    };

    const handleCopy = (workout: Workout) => runClone(workout, 'copy', copyWorkout);
    const handleFollow = (workout: Workout) => runClone(workout, 'follow', linkWorkout);

    // Held until access is known as well as the workouts. Rendering earlier
    // would paint every subscriber-only card locked for a moment and then
    // unlock them, which reads to a paying subscriber as the paywall glitching.
    if (loading || access.loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={rows}
                keyExtractor={item => item.workout.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.workoutName} numberOfLines={1}>{item.workout.worName}</Text>
                            <View style={styles.badgeRow}>
                                {item.workout.accessTier === 'subscribers' && (
                                    <View style={styles.tierBadge}>
                                        <MaterialCommunityIcons
                                            name={access.hasAccess ? 'lock-open-variant' : 'lock'}
                                            size={12}
                                            color={Theme.colors.accent}
                                        />
                                        <Text style={styles.tierBadgeText}>
                                            {access.hasAccess ? 'Subscribed' : 'Subscribers'}
                                        </Text>
                                    </View>
                                )}
                                {(item.workout.copyCount ?? 0) > 0 && (
                                    <View style={styles.copyBadge}>
                                        <MaterialCommunityIcons name="content-copy" size={12} color={Theme.colors.secondary} />
                                        <Text style={styles.copyBadgeText}>{item.workout.copyCount}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="account-heart" size={14} color={Theme.colors.secondary} />
                                <Text style={styles.statText}>{item.workout.followerCount ?? 0}</Text>
                            </View>
                            {(item.workout.ratingCount ?? 0) > 0 ? (
                                <View style={styles.statItem}>
                                    <StarRating rating={item.workout.avgRating ?? 0} size={14} />
                                    <Text style={styles.statText}>
                                        {item.workout.avgRating?.toFixed(1)} ({item.workout.ratingCount})
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.noRatingsText}>No ratings yet</Text>
                            )}
                        </View>
                        {/*
                          * Order matters: locked is checked before empty. Both
                          * arrive here as a zero-length list, and calling a
                          * paywalled workout "empty" is how a paywall gets
                          * mistaken for a bug.
                          */}
                        {isLocked(item.workout) ? (
                            <View style={styles.lockedPreview}>
                                <MaterialCommunityIcons name="lock-outline" size={14} color={Theme.colors.accent} />
                                <Text style={styles.lockedPreviewText}>
                                    Subscribe to see the exercises in this workout
                                </Text>
                            </View>
                        ) : item.exerciseNames.length > 0 ? (
                            <Text style={styles.exercisePreview} numberOfLines={2}>
                                {item.exerciseNames.join(' · ')}
                            </Text>
                        ) : (
                            <Text style={styles.exercisePreviewEmpty}>No exercises yet</Text>
                        )}

                        {isLocked(item.workout) ? (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.subscribeBtn]}
                                onPress={() => setPaywallVisible(true)}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="lock-open-variant-outline" size={16} color={Theme.colors.dark} />
                                <Text style={styles.copyBtnText}>Subscribe to unlock</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.actionsRow}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.copyBtn]}
                                    onPress={() => handleCopy(item.workout)}
                                    disabled={item.actionLoading !== null}
                                    activeOpacity={0.8}
                                >
                                    {item.actionLoading === 'copy' ? (
                                        <ActivityIndicator size="small" color={Theme.colors.dark} />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="content-copy" size={16} color={Theme.colors.dark} />
                                            <Text style={styles.copyBtnText}>Copy</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.followBtn]}
                                    onPress={() => handleFollow(item.workout)}
                                    disabled={item.actionLoading !== null}
                                    activeOpacity={0.8}
                                >
                                    {item.actionLoading === 'follow' ? (
                                        <ActivityIndicator size="small" color={Theme.colors.font} />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="link-variant" size={16} color={Theme.colors.font} />
                                            <Text style={styles.followBtnText}>Follow</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="weight-lifter" size={56} color={Theme.colors.secondary} />
                        <Text style={styles.emptyText}>
                            {name ? `${name} hasn't shared any public workouts yet` : 'No public workouts yet'}
                        </Text>
                    </View>
                }
            />

            <CreatorPaywallSheet
                visible={paywallVisible}
                onRequestClose={() => setPaywallVisible(false)}
                creatorId={userId}
                creatorName={name}
                plan={access.plan}
                // The entitlement is already readable by the time this fires,
                // so re-running the workout query now returns the exercises
                // that RLS was filtering out a moment ago.
                onSubscribed={() => { access.refresh(); load(); }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
    },
    list: {
        padding: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
        flexGrow: 1,
    },
    card: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        ...Theme.shadows.small,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Theme.spacing.xs,
    },
    workoutName: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.semibold,
        // Keeps a long name from pushing the badges off the card.
        flexShrink: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Theme.colors.accentSoft,
        borderRadius: Theme.borderRadius.round,
        paddingHorizontal: Theme.spacing.sm,
        paddingVertical: 2,
    },
    tierBadgeText: {
        color: Theme.colors.accent,
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.semibold,
    },
    lockedPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        marginBottom: Theme.spacing.md,
    },
    lockedPreviewText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        flexShrink: 1,
    },
    subscribeBtn: {
        backgroundColor: Theme.colors.accent,
    },
    copyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    copyBadgeText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        marginBottom: Theme.spacing.xs,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    statText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
    },
    noRatingsText: {
        color: Theme.colors.placeholder,
        fontSize: Theme.fontSize.xs,
        fontStyle: 'italic',
    },
    exercisePreview: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        marginBottom: Theme.spacing.md,
    },
    exercisePreviewEmpty: {
        color: Theme.colors.placeholder,
        fontSize: Theme.fontSize.sm,
        fontStyle: 'italic',
        marginBottom: Theme.spacing.md,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: Theme.spacing.sm,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.lg,
    },
    copyBtn: {
        backgroundColor: Theme.colors.yellow,
    },
    copyBtnText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    followBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    followBtnText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Theme.spacing.xl,
        gap: Theme.spacing.md,
        paddingTop: '30%',
    },
    emptyText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
    },
});
