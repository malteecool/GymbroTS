import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Button } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Theme, Styles } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { DayWorkoutPicker } from '../../components/Split/DayWorkoutPicker';
import { getStordUserData } from '../../services/UserService.Service';
import { getWorkouts } from '../../services/WorkoutService.Service';
import { addReferenceWeek, SplitWeek } from '../../services/SplitService.Service';
import { Workout } from '../../interfaces/Workout.Interface';
import { User } from '../../interfaces/User.Interface';
import emitter from '../../hooks/CustomEventEmitter';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function CreateSplitScreen() {
    const [isLoading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [splitWeek, setSplitWeek] = useState<SplitWeek>({
        Monday: { workout: null, completed: false, day: 'Monday' },
        Tuesday: { workout: null, completed: false, day: 'Tuesday' },
        Wednesday: { workout: null, completed: false, day: 'Wednesday' },
        Thursday: { workout: null, completed: false, day: 'Thursday' },
        Friday: { workout: null, completed: false, day: 'Friday' },
        Saturday: { workout: null, completed: false, day: 'Saturday' },
        Sunday: { workout: null, completed: false, day: 'Sunday' }
    });
    const [selectedDay, setSelectedDay] = useState<typeof WEEK_DAYS[number] | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            if (!storedUser) {
                Alert.alert('Error', 'User not found');
                router.back();
                return;
            }

            setUser(storedUser);
            const userWorkouts = await getWorkouts(storedUser.id);
            setWorkouts(userWorkouts);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load workouts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const selectWorkout = (workout: Workout | null) => {
        if (!selectedDay) return;
        setSplitWeek(prev => ({
            ...prev,
            [selectedDay]: {
                ...prev[selectedDay],
                workout
            }
        }));
        setSelectedDay(null);
    };

    const saveSplit = async () => {
        if (!user) {
            Alert.alert('Error', 'User not found');
            return;
        }

        const hasWorkout = WEEK_DAYS.some(day => splitWeek[day].workout !== null);
        if (!hasWorkout) {
            Alert.alert('Error', 'Please assign at least one workout to a day');
            return;
        }

        try {
            setIsSaving(true);
            await addReferenceWeek(splitWeek, user.id);
            emitter.emit('splitEvent', 0);
            Alert.alert('Success', 'Split created successfully!', [
                {
                    text: 'OK',
                    onPress: () => router.back()
                }
            ]);
        } catch (error) {
            console.error('Error saving split:', error);
            Alert.alert('Error', 'Failed to save split. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <LoadingIndicator text='Loading workouts...' />;
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Create Split'
                }}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.infoContainer}>
                    <MaterialCommunityIcons
                        name="information"
                        size={24}
                        color={Theme.colors.font}
                    />
                    <Text style={styles.infoText}>
                        Assign workouts to each day. The system will remember this schedule and
                        repeat it every week until you change it.
                    </Text>
                </View>

                {WEEK_DAYS.map((day) => {
                    const dayData = splitWeek[day];
                    const hasWorkout = dayData.workout !== null;

                    return (
                        <View key={day} style={styles.dayContainer}>
                            <Card containerStyle={Styles.card}>
                                <View style={styles.dayHeader}>
                                    <View style={styles.dayTitleContainer}>
                                        <MaterialCommunityIcons
                                            name="calendar"
                                            size={20}
                                            color={Theme.colors.font}
                                        />
                                        <Text style={Styles.cardTitle}>{day}</Text>
                                    </View>
                                    {hasWorkout && (
                                        <TouchableOpacity
                                            onPress={() => setSplitWeek(prev => ({ ...prev, [day]: { ...prev[day], workout: null } }))}
                                            style={styles.removeButton}
                                        >
                                            <MaterialCommunityIcons
                                                name="close-circle"
                                                size={24}
                                                color={Theme.colors.font}
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TouchableOpacity
                                    onPress={() => setSelectedDay(day)}
                                    style={[
                                        styles.workoutButton,
                                        hasWorkout && styles.workoutButtonSelected
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    {hasWorkout ? (
                                        <View style={styles.workoutSelected}>
                                            <MaterialCommunityIcons
                                                name="weight-lifter"
                                                size={20}
                                                color={Theme.colors.green}
                                            />
                                            <Text style={styles.workoutName}>
                                                {dayData.workout!.worName}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.workoutEmpty}>
                                            <MaterialCommunityIcons
                                                name="plus-circle-outline"
                                                size={20}
                                                color={Theme.colors.font + '80'}
                                            />
                                            <Text style={styles.emptyText}>
                                                Tap to select workout
                                            </Text>
                                        </View>
                                    )}
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={20}
                                        color={Theme.colors.font + '60'}
                                    />
                                </TouchableOpacity>
                            </Card>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.buttonContainer}>
                <Button
                    title="Save Split"
                    onPress={saveSplit}
                    buttonStyle={styles.saveButton}
                    loading={isSaving}
                    disabled={isSaving}
                />
            </View>

            {selectedDay && (
                <DayWorkoutPicker
                    visible={!!selectedDay}
                    dayLabel={selectedDay}
                    workouts={workouts}
                    selectedWorkoutId={splitWeek[selectedDay]?.workout?.id ?? null}
                    onSelect={selectWorkout}
                    onClose={() => setSelectedDay(null)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    infoContainer: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.lessDark,
        padding: Theme.spacing.md,
        margin: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'flex-start',
        gap: Theme.spacing.sm,
    },
    infoText: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        lineHeight: 20,
    },
    dayContainer: {
        marginBottom: Theme.spacing.sm,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Theme.spacing.sm,
    },
    dayTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    removeButton: {
        padding: Theme.spacing.xs,
    },
    workoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Theme.spacing.md,
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 2,
        borderColor: Theme.colors.lessDark,
    },
    workoutButtonSelected: {
        borderColor: Theme.colors.green,
        backgroundColor: Theme.colors.green + '20',
    },
    workoutSelected: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        flex: 1,
    },
    workoutEmpty: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        flex: 1,
    },
    workoutName: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    emptyText: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.md,
        fontStyle: 'italic',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Theme.spacing.md,
        backgroundColor: Theme.colors.dark,
        ...Theme.shadows.medium,
    },
    saveButton: {
        height: 50,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.green,
    },
});
