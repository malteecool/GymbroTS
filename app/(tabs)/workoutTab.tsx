import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Card, Button } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import emitter from '../../hooks/CustomEventEmitter';
import { getWorkouts, getFormattedTime } from '../../services/WorkoutService.Service';
import { getTodaysSplitWorkout } from '../../services/SplitService.Service';
import { Theme, Styles } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { getStordUserData } from '../../services/UserService.Service';
import { User } from '../../interfaces/User.Interface';
import { Workout } from '../../interfaces/Workout.Interface';
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
                            color={Theme.colors.font}
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
            const [todays, workouts] = await Promise.all([
                getTodaysSplitWorkout(storedUser.id),
                getWorkouts(storedUser.id),
            ]);

            setDayName(todays.dayName);
            setHasSplit(todays.hasSplit);
            setSelectedWorkout(todays.workout);
            setAllWorkouts(workouts);
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
                    <MaterialCommunityIcons
                        name="calendar-today"
                        size={16}
                        color={Theme.colors.font + '99'}
                    />
                    <Text style={styles.dayLabel}>{dayName ? `Today · ${dayName}` : 'Today'}</Text>
                </View>

                {selectedWorkout ? (
                    <>
                        <Card containerStyle={styles.heroCard}>
                            <View style={styles.heroIconWrap}>
                                <MaterialCommunityIcons
                                    name="weight-lifter"
                                    size={40}
                                    color={Theme.colors.accent}
                                />
                            </View>
                            <Text style={styles.heroTitle}>{selectedWorkout.worName}</Text>
                            <View style={styles.heroMetaRow}>
                                <View style={styles.detailItem}>
                                    <MaterialCommunityIcons
                                        name='clock-time-four-outline'
                                        size={16}
                                        color={Theme.colors.font}
                                    />
                                    <Text style={styles.detailText}>
                                        {getFormattedTime(selectedWorkout.worEstimateTime)}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <MaterialCommunityIcons
                                        name='calendar-range'
                                        size={16}
                                        color={Theme.colors.font}
                                    />
                                    <Text style={styles.detailText}>
                                        {selectedWorkout.worLastDone
                                            ? new Date(selectedWorkout.worLastDone).toDateString()
                                            : 'never'}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <MaterialCommunityIcons
                                        name='repeat'
                                        size={16}
                                        color={Theme.colors.font}
                                    />
                                    <Text style={styles.detailText}>{selectedWorkout.worCompletedCount}x</Text>
                                </View>
                            </View>
                        </Card>

                        <TouchableOpacity style={styles.changeRow} onPress={openPicker}>
                            <MaterialCommunityIcons name="swap-horizontal" size={18} color={Theme.colors.font} />
                            <Text style={styles.changeText}>Change workout</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Card containerStyle={styles.heroCard}>
                            <MaterialCommunityIcons
                                name={hasSplit ? 'weather-night' : 'calendar-remove'}
                                size={40}
                                color={Theme.colors.font + '60'}
                            />
                            <Text style={styles.heroTitle}>{hasSplit ? 'Rest day' : 'No split set up'}</Text>
                            <Text style={styles.heroSubtitle}>
                                {hasSplit
                                    ? `Nothing scheduled for ${dayName}. Enjoy the recovery, or start something anyway.`
                                    : 'Set up a split and your workout will be ready here automatically.'}
                            </Text>
                        </Card>

                        {!hasSplit && (
                            <Button
                                title="Create a split"
                                onPress={() => router.push('/split/createSplit')}
                                buttonStyle={styles.secondaryButton}
                                titleStyle={styles.secondaryButtonText}
                            />
                        )}

                        <TouchableOpacity style={styles.changeRow} onPress={openPicker}>
                            <MaterialCommunityIcons name="swap-horizontal" size={18} color={Theme.colors.font} />
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
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Change workout</Text>
                        <TouchableOpacity
                            onPress={() => setPickerVisible(false)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <MaterialCommunityIcons name="close" size={24} color={Theme.colors.font} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchContainer}>
                        <MaterialCommunityIcons
                            name="magnify"
                            size={20}
                            color={Theme.colors.font}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            onChangeText={setPickerSearch}
                            value={pickerSearch}
                            style={styles.searchBar}
                            placeholder='Search workouts...'
                            placeholderTextColor={Theme.colors.font + '80'}
                        />
                    </View>
                    <ScrollView contentContainerStyle={styles.pickerListContent}>
                        {filteredWorkouts.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons
                                    name="weight-lifter"
                                    size={48}
                                    color={Theme.colors.font + '40'}
                                />
                                <Text style={styles.emptyText}>
                                    {pickerSearch ? 'No workouts found' : 'No workouts yet'}
                                </Text>
                            </View>
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
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    scrollContent: {
        padding: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl * 3,
    },
    dayLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        marginBottom: Theme.spacing.md,
    },
    dayLabel: {
        color: Theme.colors.font + '99',
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    heroCard: {
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 0,
        marginHorizontal: 0,
        marginBottom: Theme.spacing.md,
        paddingVertical: Theme.spacing.xl,
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        ...Theme.shadows.medium,
    },
    heroIconWrap: {
        marginBottom: Theme.spacing.sm,
    },
    heroTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xxl,
        fontWeight: Theme.fontWeight.bold,
        textAlign: 'center',
        marginBottom: Theme.spacing.sm,
    },
    heroSubtitle: {
        color: Theme.colors.font + '99',
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
        marginTop: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
        lineHeight: Theme.lineHeight.md,
    },
    heroMetaRow: {
        flexDirection: 'row',
        gap: Theme.spacing.md,
        flexWrap: 'wrap',
        justifyContent: 'center',
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
    changeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.md,
    },
    changeText: {
        color: Theme.colors.font,
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
        color: Theme.colors.dark,
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
    modalContainer: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Theme.spacing.md,
        paddingTop: Theme.spacing.lg,
        paddingBottom: Theme.spacing.md,
    },
    modalTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xl,
        fontWeight: Theme.fontWeight.bold,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        marginHorizontal: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
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
    pickerListContent: {
        paddingHorizontal: Theme.spacing.xs,
        paddingBottom: Theme.spacing.xl,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl * 2,
    },
    emptyText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        marginTop: Theme.spacing.md,
    },
});
