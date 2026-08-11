import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Workout } from '../../interfaces/Workout.Interface';
import { getPublicWorkouts, getWorkoutExercises, copyWorkout, linkWorkout } from '../../services/WorkoutService.Service';
import { getStordUserData } from '../../services/UserService.Service';

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

    const load = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const [user, workouts] = await Promise.all([
                getStordUserData(),
                getPublicWorkouts(userId),
            ]);
            if (user) setCurrentUserId(user.id);

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

    const handleCopy = async (workout: Workout) => {
        if (!currentUserId) return;
        try {
            setRowLoading(workout.id, 'copy');
            const newWorkoutId = await copyWorkout(workout.id, currentUserId);
            router.push({ pathname: '/workout/workoutDetails', params: { workoutId: newWorkoutId } });
        } catch {
            Alert.alert('Error', 'Could not copy this workout. Please try again.');
        } finally {
            setRowLoading(workout.id, null);
        }
    };

    const handleFollow = async (workout: Workout) => {
        if (!currentUserId) return;
        try {
            setRowLoading(workout.id, 'follow');
            const newWorkoutId = await linkWorkout(workout.id, currentUserId);
            router.push({ pathname: '/workout/workoutDetails', params: { workoutId: newWorkoutId } });
        } catch {
            Alert.alert('Error', 'Could not follow this workout. Please try again.');
        } finally {
            setRowLoading(workout.id, null);
        }
    };

    if (loading) {
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
                            <Text style={styles.workoutName}>{item.workout.worName}</Text>
                            {(item.workout.copyCount ?? 0) > 0 && (
                                <View style={styles.copyBadge}>
                                    <MaterialCommunityIcons name="content-copy" size={12} color={Theme.colors.secondary} />
                                    <Text style={styles.copyBadgeText}>{item.workout.copyCount}</Text>
                                </View>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
    },
    list: {
        padding: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
        flexGrow: 1,
    },
    card: {
        backgroundColor: Theme.colors.lessDark,
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
        borderColor: Theme.colors.border,
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
