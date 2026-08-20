import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { Workout } from "../../interfaces/Workout.Interface";
import {
    getFormattedTime, getWorkoutById, getWorkoutExercises, updateWorkout, updateWorkoutExerciseOrdinal,
    toggleWorkoutVisibility, syncLinkedWorkout, unlinkWorkout,
} from "../../services/WorkoutService.Service";
import {
    removeWorkoutExercise as removeWorkoutExerciseService, getCompletedExerciseIdsForDate,
} from '../../services/ExerciseService.Service';
import { getUserDataById, getStordUserData } from '../../services/UserService.Service';
import { markTodayCompletedIfAssigned } from '../../services/SplitService.Service';
import { router, Stack, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import { Button } from "@rneui/themed";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutExercise } from "../../interfaces/WorkoutExercise.Interface";
import { HeaderBackButton } from "@react-navigation/elements";
import { ActiveExerciseCard } from "../../components/Workout/ActiveExerciseCard";

export default function WorkoutDetails() {

    const { workoutId, autostart } = useLocalSearchParams();
    const autostartHandled = useRef(false);
    const [running, setRunning] = useState<boolean>(false);
    const [isLoading, setLoading] = useState<boolean>(true);
    const [workout, setWorkout] = useState<Workout>();
    const [data, setData] = useState<WorkoutExercise[]>([]);
    const [time, setTime] = useState<number>(0);
    const [startTime, setStartTime] = useState<Date>(new Date(0));
    const [intervalTime, setIntervalTime] = useState<number>(0);
    const [edit, setEdit] = useState<boolean>(false);
    const [linkedOwnerName, setLinkedOwnerName] = useState<string | null>(null);
    const [publicToggleLoading, setPublicToggleLoading] = useState<boolean>(false);
    const [bottomBarHeight, setBottomBarHeight] = useState<number>(140);
    const [completedTodayIds, setCompletedTodayIds] = useState<string[]>([]);
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

    const navigation = useNavigation();

    const withLoading = async (action: () => Promise<void>) => {
        try {
            setLoading(true);
            await action();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }

    const load = async () => {
        await withLoading(async () => {
            let tempWorkout = await getWorkoutById(workoutId as string);
            if (tempWorkout) {
                if (tempWorkout.linkType === 'follow' && tempWorkout.sourceWorkoutId) {
                    await syncLinkedWorkout(tempWorkout.id);
                    tempWorkout = await getWorkoutById(workoutId as string);
                    const sourceWorkout = await getWorkoutById(tempWorkout!.sourceWorkoutId!);
                    const owner = sourceWorkout ? await getUserDataById(sourceWorkout.worUserId) : null;
                    setLinkedOwnerName(owner?.name ?? null);
                } else {
                    setLinkedOwnerName(null);
                }
                setWorkout(tempWorkout!);
                const workoutExercises = await getWorkoutExercises(workoutId as string);
                setData(workoutExercises);
                const completedIds = await getCompletedExerciseIdsForDate(
                    workoutExercises.map((e) => e.id), new Date()
                );
                setCompletedTodayIds(completedIds);
                updateHeader(tempWorkout!.worName);
            }
        });
    };

    const handleTogglePublic = async () => {
        if (!workout) return;
        const next = !workout.isPublic;
        try {
            setPublicToggleLoading(true);
            await toggleWorkoutVisibility(workout.id, next);
            setWorkout({ ...workout, isPublic: next });
        } catch (error) {
            console.error('Error toggling workout visibility:', error);
        } finally {
            setPublicToggleLoading(false);
        }
    };

    const handleUnlink = () => {
        if (!workout) return;
        Alert.alert('Unlink workout', 'This workout will stop syncing exercises from the original. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Unlink', onPress: async () => {
                    await withLoading(async () => {
                        await unlinkWorkout(workout.id);
                    }).then(() => load());
                }
            },
        ]);
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (workout && autostart === 'true' && !autostartHandled.current) {
            autostartHandled.current = true;
            setStartTime(new Date());
            setRunning(true);
        }
    }, [workout, autostart]);

    const moveExerciseForward = (exerciseIndex: number) => {
        if (exerciseIndex < data.length - 1) {
            const exerciseList = [...data];
            [exerciseList[exerciseIndex], exerciseList[exerciseIndex + 1]] = [exerciseList[exerciseIndex + 1], exerciseList[exerciseIndex]];
            updateExercisePosition(exerciseList);
            setData(exerciseList);
        }
    }

    const moveExerciseBackwards = (exerciseIndex: number) => {
        if (exerciseIndex > 0) {
            const exerciseList = [...data];
            [exerciseList[exerciseIndex], exerciseList[exerciseIndex - 1]] = [exerciseList[exerciseIndex - 1], exerciseList[exerciseIndex]];
            updateExercisePosition(exerciseList);
            setData(exerciseList);

        }
    }

    const updateExercisePosition = async (exerciseList: WorkoutExercise[]) => {
        if (exerciseList) {
            exerciseList.forEach((exercise, index) => {
                updateWorkoutExerciseOrdinal(workout!.id, exercise.woeId, index);
            });
        }
    }

    const saveWorkout = async () => {
        await withLoading(async () => {
            if (workout) {
                await updateWorkout(workout, time);
                const storedUser = await getStordUserData();
                if (storedUser) {
                    await markTodayCompletedIfAssigned(storedUser.id, workout.id);
                }
            }
        }).then(() => {
            emitter.emit('workoutEvent');
            emitter.emit('splitEvent');
            router.replace({
                pathname: '/workout/workoutComplete',
                params: { workoutId: workout!.id, time: String(time) },
            });
        });
    }

    const removeWorkoutExercise = async (exerciseId: string) => {
        await withLoading(async () => {
            await removeWorkoutExerciseService(workout!.id, exerciseId, null);
        }).then(() => {
            load();
        });
    };

    const handleExerciseLogged = (exerciseId: string) => {
        emitter.emit('setEvent', 0);
        emitter.emit('workoutEvent', 0);
        setCompletedTodayIds((prev) => (prev.includes(exerciseId) ? prev : [...prev, exerciseId]));
        setExpandedExerciseId((prev) => (prev === exerciseId ? null : prev));
    };

    const warnUser = (exercise: Exercise) => {
        Alert.alert('Remove exercise', 'Are you sure you want to delete exercise ' + exercise.exeName + '?', [
            {
                text: 'Cancel',
                onPress: () => { return; },
                style: 'cancel',
            },
            { text: 'OK', onPress: () => removeWorkoutExercise(exercise.id) },
        ]);
    }

    useEffect(() => {
        const listener = (data: any) => {
            load();
        };
        emitter.on('workoutExerciseEvent', listener);
        return () => {
            emitter.off('workoutExerciseEvent', listener);
        }

    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (running) {
            intervalId = setInterval(() => {
                if (startTime != null) {
                    setTime(Math.floor(intervalTime + (new Date().getTime() - startTime.getTime()) / 1000));
                }
            }, 1000);
        }

        if (workout) {
            updateHeader(workout.worName);
        }

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running, time, edit]);

    const updateHeader = (text: string) => {
        navigation.setOptions({
            header: () => (
                <View style={styles.header}>
                    <HeaderBackButton
                        tintColor={Theme.colors.font}
                        style={styles.headerBackButton}
                        onPress={() => router.back()}
                    />
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{text}</Text>
                        <Text style={styles.headerTimer}>{time ? getFormattedTime(time) : '00:00:00'}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={openEdit}
                        style={styles.headerEditButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MaterialCommunityIcons
                            name={edit ? 'check' : 'pencil-outline'}
                            size={22}
                            color={edit ? Theme.colors.accent : Theme.colors.font}
                        />
                    </TouchableOpacity>
                </View>
            ),
        });
    }

    const startAndStop = () => {
        if (startTime != null) {
            setStartTime(new Date());
        }
        if (running) {
            setIntervalTime(time);
        }
        setRunning(!running);

    };

    const openEdit = () => {
        setEdit((prev) => !prev);
    };

    if (isLoading) {
        return (
            <LoadingIndicator text={'Loading workout...'} />
        )
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: workout?.worName
                }}
            />

            {linkedOwnerName && (
                <View style={styles.linkedBanner}>
                    <View style={styles.linkedBannerLeft}>
                        <MaterialCommunityIcons name='link-variant' size={16} color={Theme.colors.accent} />
                        <Text style={styles.linkedBannerText}>{'Linked from ' + linkedOwnerName}</Text>
                    </View>
                    <TouchableOpacity onPress={handleUnlink}>
                        <Text style={styles.linkedBannerAction}>Unlink</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.publicRow}>
                <Text style={styles.publicRowText}>Public (visible on your profile)</Text>
                <Switch
                    value={workout?.isPublic ?? false}
                    onValueChange={handleTogglePublic}
                    disabled={publicToggleLoading}
                    trackColor={{ false: Theme.colors.border, true: Theme.colors.accent }}
                />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight + Theme.spacing.md }]}
            >
                {data.map((workoutExercise, i) => (
                    <ActiveExerciseCard
                        key={workoutExercise.woeId}
                        exercise={workoutExercise}
                        isFirst={i === 0}
                        isLast={i === data.length - 1}
                        editMode={edit}
                        expanded={expandedExerciseId === workoutExercise.id}
                        alreadyLoggedToday={completedTodayIds.includes(workoutExercise.id)}
                        onToggleExpand={() => setExpandedExerciseId(
                            (prev) => (prev === workoutExercise.id ? null : workoutExercise.id)
                        )}
                        onMoveUp={() => moveExerciseBackwards(i)}
                        onMoveDown={() => moveExerciseForward(i)}
                        onDelete={() => warnUser(workoutExercise)}
                        onLogged={() => handleExerciseLogged(workoutExercise.id)}
                    />
                ))}
            </ScrollView>

            <View
                style={styles.bottomBar}
                onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
            >
                {edit ? (
                    <Button
                        title='Add exercise'
                        onPress={() => { router.push({ pathname: '/exercise/addExercise', params: { workoutId: workout!.id } }) }}
                        buttonStyle={styles.primaryButton}
                        titleStyle={styles.primaryButtonText}
                        icon={{ name: 'plus', type: 'material-community', color: Theme.colors.dark, size: 20 }}
                    />
                ) : (
                    <Button
                        title={running ? 'Pause' : 'Resume'}
                        onPress={() => { startAndStop() }}
                        buttonStyle={styles.primaryButton}
                        titleStyle={styles.primaryButtonText}
                        icon={{ name: running ? 'pause' : 'play', type: 'material-community', color: Theme.colors.dark, size: 20 }}
                    />
                )}
                <Button
                    title='Complete workout'
                    disabled={time <= 0}
                    onPress={() => { saveWorkout() }}
                    buttonStyle={styles.secondaryButton}
                    disabledStyle={styles.secondaryButtonDisabled}
                    titleStyle={styles.secondaryButtonText}
                    disabledTitleStyle={styles.secondaryButtonTextDisabled}
                    icon={{
                        name: 'check-circle-outline', type: 'material-community',
                        color: time > 0 ? Theme.colors.font : Theme.colors.font + '60', size: 18,
                    }}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        paddingHorizontal: Theme.spacing.sm,
        position: 'relative',
        backgroundColor: Theme.colors.lessDark,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerBackButton: {
        position: 'absolute',
        left: Theme.spacing.sm,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.semibold,
        maxWidth: 220,
    },
    headerTimer: {
        color: Theme.colors.font + '99',
        fontSize: Theme.fontSize.sm,
        marginTop: 2,
    },
    headerEditButton: {
        position: 'absolute',
        right: Theme.spacing.md,
    },
    linkedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Theme.colors.accent + '1A',
        marginHorizontal: Theme.spacing.md,
        marginTop: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
    },
    linkedBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    linkedBannerText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
    },
    linkedBannerAction: {
        color: Theme.colors.accent,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    publicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: Theme.spacing.md,
        marginTop: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
    },
    publicRowText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
    },
    scrollView: {
        width: '100%',
    },
    scrollContent: {
        paddingTop: Theme.spacing.md,
    },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: Theme.spacing.md,
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.dark,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
    },
    primaryButton: {
        backgroundColor: Theme.colors.accent,
        borderRadius: Theme.borderRadius.xl,
        paddingVertical: Theme.spacing.md,
        ...Theme.shadows.large,
    },
    primaryButtonText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.bold,
        marginLeft: Theme.spacing.xs,
    },
    secondaryButton: {
        backgroundColor: Theme.colors.green,
        borderRadius: Theme.borderRadius.md,
        paddingVertical: Theme.spacing.sm,
    },
    secondaryButtonDisabled: {
        backgroundColor: Theme.colors.lessDark,
    },
    secondaryButtonText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
        marginLeft: Theme.spacing.xs,
    },
    secondaryButtonTextDisabled: {
        color: Theme.colors.font + '60',
    },
});
