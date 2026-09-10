import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import emitter from '../../hooks/CustomEventEmitter';
import { removeWorkout as removeWorkoutService, getWorkouts } from '../../services/WorkoutService.Service';
import { Theme, Styles } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchBar } from '../../components/ui/SearchBar';
import { getStordUserData } from '../../services/UserService.Service';
import { User } from '../../interfaces/User.Interface';
import { Workout } from '../../interfaces/Workout.Interface';
import { router, useNavigation } from 'expo-router';
import { WorkoutListItem } from '../../components/Workout/WorkoutListItem';

export default function AllWorkoutsScreen() {
    const navigation = useNavigation();
    const [search, setSearch] = useState('');
    const [filteredDataSource, setFilteredDataSource] = useState<Workout[]>([]);
    const [masterDataSource, setMasterDataSource] = useState<Workout[]>([]);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [isLoading, setLoading] = useState<boolean>(true);
    const [user, setUser] = useState<User | null>(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => router.push('/workout/addWorkout')}
                    style={styles.headerButton}
                >
                    <MaterialCommunityIcons
                        name="plus"
                        size={24}
                        color={Theme.colors.green}
                    />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

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
            setFilteredDataSource(workouts);
            setMasterDataSource(workouts);
        } catch (error) {
            console.error('Error loading workouts:', error);
            Alert.alert('Error', 'Failed to load workouts. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    const searchFilterFunction = useCallback((text: string) => {
        setSearch(text);
        if (text) {
            const newData = masterDataSource.filter((item: Workout) => {
                const itemData = item.worName?.toUpperCase() || '';
                const textData = text.toUpperCase();
                return itemData.indexOf(textData) > -1;
            });
            setFilteredDataSource(newData);
        } else {
            setFilteredDataSource(masterDataSource);
        }
    }, [masterDataSource]);

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
            emitter.emit('workoutEvent');
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
            `Are you sure you want to delete workout "${workout.worName}"?`,
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

    if (isLoading && masterDataSource.length === 0) {
        return <LoadingIndicator text='Loading workouts...' />;
    }

    return (
        <View style={Styles.screen}>
            <SearchBar
                value={search}
                onChangeText={searchFilterFunction}
                placeholder='Search workouts...'
            />
            <ScrollView
                contentContainerStyle={Styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {filteredDataSource.length === 0 ? (
                    <EmptyState
                        icon="weight-lifter"
                        title={search ? 'No workouts found' : 'No workouts yet'}
                        subtitle={search
                            ? 'Try a different search term'
                            : 'Tap the + button to create your first workout'}
                    />
                ) : (
                    filteredDataSource.map((item: Workout) => (
                        <WorkoutListItem
                            key={item.id}
                            workout={item}
                            onPress={() => {
                                router.push({
                                    pathname: '/workout/workoutDetails',
                                    params: { workoutId: item.id }
                                });
                            }}
                            onDelete={() => warnUser(item)}
                        />
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    headerButton: {
        paddingRight: Theme.spacing.md,
    },
});
