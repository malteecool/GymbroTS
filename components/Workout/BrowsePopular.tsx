import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Workout } from '../../interfaces/Workout.Interface';
import { getPopularWorkouts, getWorkoutExercises, copyWorkout, linkWorkout } from '../../services/WorkoutService.Service';
import { getUserDataById } from '../../services/UserService.Service';
import { StarRating } from '../ui/StarRating';
import emitter from '../../hooks/CustomEventEmitter';

type SortBy = 'followers' | 'rating';

interface WorkoutRow {
    workout: Workout;
    authorName: string;
    exerciseNames: string[];
    actionLoading: 'copy' | 'follow' | null;
}

interface BrowsePopularProps {
    currentUserId: string;
}

export function BrowsePopular({ currentUserId }: BrowsePopularProps) {
    const [sortBy, setSortBy] = useState<SortBy>('followers');
    const [rows, setRows] = useState<WorkoutRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (sort: SortBy) => {
        try {
            setLoading(true);
            const workouts = await getPopularWorkouts(sort);

            const uniqueUserIds = Array.from(new Set(workouts.map((w) => w.worUserId)));
            const userEntries = await Promise.all(
                uniqueUserIds.map(async (id) => [id, await getUserDataById(id)] as const)
            );
            const userMap = new Map(userEntries);

            const withDetails = await Promise.all(workouts.map(async (workout) => {
                const exercises = await getWorkoutExercises(workout.id);
                return {
                    workout,
                    authorName: userMap.get(workout.worUserId)?.name ?? 'Unknown',
                    exerciseNames: exercises.map((e) => e.exeName),
                    actionLoading: null as null,
                };
            }));
            setRows(withDetails);
        } catch (error) {
            console.error('Error loading popular workouts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(sortBy);
    }, [sortBy, load]);

    const setRowLoading = (workoutId: string, actionLoading: 'copy' | 'follow' | null) => {
        setRows((prev) => prev.map((r) => (r.workout.id === workoutId ? { ...r, actionLoading } : r)));
    };

    const handleAction = async (workout: Workout, action: 'copy' | 'follow') => {
        if (!currentUserId) return;
        try {
            setRowLoading(workout.id, action);
            const newWorkoutId = action === 'copy'
                ? await copyWorkout(workout.id, currentUserId)
                : await linkWorkout(workout.id, currentUserId);
            emitter.emit('workoutEvent', 0);
            router.replace({ pathname: '/workout/workoutDetails', params: { workoutId: newWorkoutId } });
        } catch {
            Alert.alert('Error', `Could not ${action} this workout. Please try again.`);
            setRowLoading(workout.id, null);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.sortRow}>
                <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'followers' && styles.sortButtonActive]}
                    onPress={() => setSortBy('followers')}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name="account-heart"
                        size={16}
                        color={sortBy === 'followers' ? Theme.colors.dark : Theme.colors.font}
                    />
                    <Text style={[styles.sortButtonText, sortBy === 'followers' && styles.sortButtonTextActive]}>
                        Most Followed
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
                    onPress={() => setSortBy('rating')}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name="star"
                        size={16}
                        color={sortBy === 'rating' ? Theme.colors.dark : Theme.colors.font}
                    />
                    <Text style={[styles.sortButtonText, sortBy === 'rating' && styles.sortButtonTextActive]}>
                        Highest Rated
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Theme.colors.font} />
                </View>
            ) : (
                <FlatList
                    data={rows}
                    keyExtractor={(item) => item.workout.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.workoutName}>{item.workout.worName}</Text>
                            <Text style={styles.authorName}>by {item.authorName}</Text>

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

                            {item.exerciseNames.length > 0 ? (
                                <Text style={styles.exercisePreview} numberOfLines={2}>
                                    {item.exerciseNames.join(' · ')}
                                </Text>
                            ) : (
                                <Text style={styles.exercisePreviewEmpty}>No exercises yet</Text>
                            )}

                            <View style={styles.actionsRow}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.copyBtn]}
                                    onPress={() => handleAction(item.workout, 'copy')}
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
                                    onPress={() => handleAction(item.workout, 'follow')}
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
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="compass-outline" size={56} color={Theme.colors.secondary} />
                            <Text style={styles.emptyText}>No public workouts yet — be the first to share one!</Text>
                        </View>
                    }
                />
            )}
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
    },
    sortRow: {
        flexDirection: 'row',
        gap: Theme.spacing.sm,
        padding: Theme.spacing.md,
        paddingBottom: Theme.spacing.sm,
    },
    sortButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.surface,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    sortButtonActive: {
        backgroundColor: Theme.colors.accent,
        borderColor: Theme.colors.accent,
    },
    sortButtonText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    sortButtonTextActive: {
        color: Theme.colors.dark,
    },
    list: {
        padding: Theme.spacing.md,
        paddingTop: Theme.spacing.xs,
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
    workoutName: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.semibold,
    },
    authorName: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        marginTop: Theme.spacing.sm,
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
        marginTop: Theme.spacing.sm,
        marginBottom: Theme.spacing.md,
    },
    exercisePreviewEmpty: {
        color: Theme.colors.placeholder,
        fontSize: Theme.fontSize.sm,
        fontStyle: 'italic',
        marginTop: Theme.spacing.sm,
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
