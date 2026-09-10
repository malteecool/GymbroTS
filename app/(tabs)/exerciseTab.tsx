import { View, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getExercises, removeExercise as removeExerciseService } from '../../services/ExerciseService.Service';
import { Theme, Styles } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListCard } from '../../components/ui/ListCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Exercise } from '../../interfaces/Exercise.Interface';
import { User } from '../../interfaces/User.Interface';
import { getStordUserData } from '../../services/UserService.Service';
import { router, useNavigation } from 'expo-router';
import emitter from '../../hooks/CustomEventEmitter';

export default function ExerciseScreen() {
    const navigation = useNavigation();
    const [isLoading, setLoading] = useState(true);
    const [data, setData] = useState<Exercise[]>([]);
    const [search, setSearch] = useState('');
    const [filteredDataSource, setFilteredDataSource] = useState<Exercise[]>([]);
    const [masterDataSource, setMasterDataSource] = useState<Exercise[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => router.push('/exercise/addExercise')}
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
                return;
            }

            setUser(storedUser);
            const exercises = await getExercises(storedUser.id);
            setData(exercises);
            setFilteredDataSource(exercises);
            setMasterDataSource(exercises);
        } catch (error) {
            console.error('Error loading exercises:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const removeExercise = useCallback(async (exe_id: string) => {
        if (!user) return;
        
        try {
            setLoading(true);
            await removeExerciseService(exe_id, user.id);
            await load();
        } catch (error) {
            console.error('Error removing exercise:', error);
            Alert.alert('Error', 'Failed to remove exercise. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user, load]);

    const warnUser = useCallback((exercise: Exercise) => {
        Alert.alert(
            'Remove exercise',
            `Are you sure you want to delete exercise "${exercise.exeName}"?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => removeExercise(exercise.id),
                },
            ]
        );
    }, [removeExercise]);

    const searchFilterFunction = useCallback((text: string) => {
        setSearch(text);
        if (text) {
            const newData = masterDataSource.filter((item: Exercise) => {
                const itemData = item.exeName?.toUpperCase() || '';
                const textData = text.toUpperCase();
                return itemData.indexOf(textData) > -1;
            });
            setFilteredDataSource(newData);
        } else {
            setFilteredDataSource(masterDataSource);
        }
    }, [masterDataSource]);

    useEffect(() => {
        const listener = () => {
            load();
        };
        emitter.on('exerciseEvent', listener);

        return () => {
            emitter.off('exerciseEvent', listener);
        };
    }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    }, [load]);

    if (isLoading && data.length === 0) {
        return <LoadingIndicator text='Loading exercises...' />;
    }

    return (
        <View style={Styles.screen}>
            <SearchBar
                value={search}
                onChangeText={searchFilterFunction}
                placeholder='Search exercises...'
            />
            <ScrollView
                contentContainerStyle={Styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {filteredDataSource.length === 0 ? (
                    <EmptyState
                        icon="dumbbell"
                        title={search ? 'No exercises found' : 'No exercises yet'}
                        subtitle={search
                            ? 'Try a different search term'
                            : 'Tap the + button to add an exercise'}
                    />
                ) : (
                    filteredDataSource.map((item: Exercise, i: number) => (
                        <ListCard
                            key={item.id || i}
                            title={item.exeName}
                            onPress={() =>
                                router.push({
                                    pathname: '/exercise/exerciseDetails',
                                    params: { exerciseId: item.id, workoutId: undefined }
                                })
                            }
                            onDelete={() => warnUser(item)}
                            meta={[
                                { icon: 'weight-kilogram', label: `${item.exeMaxWeight} kg` },
                                { icon: 'calendar-range', label: new Date(item.exeDate).toDateString() },
                            ]}
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
