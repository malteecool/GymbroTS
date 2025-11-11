import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import emitter from '../../hooks/CustomEventEmitter';
import { removeWorkout as removeWorkoutService, getWorkouts, getFirebaseTimeStamp, getFormattedTime } from '../../services/WorkoutService.Service';
import { Theme, Styles } from '../../constants/Theme';
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
    const [user, setUser] = useState<User | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                router.back();
                return;
            }

            setUser(storedUser);
            const workouts = await getWorkouts(storedUser.id);
            setData(workouts);
        } catch (error) {
            console.error('Error loading workouts:', error);
            Alert.alert('Error', 'Failed to load workouts. Please try again.');
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
        emitter.on('workoutEvent', listener);

        return () => {
            emitter.off('workoutEvent', listener);
        };
    }, [load]);

    const removeWorkout = useCallback(async (workoutId: string) => {
        try {
            setLoading(true);
            await removeWorkoutService(workoutId);
            await load();
        } catch (error) {
            console.error('Error removing workout:', error);
            Alert.alert('Error', 'Failed to remove workout. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [load]);

    const warnUser = useCallback((workout: Workout) => {
        Alert.alert(
            'Remove workout',
            `Are you sure you want to delete workout "${workout.wor_name}"?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => removeWorkout(workout.id),
                },
            ]
        );
    }, [removeWorkout]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    }, [load]);

    if (isLoading && data.length === 0) {
        return <LoadingIndicator text='Loading workouts...' />;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {data.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="weight-lifter"
                            size={64}
                            color={Theme.colors.font + '40'}
                        />
                        <Text style={styles.emptyText}>No workouts yet</Text>
                        <Text style={styles.emptySubtext}>
                            Tap the + button to create your first workout
                        </Text>
                    </View>
                ) : (
                    data.map((item: Workout) => {
                        const lastDoneDate = item.wor_last_done
                            ? getFirebaseTimeStamp(
                                item.wor_last_done.seconds,
                                item.wor_last_done.nanoseconds
                            )
                            : null;

                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => {
                                    router.push({
                                        pathname: '/workout/workoutDetails',
                                        params: { workoutId: item.id }
                                    });
                                }}
                                activeOpacity={0.7}
                            >
                                <Card containerStyle={Styles.card}>
                                    <View style={styles.cardContent}>
                                        <View style={styles.cardInfo}>
                                            <Text style={Styles.cardTitle}>
                                                {item.wor_name}
                                            </Text>
                                            <View style={styles.cardDetails}>
                                                <View style={styles.detailItem}>
                                                    <MaterialCommunityIcons
                                                        name='clock-time-four-outline'
                                                        size={16}
                                                        color={Theme.colors.font}
                                                    />
                                                    <Text style={styles.detailText}>
                                                        {getFormattedTime(item.wor_estimate_time)}
                                                    </Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <MaterialCommunityIcons
                                                        name='calendar-range'
                                                        size={16}
                                                        color={Theme.colors.font}
                                                    />
                                                    <Text style={styles.detailText}>
                                                        {lastDoneDate
                                                            ? lastDoneDate.toLocaleDateString()
                                                            : 'Never'}
                                                    </Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <MaterialCommunityIcons
                                                        name='repeat'
                                                        size={16}
                                                        color={Theme.colors.font}
                                                    />
                                                    <Text style={styles.detailText}>
                                                        {item.wor_completed_count}x
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => warnUser(item)}
                                            style={styles.trashButton}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <MaterialCommunityIcons
                                                name="trash-can-outline"
                                                size={20}
                                                color={Theme.colors.font}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
            <AddButton navigation='/workout/addWorkout' />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
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
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardDetails: {
        flexDirection: 'row',
        marginTop: Theme.spacing.xs,
        marginLeft: Theme.spacing.sm,
        gap: Theme.spacing.md,
        flexWrap: 'wrap',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    detailText: {
        ...Styles.fontColor,
        fontSize: Theme.fontSize.sm,
    },
    trashButton: {
        padding: Theme.spacing.xs,
    },
});