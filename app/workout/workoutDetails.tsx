import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { Workout } from "../../interfaces/Workout.Interface";
import {
    getFormattedTime, getWorkoutById, getWorkoutExercises, updateWorkout, updateWorkoutExerciseOrdinal,
    toggleWorkoutVisibility, syncLinkedWorkout, unlinkWorkout,
} from "../../services/WorkoutService.Service";
import { removeWorkoutExercise as removeWorkoutExerciseService } from '../../services/ExerciseService.Service';
import { getUserDataById } from '../../services/UserService.Service';
import { router, Stack, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import Styles from "../../Styles";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import { Button, Card } from "@rneui/themed";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WorkoutExercise } from "../../interfaces/WorkoutExercise.Interface";
import { HeaderBackButton } from "@react-navigation/elements";

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
            }
        }).then(() => {
            emitter.emit('workoutEvent');
            router.back();
        });
    }

    const removeWorkoutExercise = async (exerciseId: string) => {
        await withLoading(async () => {
            await removeWorkoutExerciseService(workout!.id, exerciseId, null);
        }).then(() => {
            load();
        });
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

    const HeaderTextComponent = (props: { text: string }) => {
        const { text } = props;
        return (
            <Text style={{ fontSize: 18, color: 'gray', textAlign: 'center' }}>{text}</Text>
        )
    }

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
            updateHeader(workout?.worName);
        }

        return () => clearInterval(intervalId);
    }, [running, time]);

    const updateHeader = (text: string) => {
        navigation.setOptions({
            header: () => (
                <View style={Styles.headerContainer}>
                    <HeaderBackButton tintColor={Styles.fontColor.color}
                        style={Styles.backButton}
                        onPress={() => router.back()} />
                    <View>
                        <Text style={Styles.headerTitle}>{text}</Text>
                        <HeaderTextComponent text={time ? getFormattedTime(time) : '00:00:00'} />
                    </View>

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

    const opacity = useState(new Animated.Value(0))[0];

    const openEdit = () => {
        if (!edit) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
            }).start(() => setEdit(!edit));
        } else {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start(() => setEdit(!edit));
        }
    };

    const size = opacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 80],
    });

    if (isLoading) {
        return (
            <LoadingIndicator text={'Loading workout...'} />
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#121111' }}>
            <Stack.Screen
                options={{
                    title: workout?.worName
                }}
            />
            <View style={{ flex: 1 }}>
                {linkedOwnerName && (
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: 'rgba(28, 26, 26, 0.7)', marginHorizontal: 10, marginTop: 10,
                        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name='link-variant' size={16} style={Styles.icon} />
                            <Text style={{ ...Styles.fontColor, marginLeft: 6 }}>{'Linked from ' + linkedOwnerName}</Text>
                        </View>
                        <TouchableOpacity onPress={handleUnlink}>
                            <Text style={{ color: '#CDCD55' }}>Unlink</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    marginHorizontal: 10, marginTop: 10, paddingHorizontal: 12,
                }}>
                    <Text style={Styles.fontColor}>Public (visible on your profile)</Text>
                    <Switch
                        value={workout?.isPublic ?? false}
                        onValueChange={handleTogglePublic}
                        disabled={publicToggleLoading}
                        trackColor={{ false: '#3A3A3A', true: '#CDCD55' }}
                    />
                </View>
                <View>
                    <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 100 }}>{
                        data.map((workoutExercise, i) => {
                            var exerciseDate = new Date(workoutExercise.exeDate).toDateString();
                            return (
                                <TouchableOpacity key={workoutExercise.exeName} onPress={() => { router.push({ pathname: '/exercise/exerciseDetails', params: { 'exerciseId': workoutExercise.id } }) }}>
                                    <Card key={i} containerStyle={Styles.card}>

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View>
                                                <Text style={Styles.cardTitle}>
                                                    {workoutExercise.exeName}
                                                </Text>
                                                <Text style={{ ...Styles.fontColor, marginLeft: 10 }}>
                                                    <MaterialCommunityIcons name='weight-kilogram' size={16} style={Styles.icon} />{' ' + (workoutExercise.exeMaxWeight !== null ? workoutExercise.exeMaxWeight : "0") + '  '}
                                                    <MaterialCommunityIcons name='calendar-range' size={16} style={Styles.icon} />{' ' + (workoutExercise.exeDate !== null ? exerciseDate : 'never')}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 15 }}>
                                                <View style={{ flexDirection: 'row', backgroundColor: 'rgba(28, 26, 26, 0.7)', height: 50, alignItems: 'center' }}>
                                                    <Animated.View style={{
                                                        opacity,
                                                        width: size,
                                                        flexDirection: 'row'
                                                    }}>
                                                        <TouchableOpacity style={{ paddingRight: 10 }} onPress={() => { moveExerciseBackwards(i) }}><MaterialCommunityIcons name='arrow-up' size={24} style={Styles.icon} /></TouchableOpacity>
                                                        <TouchableOpacity style={{ paddingRight: 0 }} onPress={() => { moveExerciseForward(i) }}><MaterialCommunityIcons name='arrow-down' size={24} style={Styles.icon} /></TouchableOpacity>
                                                    </Animated.View>
                                                    <TouchableOpacity style={{ paddingLeft: 0 }} onPress={() => { warnUser(workoutExercise) }}><MaterialCommunityIcons name='trash-can-outline' size={24} style={Styles.icon} /></TouchableOpacity>
                                                </View>
                                            </View>

                                        </View>
                                    </Card>
                                </TouchableOpacity>)
                        })
                    }
                    </ScrollView>
                </View>
                <View style={{
                    flex: 1,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    position: 'absolute',
                    bottom: 45
                }}>
                    <View style={{ flex: 1, margin: 10, marginRight: 2 }}>{
                        !edit ? <Button buttonStyle={Styles.green} title={running ? 'Stop' : 'Start'} onPress={() => { startAndStop() }} /> :
                            <Button buttonStyle={Styles.green} title='Add exercise' onPress={() => { router.push({ pathname: '/exercise/addExercise', params: { workoutId: workout!.id } }) }} />
                    }
                    </View>
                    <View style={{ flex: 1, margin: 10, marginLeft: 2 }}>
                        <Button buttonStyle={Styles.green} onPress={() => { openEdit() }} title={!edit ? 'Edit' : 'Done'} />
                    </View>
                </View>
                <View style={{ position: 'absolute', width: '100%', bottom: 0 }}>
                    <Button disabled={time <= 0} title='Complete' buttonStyle={{ margin: 10, ...Styles.green }} onPress={() => { saveWorkout() }} />
                </View>
            </View>
        </View >
    )
}