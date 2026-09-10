import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Button } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Divider } from '@rneui/base';
import emitter from '../../hooks/CustomEventEmitter';
import { getWorkouts, getWorkoutExercises, getFormattedTime } from '../../services/WorkoutService.Service';
import { getTodaysSplitWorkout } from '../../services/SplitService.Service';
import { getWorkoutStreak } from '../../services/StatsService.Service';
import { Theme, Styles } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { EmptyState } from '../../components/ui/EmptyState';
import { MetaRow } from '../../components/ui/MetaRow';
import { SearchBar } from '../../components/ui/SearchBar';
import { getStordUserData } from '../../services/UserService.Service';
import { User } from '../../interfaces/User.Interface';
import { Workout } from '../../interfaces/Workout.Interface';
import { WorkoutExercise } from '../../interfaces/WorkoutExercise.Interface';
import { WorkoutListItem } from '../../components/Workout/WorkoutListItem';
import { router, useNavigation } from 'expo-router';

export default function WorkoutScreen() {
    const navigation = useNavigation();
    const [isLoading, setLoading] = useState<boolean>(true);
    const [user, setUser] = useState<User | null>(null);
    const [dayName, setDayName] = useState<string>('');
    const [hasSplit, setHasSplit] = useState<boolean>(false);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
    const [pickerVisible, setPickerVisible] = useState<boolean>(false);
    const [pickerSearch, setPickerSearch] = useState<string>('');
    const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
    const [exercisesLoading, setExercisesLoading] = useState<boolean>(false);
    const [streak, setStreak] = useState<number>(0);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        onPress={() => router.push('/workout/allWorkouts')}
                        style={styles.headerButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name="format-list-bulleted"
                            size={22}
                            color={Theme.colors.textPrimary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/workout/addWorkout')}
                        style={styles.headerButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name="plus"
                            size={24}
                            color={Theme.colors.green}
                        />
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                return;
            }

            setUser(storedUser);
            const [todays, workouts, workoutStreak] = await Promise.all([
                getTodaysSplitWorkout(storedUser.id),
                getWorkouts(storedUser.id),
                getWorkoutStreak(storedUser.id),
            ]);

            setDayName(todays.dayName);
            setHasSplit(todays.hasSplit);
            setSelectedWorkout(todays.workout);
            setAllWorkouts(workouts);
            setStreak(workoutStreak);
        } catch (error) {
            console.error('Error loading today\'s workout:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const listener = () => {
            load();
        };
        emitter.on('splitEvent', listener);
        emitter.on('workoutEvent', listener);

        return () => {
            emitter.off('splitEvent', listener);
            emitter.off('workoutEvent', listener);
        };
    }, [load]);

    useEffect(() => {
        if (!selectedWorkout) {
            setExercises([]);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setExercisesLoading(true);
                const list = await getWorkoutExercises(selectedWorkout.id);
                if (!cancelled) setExercises(list);
            } catch (error) {
                console.error('Error loading workout exercises:', error);
                if (!cancelled) setExercises([]);
            } finally {
                if (!cancelled) setExercisesLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedWorkout]);

    const openPicker = useCallback(() => {
        setPickerSearch('');
        setPickerVisible(true);
    }, []);

    const selectWorkout = useCallback((workout: Workout) => {
        setSelectedWorkout(workout);
        setPickerVisible(false);
    }, []);

    const startWorkout = useCallback(() => {
        if (!selectedWorkout) return;
        router.push({
            pathname: '/workout/workoutDetails',
            params: { workoutId: selectedWorkout.id, autostart: 'true' },
        });
    }, [selectedWorkout]);

    const filteredWorkouts = pickerSearch
        ? allWorkouts.filter((w) => (w.worName || '').toUpperCase().includes(pickerSearch.toUpperCase()))
        : allWorkouts;

    if (isLoading) {
        return <LoadingIndicator text='Loading your workout...' />;
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.dayLabelRow}>
                    <View style={styles.dayLabelLeft}>
                        <MaterialCommunityIcons
                            name="calendar-today"
                            size={16}
                            color={Theme.colors.textSecondary}
                        />
                        <Text style={styles.dayLabel}>{dayName ? `Today · ${dayName}` : 'Today'}</Text>
                    </View>
                    {streak > 0 && (
                        <View style={styles.streakBadge}>
                            <MaterialCommunityIcons name="fire" size={16} color={Theme.colors.accent} />
                            <Text style={styles.streakText}>{streak}</Text>
                        </View>
                    )}
                </View>

                {selectedWorkout ? (
                    <>
                        <View style={styles.heroCard}>
                            <View style={styles.heroHeaderRow}>
                                <MaterialCommunityIcons
                                    name="weight-lifter"
                                    size={30}
                                    color={Theme.colors.accent}
                                />
                                <Text style={styles.heroTitle}>{selectedWorkout.worName}</Text>
                            </View>
                            <MetaRow
                                align="center"
                                items={[
                                    {
                                        icon: 'clock-time-four-outline',
                                        label: getFormattedTime(selectedWorkout.worEstimateTime),
                                    },
                                    {
                                        icon: 'calendar-range',
                                        label: selectedWorkout.worLastDone
                                            ? new Date(selectedWorkout.worLastDone).toDateString()
                                            : 'never',
                                    },
                                    { icon: 'repeat', label: `${selectedWorkout.worCompletedCount}x` },
                                ]}
                            />

                            <View style={styles.exerciseListWrap}>
                                <Divider width={StyleSheet.hairlineWidth} color={Theme.colors.divider} style={styles.exerciseDivider} />
                                {exercisesLoading ? (
                                    <Text style={styles.exerciseEmptyText}>Loading exercises...</Text>
                                ) : exercises.length === 0 ? (
                                    <Text style={styles.exerciseEmptyText}>No exercises added yet</Text>
                                ) : (
                                    <>
                                        <View style={styles.exerciseListHeader}>
                                            <Text style={styles.exerciseListTitle}>Exercises</Text>
                                            <View style={styles.exerciseCountPill}>
                                                <Text style={styles.exerciseCountText}>{exercises.length}</Text>
                                            </View>
                                        </View>
                                        {exercises.map((exercise, index) => (
                                            <View
                                                key={exercise.woeId}
                                                style={[
                                                    styles.exerciseRow,
                                                    index === exercises.length - 1 && styles.exerciseRowLast,
                                                ]}
                                            >
                                                <View style={styles.exerciseIndexBadge}>
                                                    <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                                                </View>
                                                <Text style={styles.exerciseRowText} numberOfLines={1}>
                                                    {exercise.exeName}
                                                </Text>
                                                {exercise.exeMaxWeight > 0 && (
                                                    <View style={styles.exerciseWeightPill}>
                                                        <MaterialCommunityIcons
                                                            name="weight-kilogram"
                                                            size={12}
                                                            color={Theme.colors.textSecondary}
                                                        />
                                                        <Text style={styles.exerciseWeightText}>
                                                            {exercise.exeMaxWeight}kg
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.changeRow} onPress={openPicker}>
                            <MaterialCommunityIcons name="swap-horizontal" size={18} color={Theme.colors.textPrimary} />
                            <Text style={styles.changeText}>Change workout</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.heroCard}>
                            <MaterialCommunityIcons
                                name={hasSplit ? 'weather-night' : 'calendar-remove'}
                                size={40}
                                color={Theme.colors.textMuted}
                            />
                            <Text style={styles.heroTitle}>{hasSplit ? 'Rest day' : 'No split set up'}</Text>
                            <Text style={styles.heroSubtitle}>
                                {hasSplit
                                    ? `Nothing scheduled for ${dayName}. Enjoy the recovery, or start something anyway.`
                                    : 'Set up a split and your workout will be ready here automatically.'}
                            </Text>
                        </View>

                        {!hasSplit && (
                            <Button
                                title="Create a split"
                                onPress={() => router.push('/split/createSplit')}
                                buttonStyle={styles.secondaryButton}
                                titleStyle={styles.secondaryButtonText}
                            />
                        )}

                        <TouchableOpacity style={styles.changeRow} onPress={openPicker}>
                            <MaterialCommunityIcons name="swap-horizontal" size={18} color={Theme.colors.textPrimary} />
                            <Text style={styles.changeText}>
                                {hasSplit ? 'Pick a workout anyway' : 'Pick a workout to start'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {selectedWorkout && (
                <View style={styles.startButtonWrap}>
                    <Button
                        title="Start"
                        onPress={startWorkout}
                        buttonStyle={styles.startButton}
                        titleStyle={styles.startButtonText}
                        icon={{ name: 'play', type: 'material-community', color: Theme.colors.dark, size: 20 }}
                    />
                </View>
            )}

            <Modal
                visible={pickerVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                statusBarTranslucent
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Change workout</Text>
                        <TouchableOpacity
                            onPress={() => setPickerVisible(false)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <MaterialCommunityIcons name="close" size={24} color={Theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <SearchBar
                        value={pickerSearch}
                        onChangeText={setPickerSearch}
                        placeholder='Search workouts...'
                    />
                    <ScrollView contentContainerStyle={styles.pickerListContent}>
                        {filteredWorkouts.length === 0 ? (
                            <EmptyState
                                icon="weight-lifter"
                                size="compact"
                                title={pickerSearch ? 'No workouts found' : 'No workouts yet'}
                            />
                        ) : (
                            filteredWorkouts.map((item) => (
                                <WorkoutListItem
                                    key={item.id}
                                    workout={item}
                                    onPress={() => selectWorkout(item)}
                                />
                            ))
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: Styles.screen,
    scrollContent: {
        padding: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl * 3,
    },
    dayLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Theme.spacing.md,
    },
    dayLabelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        backgroundColor: Theme.colors.accentFaint,
        paddingHorizontal: Theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: Theme.borderRadius.round,
    },
    streakText: {
        color: Theme.colors.accent,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.bold,
    },
    dayLabel: {
        color: Theme.colors.textSecondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    heroCard: {
        borderRadius: Theme.borderRadius.lg,
        marginBottom: Theme.spacing.md,
        paddingVertical: Theme.spacing.xl,
        paddingHorizontal: Theme.spacing.md,
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        ...Theme.shadows.medium,
    },
    heroHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.sm,
        marginBottom: Theme.spacing.sm,
    },
    heroTitle: {
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.xl,
        fontWeight: Theme.fontWeight.bold,
        textAlign: 'center',
        flexShrink: 1,
    },
    heroSubtitle: {
        color: Theme.colors.textSecondary,
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
        marginTop: Theme.spacing.sm,
        lineHeight: Theme.lineHeight.md,
    },
    exerciseListWrap: {
        alignSelf: 'stretch',
        marginTop: Theme.spacing.lg,
    },
    exerciseDivider: {
        marginBottom: Theme.spacing.md,
    },
    exerciseListHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        marginBottom: Theme.spacing.xs,
    },
    exerciseListTitle: {
        color: Theme.colors.textSecondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    exerciseCountPill: {
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: Theme.borderRadius.round,
        backgroundColor: Theme.colors.neutralSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseCountText: {
        color: Theme.colors.textSecondary,
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.bold,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        paddingVertical: Theme.spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.divider,
    },
    exerciseRowLast: {
        borderBottomWidth: 0,
    },
    exerciseIndexBadge: {
        width: 22,
        height: 22,
        borderRadius: Theme.borderRadius.round,
        backgroundColor: Theme.colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseIndexText: {
        color: Theme.colors.accent,
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.bold,
    },
    exerciseRowText: {
        ...Theme.typography.body,
        flex: 1,
    },
    exerciseWeightPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    exerciseWeightText: {
        color: Theme.colors.textSecondary,
        fontSize: Theme.fontSize.xs,
    },
    exerciseEmptyText: {
        color: Theme.colors.textMuted,
        fontSize: Theme.fontSize.sm,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    changeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.md,
    },
    changeText: {
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    secondaryButton: {
        backgroundColor: Theme.colors.green,
        borderRadius: Theme.borderRadius.md,
        paddingVertical: Theme.spacing.md,
    },
    secondaryButtonText: {
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    startButtonWrap: {
        position: 'absolute',
        left: Theme.spacing.md,
        right: Theme.spacing.md,
        bottom: Theme.spacing.lg,
    },
    startButton: {
        backgroundColor: Theme.colors.accent,
        borderRadius: Theme.borderRadius.xl,
        paddingVertical: Theme.spacing.md,
        ...Theme.shadows.large,
    },
    startButtonText: {
        color: Theme.colors.textOnAccent,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.bold,
        marginLeft: Theme.spacing.xs,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        paddingRight: Theme.spacing.md,
    },
    headerButton: {
        padding: Theme.spacing.xs,
    },
    modalContainer: Styles.screen,
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.md,
        paddingTop: Theme.spacing.lg,
        paddingBottom: Theme.spacing.md,
    },
    modalTitle: Theme.typography.screenTitle,
    pickerListContent: {
        paddingHorizontal: Theme.spacing.xs,
        paddingBottom: Theme.spacing.xl,
    },
});
