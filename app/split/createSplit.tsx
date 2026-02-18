import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { Card, Button } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Theme, Styles } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { getStordUserData } from '../../services/UserService.Service';
import { getWorkouts } from '../../services/WorkoutService.Service';
import { addReferenceWeek, SplitWeek } from '../../services/SplitService.Service';
import { Workout } from '../../interfaces/Workout.Interface';
import { User } from '../../interfaces/User.Interface';
import emitter from '../../hooks/CustomEventEmitter';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

// Special "Rest day" workout identifier
const REST_DAY_ID = 'REST_DAY';

const REST_DAY_WORKOUT: Workout = {
    id: '-1',
    wor_name: 'Rest Day',
    wor_user_id: '',
    wor_completed_count: 0,
    wor_estimate_time: 0,
    wor_last_done: ''
};

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
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredWorkouts, setFilteredWorkouts] = useState<Workout[]>([]);

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
            setFilteredWorkouts(userWorkouts);
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

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredWorkouts(workouts);
        } else {
            const filtered = workouts.filter(workout =>
                workout.wor_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredWorkouts(filtered);
        }
    }, [searchQuery, workouts]);

    const openWorkoutSelector = (day: typeof WEEK_DAYS[number]) => {
        setSelectedDay(day);
        setSearchQuery('');
    };

    const closeWorkoutSelector = () => {
        setSelectedDay(null);
        setSearchQuery('');
    };

    const selectWorkout = (day: typeof WEEK_DAYS[number], workout: Workout | null) => {
        setSplitWeek(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                workout: workout
            }
        }));
        closeWorkoutSelector();
    };

    const saveSplit = async () => {
        if (!user) {
            Alert.alert('Error', 'User not found');
            return;
        }

        // Check if at least one workout is assigned
        const hasWorkout = WEEK_DAYS.some(day => splitWeek[day].workout !== null);
        if (!hasWorkout) {
            Alert.alert('Error', 'Please assign at least one workout to a day');
            return;
        }

        console.log('splitWeek', splitWeek);

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

    const getWorkoutDisplayText = (day: typeof WEEK_DAYS[number]) => {
        const workout = splitWeek[day].workout;
        if (!workout) {
            return 'No workout assigned';
        }
        return workout.wor_name;
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
                        Assign workouts to each day. The system will automatically generate
                        the following weeks by rotating through your assigned workouts.
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
                                            onPress={() => selectWorkout(day, null)}
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
                                    onPress={() => openWorkoutSelector(day)}
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
                                                {dayData.workout!.wor_name}
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

            {/* Workout Selection Modal */}
            <Modal
                visible={selectedDay !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={closeWorkoutSelector}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Select Workout for {selectedDay}
                            </Text>
                            <TouchableOpacity
                                onPress={closeWorkoutSelector}
                                style={styles.modalCloseButton}
                            >
                                <MaterialCommunityIcons
                                    name="close"
                                    size={24}
                                    color={Theme.colors.font}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <MaterialCommunityIcons
                                name="magnify"
                                size={20}
                                color={Theme.colors.font + '80'}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search workouts..."
                                placeholderTextColor={Theme.colors.font + '60'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setSearchQuery('')}
                                    style={styles.searchClearButton}
                                >
                                    <MaterialCommunityIcons
                                        name="close-circle"
                                        size={20}
                                        color={Theme.colors.font + '80'}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView
                            style={styles.modalContent}
                            contentContainerStyle={styles.modalContentContainer}
                        >
                            {/* Rest Day Option */}
                            <TouchableOpacity
                                onPress={() => selectWorkout(selectedDay!, REST_DAY_WORKOUT)}
                                style={[
                                    styles.workoutOption,
                                    splitWeek[selectedDay!]?.workout === REST_DAY_WORKOUT && styles.workoutOptionSelected
                                ]}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons
                                    name="sleep"
                                    size={24}
                                    color={Theme.colors.font + '80'}
                                />
                                <Text style={styles.workoutOptionText}>Rest Day</Text>
                                {splitWeek[selectedDay!]?.workout === REST_DAY_WORKOUT && (
                                    <MaterialCommunityIcons
                                        name="check-circle"
                                        size={24}
                                        color={Theme.colors.green}
                                    />
                                )}
                            </TouchableOpacity>

                            {/* Workout List */}
                            {filteredWorkouts.length === 0 ? (
                                <View style={styles.emptyWorkoutsContainer}>
                                    <MaterialCommunityIcons
                                        name="weight-lifter"
                                        size={48}
                                        color={Theme.colors.font + '40'}
                                    />
                                    <Text style={styles.emptyWorkoutsText}>
                                        {searchQuery ? 'No workouts found' : 'No workouts available'}
                                    </Text>
                                    <Text style={styles.emptyWorkoutsSubtext}>
                                        {searchQuery
                                            ? 'Try a different search term'
                                            : 'Create workouts first to add them to your split'}
                                    </Text>
                                </View>
                            ) : (
                                filteredWorkouts.map((workout) => {
                                    const isSelected = splitWeek[selectedDay!]?.workout?.id === workout.id;
                                    return (
                                        <TouchableOpacity
                                            key={workout.id}
                                            onPress={() => selectWorkout(selectedDay!, workout)}
                                            style={[
                                                styles.workoutOption,
                                                isSelected && styles.workoutOptionSelected
                                            ]}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name="weight-lifter"
                                                size={24}
                                                color={isSelected ? Theme.colors.green : Theme.colors.font}
                                            />
                                            <Text
                                                style={[
                                                    styles.workoutOptionText,
                                                    isSelected && styles.workoutOptionTextSelected
                                                ]}
                                            >
                                                {workout.wor_name}
                                            </Text>
                                            {isSelected && (
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={24}
                                                    color={Theme.colors.green}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        flex:1,
        backgroundColor: Theme.colors.dark,
        borderTopLeftRadius: Theme.borderRadius.lg,
        borderTopRightRadius: Theme.borderRadius.lg,
        maxHeight: '80%',
        ...Theme.shadows.large,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.lessDark,
    },
    modalTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.bold,
        flex: 1,
    },
    modalCloseButton: {
        padding: Theme.spacing.xs,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        margin: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        gap: Theme.spacing.sm,
    },
    searchIcon: {
        marginRight: Theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        paddingVertical: Theme.spacing.sm,
    },
    searchClearButton: {
        padding: Theme.spacing.xs,
    },
    modalContent: {
        flex: 1,
    },
    modalContentContainer: {
        padding: Theme.spacing.sm,
        paddingBottom: Theme.spacing.xl,
    },
    workoutOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Theme.spacing.md,
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        marginBottom: Theme.spacing.sm,
        gap: Theme.spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    workoutOptionSelected: {
        backgroundColor: Theme.colors.green + '20',
        borderColor: Theme.colors.green,
    },
    workoutOptionText: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
    },
    workoutOptionTextSelected: {
        color: Theme.colors.font,
        fontWeight: Theme.fontWeight.semibold,
    },
    emptyWorkoutsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl * 2,
    },
    emptyWorkoutsText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.semibold,
        marginTop: Theme.spacing.md,
    },
    emptyWorkoutsSubtext: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.sm,
        marginTop: Theme.spacing.xs,
        textAlign: 'center',
    },
});