import { SetCard } from "../../components/SetCard";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { ExerciseHistory } from "../../interfaces/ExerciseHistory.Interface";
import { getExerciseById, getHistory } from "../../services/ExerciseService.Service";
import { Styles, Theme } from "../../constants/Theme";
import { EmptyState } from "../../components/ui/EmptyState";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ExerciseDetails() {
    const { exerciseId, workoutId } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isEmpty, setEmpty] = useState(true);
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [data, setData] = useState<ExerciseHistory[]>([]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const exerciseData = await getExerciseById(exerciseId as string);
            if (!exerciseData) {
                console.error('Exercise not found');
                return;
            }

            setExercise(exerciseData);
            const history: ExerciseHistory[] = await getHistory(exerciseId as string);
            setData(history);
            setEmpty(history.length === 0);
        } catch (error) {
            console.error('Error loading exercise details:', error);
        } finally {
            setLoading(false);
        }
    }, [exerciseId]);

    useEffect(() => {
        load();
    }, [load]);

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
                    </ScrollView>
                )}
            </View>
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
});
