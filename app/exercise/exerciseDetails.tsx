import { SetCard } from "../../components/SetCard";
import { AddButton } from "../../components/ui/AddButton";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { ExerciseHistory } from "../../interfaces/ExerciseHistory.Interface";
import { getExerciseById, getHistory } from "../../services/ExerciseService.Service";
import { Theme } from "../../constants/Theme";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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
                    title: exercise.exe_name,
                }}
            />
            <View style={styles.content}>
                {isEmpty ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="dumbbell"
                            size={64}
                            color={Theme.colors.font + '40'}
                        />
                        <Text style={styles.emptyText}>No sets yet</Text>
                        <Text style={styles.emptySubtext}>
                            Tap the + button to add your first set
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
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
            <AddButton
                navigation={{
                    pathname: '/exercise/addSet',
                    params: { exerciseId: exerciseId as string }
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    content: {
        flex: 1,
        width: '100%',
    },
    scrollView: {
        width: '100%',
    },
    scrollContent: {
        paddingBottom: Theme.spacing.xl,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl * 2,
    },
    emptyText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.semibold,
        marginTop: Theme.spacing.md,
    },
    emptySubtext: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.md,
        marginTop: Theme.spacing.xs,
        textAlign: 'center',
    },
    errorText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        textAlign: 'center',
        marginTop: Theme.spacing.xl,
    },
});