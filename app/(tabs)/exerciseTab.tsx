import { Text, View, TouchableOpacity, ScrollView, TextInput, StyleSheet, RefreshControl, Alert } from 'react-native';
import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getExercises, removeExercise as removeExerciseService } from '../../services/ExerciseService.Service';
import { Theme, Styles } from '../../constants/Theme';
import { Card } from '@rneui/themed';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { Exercise } from '../../interfaces/Exercise.Interface';
import { User } from '../../interfaces/User.Interface';
import { getStordUserData } from '../../services/UserService.Service';
import { router, useNavigation } from 'expo-router';
import emitter from '../../hooks/CustomEventEmitter';
import { Divider } from '@rneui/base';

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
            `Are you sure you want to delete exercise "${exercise.exe_name}"?`,
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
                const itemData = item.exe_name?.toUpperCase() || '';
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
                    placeholder='Search exercises...'
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
                            name="dumbbell"
                            size={64}
                            color={Theme.colors.font + '40'}
                        />
                        <Text style={styles.emptyText}>
                            {search ? 'No exercises found' : 'No exercises yet'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {search ? 'Try a different search term' : 'Tap the + button to add an exercise'}
                        </Text>
                    </View>
                ) : (
                    filteredDataSource.map((item: Exercise, i: number) => {
                        const exerciseDate = new Date(item.exe_date).toDateString();

                        return (
                            <TouchableOpacity
                                key={item.id || i}
                                onPress={() =>
                                    router.push({
                                        pathname: '/exercise/exerciseDetails',
                                        params: { exerciseId: item.id, workoutId: undefined }
                                    })
                                }
                                activeOpacity={0.7}
                            >
                                <Card containerStyle={Styles.card}>
                                    <View style={styles.cardContent}>
                                        <View style={styles.cardInfo}>
                                            <Text style={Styles.cardTitle}>
                                                {item.exe_name}
                                            </Text>
                                            <View style={styles.cardDetails}>
                                                <View style={styles.detailItem}>
                                                    <MaterialCommunityIcons
                                                        name='weight-kilogram'
                                                        size={16}
                                                        color={Theme.colors.font}
                                                    />
                                                    <Text style={styles.detailText}>
                                                        {item.exe_max_weight} kg
                                                    </Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <MaterialCommunityIcons
                                                        name='calendar-range'
                                                        size={16}
                                                        color={Theme.colors.font}
                                                    />
                                                    <Text style={styles.detailText}>
                                                        {exerciseDate}
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
    headerButton: {
        paddingRight: Theme.spacing.md,
    },
});