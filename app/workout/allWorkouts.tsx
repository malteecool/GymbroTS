import { Alert, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import emitter from '../../hooks/CustomEventEmitter';
import { removeWorkout as removeWorkoutService, getWorkouts } from '../../services/WorkoutService.Service';
import { Theme } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { getStordUserData } from '../../services/UserService.Service';
import { User } from '../../interfaces/User.Interface';
import { Workout } from '../../interfaces/Workout.Interface';
import { router, useNavigation } from 'expo-router';
import { Divider } from '@rneui/base';
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
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color={Theme.colors.font}
                    style={styles.searchIcon}
                />
                <TextInput
                    onChangeText={searchFilterFunction}
                    value={search}
                    style={styles.searchBar}
                    placeholder='Search workouts...'
                    placeholderTextColor={Theme.colors.font + '80'}
                />
                {search.length > 0 && (
                    <TouchableOpacity
                        onPress={() => searchFilterFunction('')}
                        style={styles.clearButton}
                    >
                        <MaterialCommunityIcons
                            name="close-circle"
                            size={20}
                            color={Theme.colors.font}
                        />
                    </TouchableOpacity>
                )}
            </View>
            <Divider width={1} color={Theme.colors.dark} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {filteredDataSource.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="weight-lifter"
                            size={64}
                            color={Theme.colors.font + '40'}
                        />
                        <Text style={styles.emptyText}>
                            {search ? 'No workouts found' : 'No workouts yet'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {search ? 'Try a different search term' : 'Tap the + button to create your first workout'}
                        </Text>
                    </View>
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
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        marginHorizontal: Theme.spacing.xs,
        marginTop: Theme.spacing.xs,
        borderRadius: Theme.borderRadius.md,
    },
    searchIcon: {
        marginRight: Theme.spacing.sm,
    },
    searchBar: {
        flex: 1,
        height: 40,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
    },
    clearButton: {
        marginLeft: Theme.spacing.sm,
        padding: Theme.spacing.xs,
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
    headerButton: {
        paddingRight: Theme.spacing.md,
    },
});
