import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Card } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import emitter from '../../hooks/CustomEventEmitter';
import { removeWorkout as removeWorkoutService, getWorkouts, getFirebaseTimeStamp } from '../../services/WorkoutService.Service';
import Styles from '../../Styles';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { getStordUserData } from '../../services/UserService.Service';
import { User } from '../../interfaces/User.Interface';
import { Workout } from '../../interfaces/Workout.Interface';
import { router } from 'expo-router';
import { AddButton } from '../../components/ui/AddButton';

export default function WorkoutScreen() {
    const [data, setData] = useState<Workout[]>([]);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [isLoading, setLoading] = useState<boolean>(true);
    const [user, setUser] = useState<User>();

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
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.log("User is undefined");
                router.back();
            }
            setUser(storedUser);
            const workouts = await getWorkouts(storedUser.id);
            setData(workouts);
        });
    };
    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        const listener = (data: any) => {
            load();
        };
        emitter.on('workoutEvent', listener);

        return () => {
            emitter.off('workoutEvent', listener);
        }

    }, []);

    const removeWorkout = async (workoutId: string) => {
        await withLoading(async () => {
            await removeWorkoutService(workoutId);
        }).then(() => {
            load();
        });
    };

    const warnUser = (workout: Workout) => {
        Alert.alert('Remove workout', 'Are you sure you want to delete workout ' + workout.wor_name + '?', [
            {
                text: 'Cancel',
                onPress: () => { return; },
                style: 'cancel',
            },
            { text: 'OK', onPress: () => removeWorkout(workout.id) },
        ]);
    }
    const getFormattedTime = (time: number) => {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor((time % 60));
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }

    const _onRefresh = React.useCallback(() => {
        load();
    }, []);


    if (isLoading) {
        return (
            <LoadingIndicator text={'Loading workouts...'} />
        )
    }

    return (
        <View style={styles.container}>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={_onRefresh} />}
            >{
                    data.map((item: Workout, i) => {
                        return (
                            <TouchableOpacity key={item.id} onPress={() => { router.push({ pathname: '/workout/workoutDetails', params: { 'workoutId': item.id } },) }}>
                                <Card containerStyle={Styles.card}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={Styles.cardTitle}>
                                                {item.wor_name}
                                            </Text>
                                            <Text style={{ ...Styles.fontColor, marginLeft: 10 }}>
                                                <MaterialCommunityIcons style={Styles.icon} name='clock-time-four-outline' size={16} /> {getFormattedTime(item.wor_estimate_time) + '  '}
                                                <MaterialCommunityIcons style={Styles.icon} name='calendar-range' size={16} />
                                                {item.wor_last_done !== null ? ' ' + getFirebaseTimeStamp(item.wor_last_done.seconds, item.wor_last_done.nanoseconds).toDateString() : 'never'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => warnUser(item)} style={Styles.trashIcon}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={20} style={Styles.icon} />
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        )
                    })
                }</ScrollView>

            <AddButton navigation='/workout/addWorkout'/>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Styles.dark.backgroundColor
    },
    buttonStyle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderColor: '#1c7bc7',
        backgroundColor: Styles.green.backgroundColor
    }
})