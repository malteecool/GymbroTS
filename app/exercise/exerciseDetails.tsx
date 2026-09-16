import { SetCard } from "../../components/SetCard";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { ExerciseHistory } from "../../interfaces/ExerciseHistory.Interface";
import { getExerciseById, getHistory, HISTORY_PAGE_SIZE, setExerciseMuscleGroup } from "../../services/ExerciseService.Service";
import { MuscleGroup, MUSCLE_GROUP_OPTIONS } from "../../constants/MuscleGroups";
import { MuscleBadge } from "../../components/ui/MuscleBadge";
import { ActionSheet } from "../../components/ui/ActionSheet";
import { Styles, Theme } from "../../constants/Theme";
import { EmptyState } from "../../components/ui/EmptyState";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ExerciseDetails() {
    const { exerciseId, workoutId } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isEmpty, setEmpty] = useState(true);
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [data, setData] = useState<ExerciseHistory[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [groupPickerOpen, setGroupPickerOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const exerciseData = await getExerciseById(exerciseId as string);
            if (!exerciseData) {
                console.error('Exercise not found');
                return;
            }

            setExercise(exerciseData);
            const page = await getHistory(exerciseId as string, { limit: HISTORY_PAGE_SIZE });
            setData(page.items);
            setHasMore(page.hasMore);
            setEmpty(page.items.length === 0);
        } catch (error) {
            console.error('Error loading exercise details:', error);
        } finally {
            setLoading(false);
        }
    }, [exerciseId]);

    useEffect(() => {
        load();
    }, [load]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;

        try {
            setLoadingMore(true);
            const page = await getHistory(exerciseId as string, {
                limit: HISTORY_PAGE_SIZE,
                offset: data.length,
            });
            setData((previous) => [...previous, ...page.items]);
            setHasMore(page.hasMore);
        } catch (error) {
            console.error('Error loading more history:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [exerciseId, data.length, hasMore, loadingMore]);

    const changeMuscleGroup = useCallback(async (group: MuscleGroup | null) => {
        setGroupPickerOpen(false);
        if (!exercise || exercise.exeMuscleGroup === group) return;

        // Update in place rather than reloading - the history below is unaffected
        // and a reload would throw away the pages already fetched.
        const previous = exercise;
        setExercise({ ...exercise, exeMuscleGroup: group });

        try {
            await setExerciseMuscleGroup(exercise.id, group);
            emitter.emit('exerciseEvent', 0);
        } catch (error) {
            console.error('Error updating muscle group:', error);
            setExercise(previous);
            Alert.alert('Error', 'Failed to update the muscle group. Please try again.');
        }
    }, [exercise]);

    useEffect(() => {
        const listener = () => {
            load();
        };
        emitter.on('setEvent', listener);

        return () => {
            emitter.off('setEvent', listener);
        };
    }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    }, [load]);

    if (isLoading) {
        return <LoadingIndicator text='Loading exercise...' />;
    }

    if (!exercise) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Exercise not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: exercise.exeName,
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => router.push({
                                pathname: '/exercise/addSet',
                                params: { exerciseId: exerciseId as string }
                            })}
                            style={styles.headerButton}
                        >
                            <MaterialCommunityIcons
                                name="plus"
                                size={24}
                                color={Theme.colors.green}
                            />
                        </TouchableOpacity>
                    ),
                }}
            />
            <View style={styles.groupRow}>
                <MuscleBadge
                    group={exercise.exeMuscleGroup}
                    onPress={() => setGroupPickerOpen(true)}
                />
            </View>
            <View style={styles.content}>
                {isEmpty ? (
                    <EmptyState
                        icon="dumbbell"
                        title="No sets yet"
                        subtitle="Tap the + button to add your first set"
                        style={styles.emptyState}
                    />
                ) : (
                    <ScrollView
                        contentContainerStyle={Styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    >
                        {data.map((exerciseHistory: ExerciseHistory, i: number) => (
                            <View key={exerciseHistory.id || i}>
                                <SetCard
                                    editable={false}
                                    exercise={exercise}
                                    exerciseHistory={exerciseHistory}
                                />
                            </View>
                        ))}
                        {hasMore && (
                            <TouchableOpacity
                                onPress={loadMore}
                                disabled={loadingMore}
                                activeOpacity={0.7}
                                style={[styles.loadMore, loadingMore && styles.loadMoreBusy]}
                            >
                                {loadingMore ? (
                                    <ActivityIndicator size="small" color={Theme.colors.textSecondary} />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons
                                            name="chevron-down"
                                            size={20}
                                            color={Theme.colors.textSecondary}
                                        />
                                        <Text style={styles.loadMoreText}>Load more</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                )}
            </View>

            <ActionSheet
                visible={groupPickerOpen}
                title="Muscle group"
                onCancel={() => setGroupPickerOpen(false)}
                options={[
                    ...MUSCLE_GROUP_OPTIONS.map((option) => ({
                        label: option.label,
                        icon: option.icon,
                        onPress: () => changeMuscleGroup(option.value),
                    })),
                    {
                        label: 'Clear group',
                        icon: 'close-circle-outline' as const,
                        onPress: () => changeMuscleGroup(null),
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: Styles.screen,
    content: {
        flex: 1,
        width: '100%',
    },
    emptyState: {
        flex: 1,
    },
    errorText: {
        ...Theme.typography.body,
        textAlign: 'center',
        marginTop: Theme.spacing.xl,
    },
    headerButton: {
        paddingRight: Theme.spacing.md,
    },
    groupRow: {
        paddingHorizontal: Theme.spacing.md,
        paddingBottom: Theme.spacing.sm,
    },
    loadMore: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        minHeight: 48,
        marginHorizontal: Theme.spacing.sm,
        marginTop: Theme.spacing.xs,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    loadMoreBusy: {
        opacity: 0.6,
    },
    loadMoreText: {
        ...Theme.typography.body,
        color: Theme.colors.textSecondary,
        fontWeight: Theme.fontWeight.semibold,
    },
});
