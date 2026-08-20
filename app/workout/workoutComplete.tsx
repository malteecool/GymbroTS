import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { WorkoutSharePrompt } from '../../components/Social/WorkoutSharePrompt';
import { getWorkoutById, getWorkoutExercises, getFormattedTime } from '../../services/WorkoutService.Service';
import { getCompletedExerciseIdsForDate } from '../../services/ExerciseService.Service';
import { getWorkoutStreak } from '../../services/StatsService.Service';
import { getStordUserData } from '../../services/UserService.Service';
import { Workout } from '../../interfaces/Workout.Interface';
import { WorkoutExercise } from '../../interfaces/WorkoutExercise.Interface';

export default function WorkoutComplete() {
    const { workoutId, time } = useLocalSearchParams();
    const [isLoading, setLoading] = useState<boolean>(true);
    const [workout, setWorkout] = useState<Workout | null>(null);
    const [exerciseCount, setExerciseCount] = useState<number>(0);
    const [completedCount, setCompletedCount] = useState<number>(0);
    const [skippedExercises, setSkippedExercises] = useState<WorkoutExercise[]>([]);
    const [streak, setStreak] = useState<number>(0);
    const [sharePromptVisible, setSharePromptVisible] = useState<boolean>(false);
    const [shared, setShared] = useState<boolean>(false);

    const elapsedSeconds = Number(time) || 0;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            const [loadedWorkout, exercises, workoutStreak] = await Promise.all([
                getWorkoutById(workoutId as string),
                getWorkoutExercises(workoutId as string),
                storedUser ? getWorkoutStreak(storedUser.id) : Promise.resolve(0),
            ]);

            setWorkout(loadedWorkout);
            setExerciseCount(exercises.length);
            setStreak(workoutStreak);

            const completedIds = await getCompletedExerciseIdsForDate(exercises.map((e) => e.id), new Date());
            setCompletedCount(completedIds.length);
            setSkippedExercises(exercises.filter((e) => !completedIds.includes(e.id)));
        } catch (error) {
            console.error('Error loading workout summary:', error);
        } finally {
            setLoading(false);
        }
    }, [workoutId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleDone = () => {
        router.dismissTo('/');
    };

    const handleShared = () => {
        setSharePromptVisible(false);
        setShared(true);
    };

    if (isLoading) {
        return <LoadingIndicator text='Loading summary...' />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.celebrationIconWrap}>
                    <MaterialCommunityIcons name="check-circle" size={72} color={Theme.colors.green} />
                </View>
                <Text style={styles.title}>Workout Complete!</Text>
                <Text style={styles.workoutName}>{workout?.worName}</Text>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="clock-time-four-outline" size={22} color={Theme.colors.accent} />
                        <Text style={styles.statValue}>{getFormattedTime(elapsedSeconds)}</Text>
                        <Text style={styles.statLabel}>Duration</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="dumbbell" size={22} color={Theme.colors.accent} />
                        <Text style={styles.statValue}>{completedCount}/{exerciseCount}</Text>
                        <Text style={styles.statLabel}>Exercises</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="fire" size={22} color={Theme.colors.accent} />
                        <Text style={styles.statValue}>{streak}</Text>
                        <Text style={styles.statLabel}>Day streak</Text>
                    </View>
                </View>

                {skippedExercises.length > 0 && (
                    <View style={styles.skippedWrap}>
                        <View style={styles.skippedHeader}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={Theme.colors.font + '80'} />
                            <Text style={styles.skippedHeaderText}>Skipped</Text>
                        </View>
                        <Text style={styles.skippedNames}>
                            {skippedExercises.map((e) => e.exeName).join(', ')}
                        </Text>
                    </View>
                )}

                {shared ? (
                    <View style={styles.sharedBadge}>
                        <MaterialCommunityIcons name="check" size={18} color={Theme.colors.green} />
                        <Text style={styles.sharedBadgeText}>Shared to your feed</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={() => setSharePromptVisible(true)}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="share-variant" size={20} color={Theme.colors.dark} />
                        <Text style={styles.shareButtonText}>Share to feed</Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
                <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>

            {workout && (
                <WorkoutSharePrompt
                    visible={sharePromptVisible}
                    workoutId={workout.id}
                    workoutName={workout.worName}
                    onClose={() => setSharePromptVisible(false)}
                    onShared={handleShared}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
        justifyContent: 'space-between',
        padding: Theme.spacing.lg,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    celebrationIconWrap: {
        marginBottom: Theme.spacing.md,
    },
    title: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xxl,
        fontWeight: Theme.fontWeight.bold,
        textAlign: 'center',
    },
    workoutName: {
        color: Theme.colors.font + '99',
        fontSize: Theme.fontSize.lg,
        marginTop: Theme.spacing.xs,
        marginBottom: Theme.spacing.xl,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: Theme.spacing.md,
        marginBottom: Theme.spacing.xl,
        width: '100%',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.lg,
        paddingVertical: Theme.spacing.lg,
        gap: Theme.spacing.xs,
        ...Theme.shadows.small,
    },
    statValue: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.bold,
    },
    statLabel: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.xs,
    },
    skippedWrap: {
        alignItems: 'center',
        marginBottom: Theme.spacing.xl,
        paddingHorizontal: Theme.spacing.lg,
    },
    skippedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    skippedHeaderText: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    skippedNames: {
        color: Theme.colors.font + '99',
        fontSize: Theme.fontSize.sm,
        textAlign: 'center',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.accent,
        borderRadius: Theme.borderRadius.xl,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.xl,
        ...Theme.shadows.medium,
    },
    shareButtonText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
    sharedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.xl,
    },
    sharedBadgeText: {
        color: Theme.colors.green,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    doneButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.xl,
        backgroundColor: Theme.colors.lessDark,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    doneButtonText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
});
