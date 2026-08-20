import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Alert } from "react-native";
import { Card, Button } from '@rneui/themed';
import {
    getReferenceWeek, markDayAsCompleted, updateSplitDayWorkout, SplitWeek,
} from '../../services/SplitService.Service';
import { getWorkouts } from '../../services/WorkoutService.Service';
import { WorkoutSharePrompt } from '../../components/Social/WorkoutSharePrompt';
import { DayWorkoutPicker } from '../../components/Split/DayWorkoutPicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme, Styles } from "../../constants/Theme";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { getStordUserData } from "../../services/UserService.Service";
import { User } from "../../interfaces/User.Interface";
import { Workout } from "../../interfaces/Workout.Interface";
import { router } from "expo-router";

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const WEEK_DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_WEEK_OFFSET = 4; // matches the 5 weeks (current + 4 future) SplitService generates

function getMondayOfCurrentWeek(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
}

function getDateForDay(weekOffset: number, dayIndex: number): Date {
    const monday = getMondayOfCurrentWeek();
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + weekOffset * 7 + dayIndex);
}

function getWeekLabel(weekOffset: number): string {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === 1) return 'Next Week';
    const monday = getDateForDay(weekOffset, 0);
    return `Week of ${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function SplitScreen() {
    const [weekData, setWeekData] = useState<SplitWeek[]>([]);
    const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
    const [isLoading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [sharePrompt, setSharePrompt] = useState<{ workoutId: string; workoutName: string } | null>(null);
    const [pickerDay, setPickerDay] = useState<typeof WEEK_DAYS[number] | null>(null);
    const [savingDay, setSavingDay] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                return;
            }

            setUser(storedUser);
            const [data, workouts] = await Promise.all([
                getReferenceWeek(storedUser.id),
                getWorkouts(storedUser.id),
            ]);

            setWeekData(data?.weeks ?? []);
            setAllWorkouts(workouts);
        } catch (error) {
            console.error('Error loading split:', error);
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

        return () => {
            emitter.off('splitEvent', listener);
        };
    }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    }, [load]);

    const handleMarkAsCompleted = useCallback(async (day: typeof WEEK_DAYS[number]) => {
        const week = weekData[weekOffset];
        if (!week) return;

        const dayData = week[day];
        if (!dayData.workout || !dayData.weekId) return;

        try {
            const newCompleted = !dayData.completed;
            const updatedWeekData = [...weekData];
            updatedWeekData[weekOffset] = { ...week, [day]: { ...dayData, completed: newCompleted } };
            setWeekData(updatedWeekData);
            await markDayAsCompleted(dayData.weekId, day, newCompleted);

            if (newCompleted && dayData.workout) {
                setSharePrompt({ workoutId: dayData.workout.id, workoutName: dayData.workout.worName });
            }
        } catch (error) {
            console.error('Error marking day as completed:', error);
            load();
        }
    }, [weekData, weekOffset, load]);

    const handleSelectWorkoutForDay = useCallback(async (workout: Workout | null) => {
        if (!user || !pickerDay) return;

        const day = pickerDay;
        try {
            setSavingDay(true);
            await updateSplitDayWorkout(user.id, day, workout);
            // The assignment is a recurring template, so it applies to every loaded week.
            setWeekData((prev) => prev.map((week) => ({ ...week, [day]: { ...week[day], workout } })));
            emitter.emit('splitEvent');
            setPickerDay(null);
        } catch (error) {
            console.error('Error updating day workout:', error);
            Alert.alert('Error', 'Failed to update workout. Please try again.');
        } finally {
            setSavingDay(false);
        }
    }, [user, pickerDay]);

    const snapToPrev = () => setWeekOffset((prev) => Math.max(0, prev - 1));
    const snapToNext = () => setWeekOffset((prev) => Math.min(MAX_WEEK_OFFSET, prev + 1));

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-plus" size={80} color={Theme.colors.font + '40'} />
            <Text style={styles.emptyTitle}>No Split Created</Text>
            <Text style={styles.emptyText}>
                Create a workout split to automatically generate your weekly training schedule.
                Assign workouts to each day and the system will remember it every week.
            </Text>
            <Button
                title="Create Split"
                onPress={() => router.push('/split/createSplit')}
                buttonStyle={styles.createButton}
                titleStyle={styles.createButtonText}
            />
        </View>
    );

    if (isLoading) {
        return <LoadingIndicator text='Loading split...' />;
    }

    if (weekData.length === 0) {
        return (
            <View style={styles.container}>
                <EmptyState />
            </View>
        );
    }

    const week = weekData[weekOffset];
    const todayKey = new Date().toDateString();
    const pickerDayData = pickerDay ? week[pickerDay] : null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={snapToPrev}
                    disabled={weekOffset === 0}
                    style={[styles.navButton, weekOffset === 0 && styles.navButtonDisabled]}
                >
                    <MaterialCommunityIcons
                        name='chevron-left'
                        size={32}
                        color={weekOffset === 0 ? Theme.colors.font + '40' : Theme.colors.font}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{getWeekLabel(weekOffset)}</Text>
                <TouchableOpacity
                    onPress={snapToNext}
                    disabled={weekOffset === MAX_WEEK_OFFSET}
                    style={[styles.navButton, weekOffset === MAX_WEEK_OFFSET && styles.navButtonDisabled]}
                >
                    <MaterialCommunityIcons
                        name='chevron-right'
                        size={32}
                        color={weekOffset === MAX_WEEK_OFFSET ? Theme.colors.font + '40' : Theme.colors.font}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.daysList}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {WEEK_DAYS.map((day, dayIndex) => {
                    const dayData = week[day];
                    const hasWorkout = dayData.workout !== null;
                    const date = getDateForDay(weekOffset, dayIndex);
                    const isToday = date.toDateString() === todayKey;

                    return (
                        <Card
                            key={day}
                            containerStyle={[
                                Styles.card,
                                dayData.completed && styles.completedCard,
                                !hasWorkout && styles.emptyDayCard,
                                isToday && styles.todayCard,
                            ]}
                        >
                            <View style={styles.dayContent}>
                                <TouchableOpacity
                                    style={styles.dayInfo}
                                    onPress={() => {
                                        if (hasWorkout) {
                                            router.push({
                                                pathname: '/workout/workoutDetails',
                                                params: { workoutId: dayData.workout!.id }
                                            });
                                        }
                                    }}
                                    activeOpacity={hasWorkout ? 0.7 : 1}
                                >
                                    <View style={styles.dayHeader}>
                                        <Text style={styles.dayName}>{WEEK_DAYS_SHORT[dayIndex]}</Text>
                                        <Text style={styles.dayDate}>
                                            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </Text>
                                        {isToday && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayBadgeText}>TODAY</Text>
                                            </View>
                                        )}
                                    </View>
                                    {hasWorkout ? (
                                        <View style={styles.workoutInfo}>
                                            <MaterialCommunityIcons name="weight-lifter" size={18} color={Theme.colors.font} />
                                            <Text style={styles.workoutName}>{dayData.workout!.worName}</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.restDayText}>Rest day</Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.dayActions}>
                                    <TouchableOpacity
                                        onPress={() => setPickerDay(day)}
                                        style={styles.editButton}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <MaterialCommunityIcons name="pencil-outline" size={20} color={Theme.colors.font + '80'} />
                                    </TouchableOpacity>
                                    {hasWorkout && (
                                        <TouchableOpacity
                                            onPress={() => handleMarkAsCompleted(day)}
                                            style={styles.checkButton}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <MaterialCommunityIcons
                                                name={dayData.completed ? "check-circle" : "circle-outline"}
                                                size={32}
                                                color={dayData.completed ? Theme.colors.green : Theme.colors.font + '60'}
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </Card>
                    );
                })}
            </ScrollView>

            {pickerDay && (
                <DayWorkoutPicker
                    visible={!!pickerDay}
                    dayLabel={pickerDay}
                    workouts={allWorkouts}
                    selectedWorkoutId={pickerDayData?.workout?.id ?? null}
                    onSelect={handleSelectWorkoutForDay}
                    onClose={() => !savingDay && setPickerDay(null)}
                />
            )}

            {sharePrompt && (
                <WorkoutSharePrompt
                    visible={!!sharePrompt}
                    workoutId={sharePrompt.workoutId}
                    workoutName={sharePrompt.workoutName}
                    onClose={() => setSharePrompt(null)}
                    onShared={() => setSharePrompt(null)}
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
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Theme.colors.lessDark,
        paddingHorizontal: Theme.spacing.md,
        ...Theme.shadows.small,
    },
    navButton: {
        padding: Theme.spacing.sm,
    },
    navButtonDisabled: {
        opacity: 0.3,
    },
    headerTitle: {
        ...Styles.headerTitle,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.bold,
    },
    daysList: {
        padding: Theme.spacing.xs,
        paddingBottom: Theme.spacing.xl,
    },
    dayContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayInfo: {
        flex: 1,
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        marginBottom: Theme.spacing.xs,
    },
    dayName: {
        ...Styles.cardTitle,
        marginLeft: 0,
        marginBottom: 0,
        fontSize: Theme.fontSize.lg,
    },
    dayDate: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.sm,
    },
    todayBadge: {
        backgroundColor: Theme.colors.accent,
        borderRadius: Theme.borderRadius.round,
        paddingHorizontal: Theme.spacing.sm,
        paddingVertical: 2,
        marginLeft: Theme.spacing.xs,
    },
    todayBadgeText: {
        color: Theme.colors.dark,
        fontSize: 10,
        fontWeight: Theme.fontWeight.bold,
    },
    workoutInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        marginLeft: Theme.spacing.sm,
    },
    workoutName: {
        ...Styles.fontColor,
        fontSize: Theme.fontSize.md,
    },
    restDayText: {
        ...Styles.fontColor,
        fontSize: Theme.fontSize.sm,
        fontStyle: 'italic',
        marginLeft: Theme.spacing.sm,
        opacity: 0.6,
    },
    dayActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    editButton: {
        padding: Theme.spacing.xs,
    },
    checkButton: {
        padding: Theme.spacing.xs,
    },
    completedCard: {
        backgroundColor: Theme.colors.green + '30',
        borderColor: Theme.colors.green,
        borderWidth: 2,
    },
    emptyDayCard: {
        opacity: 0.6,
    },
    todayCard: {
        borderColor: Theme.colors.accent,
        borderWidth: 2,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Theme.spacing.xl,
    },
    emptyTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xl,
        fontWeight: Theme.fontWeight.bold,
        marginTop: Theme.spacing.lg,
        marginBottom: Theme.spacing.md,
    },
    emptyText: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
        marginBottom: Theme.spacing.xl,
        lineHeight: 22,
    },
    createButton: {
        backgroundColor: Theme.colors.green,
        paddingHorizontal: Theme.spacing.xl,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
    },
    createButtonText: {
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
});
