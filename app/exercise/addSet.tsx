import { SetCard, SetsRef } from "../../components/SetCard";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { addExerciseHistory, getExerciseById } from "../../services/ExerciseService.Service";
import { Theme } from "../../constants/Theme";
import { Button } from "@rneui/themed";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View, Alert } from "react-native";

export default function AddSetScreen() {
    const { exerciseId } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(false);
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setsRef = useRef<SetsRef>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const exerciseData = await getExerciseById(exerciseId as string);
            if (!exerciseData) {
                Alert.alert('Error', 'Could not load the exercise');
                return;
            }
            setExercise(exerciseData);
        } catch (error) {
            console.error('Error loading exercise:', error);
            Alert.alert('Error', 'Failed to load exercise. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [exerciseId]);

    useEffect(() => {
        load();
    }, [load]);

    const onAddHistory = useCallback(async () => {
        if (!exercise || !setsRef.current) {
            return;
        }

        try {
            setIsSubmitting(true);
            const sets = setsRef.current.getSets();
            const comment = setsRef.current.getComment();

            if (sets.length === 0 || sets.every(s => s.setWeight === 0 && s.setReps === 0)) {
                Alert.alert('Error', 'Please add at least one set with weight and reps');
                return;
            }

            const success = await addExerciseHistory(exercise, sets, comment);
            if (success) {
                emitter.emit('setEvent', 0);
                emitter.emit('workoutEvent', 0);
                router.back();
            } else {
                Alert.alert('Error', 'Failed to save exercise history. Please try again.');
            }
        } catch (error) {
            console.error('Error adding exercise history:', error);
            Alert.alert('Error', 'Failed to save exercise history. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [exercise]);

    if (isLoading) {
        return <LoadingIndicator text='Loading exercise...' />;
    }

    if (!exercise) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Could not load the exercise</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: exercise.exeName,
                }}
            />
            <View style={styles.content}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <SetCard editable={true} exercise={exercise} ref={setsRef} />
                </ScrollView>
                <View style={styles.buttonContainer}>
                    <Button
                        title='Complete'
                        onPress={onAddHistory}
                        buttonStyle={styles.button}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    />
                </View>
            </View>
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
    },
    scrollContent: {
        paddingBottom: 120,
    },
    buttonContainer: {
        position: 'absolute',
        width: '100%',
        bottom: 0,
        padding: Theme.spacing.md,
        backgroundColor: Theme.colors.dark,
        ...Theme.shadows.medium,
    },
    button: {
        height: 50,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.green,
    },
    errorText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        textAlign: 'center',
        marginTop: Theme.spacing.xl,
    },
});