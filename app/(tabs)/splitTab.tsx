import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Dimensions, ScrollView, RefreshControl, FlatList, StyleSheet } from "react-native";
import { Card, Button } from '@rneui/themed';
import Carousel from "react-native-snap-carousel";
import { getReferenceWeek, markDayAsCompleted, SplitWeek } from '../../services/SplitService.Service';
import { getWeekNumber } from "../../services/StatsService.Service";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme, Styles } from "../../constants/Theme";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { getStordUserData } from "../../services/UserService.Service";
import { User } from "../../interfaces/User.Interface";
import { router } from "expo-router";

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function SplitScreen() {
    const sliderWidth = Dimensions.get('window').width;
    const carouselRef = useRef<Carousel<SplitWeek>>(null);
    const [weekData, setWeekData] = useState<SplitWeek[]>([]);
    const [isLoading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const currentWeek = getWeekNumber(new Date());
    const [currentWeekLabel, setCurrentWeekLabel] = useState('Week ' + currentWeek);
    const [user, setUser] = useState<User | null>(null);
    const [currentIndex, setCurrentIndex] = useState(1);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                return;
            }

            setUser(storedUser);
            const data = await getReferenceWeek(storedUser.id);
            if (data) {
                setWeekData(data.weeks);
            }
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

    const onSnapToItem = useCallback((index: number) => {
        setCurrentIndex(index);
        if (index === 0) {
            setCurrentWeekLabel('Template Week');
        } else {
            setCurrentWeekLabel(`Week ${currentWeek + (index - 1)}`);
        }
    }, [currentWeek]);

    const snapToNext = useCallback(() => {
        if (carouselRef.current && currentIndex < weekData.length - 1) {
            carouselRef.current.snapToNext();
        }
    }, [currentIndex, weekData.length]);

    const snapToPrev = useCallback(() => {
        if (carouselRef.current && currentIndex > 0) {
            carouselRef.current.snapToPrev();
        }
    }, [currentIndex]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    }, [load]);

    const handleMarkAsCompleted = useCallback(async (weekIndex: number, day: string) => {
        if (!weekData[weekIndex]) return;

        const dayData = weekData[weekIndex][day as keyof SplitWeek];
        if (!dayData.workout || !dayData.weekId) return;

        try {
            const newCompleted = !dayData.completed;
            const updatedWeekData = [...weekData];
            updatedWeekData[weekIndex] = {
                ...updatedWeekData[weekIndex],
                [day]: {
                    ...dayData,
                    completed: newCompleted
                }
            };
            setWeekData(updatedWeekData);
            await markDayAsCompleted(dayData.weekId, day, newCompleted);
        } catch (error) {
            console.error('Error marking day as completed:', error);
            // Revert on error
            load();
        }
    }, [weekData, load]);

    const FirstIndexComponent = () => {
        return (
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                    name="calendar-plus"
                    size={80}
                    color={Theme.colors.font + '40'}
                />
                <Text style={styles.emptyTitle}>No Split Created</Text>
                <Text style={styles.emptyText}>
                    Create a workout split to automatically generate your weekly training schedule.
                    Assign workouts to each day and the system will rotate them for future weeks.
                </Text>
                <Button
                    title="Create Split"
                    onPress={() => router.push('/split/createSplit')}
                    buttonStyle={styles.createButton}
                    titleStyle={styles.createButtonText}
                />
            </View>
        );
    };

    const renderWeekItem = ({ item, index }: { item: SplitWeek; index: number }) => {
        if (index === 0) {
            return <FirstIndexComponent />;
        }

        return (
            <View style={styles.weekContainer}>
                <FlatList
                    data={WEEK_DAYS}
                    keyExtractor={(day) => day}
                    contentContainerStyle={styles.daysList}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    renderItem={({ item: day }) => {
                        const dayData = item[day];
                        const hasWorkout = dayData.workout !== null;

                        return (
                            <TouchableOpacity
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
                                <Card
                                    containerStyle={[
                                        Styles.card,
                                        dayData.completed && styles.completedCard,
                                        !hasWorkout && styles.emptyDayCard
                                    ]}
                                >
                                    <View style={styles.dayContent}>
                                        <View style={styles.dayInfo}>
                                            <View style={styles.dayHeader}>
                                                <MaterialCommunityIcons
                                                    name="calendar"
                                                    size={20}
                                                    color={Theme.colors.font}
                                                />
                                                <Text style={Styles.cardTitle}>{day}</Text>
                                            </View>
                                            {hasWorkout ? (
                                                <View style={styles.workoutInfo}>
                                                    <MaterialCommunityIcons
                                                        name="weight-lifter"
                                                        size={18}
                                                        color={Theme.colors.font}
                                                    />
                                                    <Text style={styles.workoutName}>
                                                        {dayData.workout!.wor_name}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={styles.restDayText}>Rest day</Text>
                                            )}
                                        </View>
                                        {hasWorkout && (
                                            <TouchableOpacity
                                                onPress={() => handleMarkAsCompleted(index, day)}
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
                                </Card>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
        );
    };

    if (isLoading) {
        return <LoadingIndicator text='Loading split...' />;
    }

    if (!weekData || weekData.length === 0) {
        return (
            <View style={styles.container}>
                <FirstIndexComponent />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={snapToPrev}
                    disabled={currentIndex === 0}
                    style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                >
                    <MaterialCommunityIcons
                        name='chevron-left'
                        size={32}
                        color={currentIndex === 0 ? Theme.colors.font + '40' : Theme.colors.font}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{currentWeekLabel}</Text>
                <TouchableOpacity
                    onPress={snapToNext}
                    disabled={currentIndex >= weekData.length - 1}
                    style={[
                        styles.navButton,
                        currentIndex >= weekData.length - 1 && styles.navButtonDisabled
                    ]}
                >
                    <MaterialCommunityIcons
                        name='chevron-right'
                        size={32}
                        color={currentIndex >= weekData.length - 1 ? Theme.colors.font + '40' : Theme.colors.font}
                    />
                </TouchableOpacity>
            </View>
            <View style={styles.carouselContainer}>
                <Carousel
                    ref={carouselRef}
                    data={weekData}
                    renderItem={renderWeekItem}
                    sliderWidth={sliderWidth}
                    itemWidth={sliderWidth}
                    firstItem={1}
                    onSnapToItem={onSnapToItem}
                    enableMomentum={false}
                    lockScrollWhileSnapping={true}
                />
            </View>
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
    carouselContainer: {
        flex: 1,
    },
    weekContainer: {
        flex: 1,
    },
    daysList: {
        paddingBottom: Theme.spacing.lg,
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