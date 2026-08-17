import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme, Styles } from '../../constants/Theme';
import { Workout } from '../../interfaces/Workout.Interface';
import { getFormattedTime } from '../../services/WorkoutService.Service';

interface WorkoutListItemProps {
    workout: Workout;
    onPress: () => void;
    onDelete?: () => void;
}

export function WorkoutListItem({ workout, onPress, onDelete }: WorkoutListItemProps) {
    const lastDoneDate = workout.worLastDone
        ? new Date(workout.worLastDone).toDateString()
        : 'never';

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Card containerStyle={Styles.card}>
                <View style={styles.cardContent}>
                    <View style={styles.cardInfo}>
                        <Text style={Styles.cardTitle}>{workout.worName}</Text>
                        <View style={styles.cardDetails}>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name='clock-time-four-outline'
                                    size={16}
                                    color={Theme.colors.font}
                                />
                                <Text style={styles.detailText}>
                                    {getFormattedTime(workout.worEstimateTime)}
                                </Text>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name='calendar-range'
                                    size={16}
                                    color={Theme.colors.font}
                                />
                                <Text style={styles.detailText}>{lastDoneDate}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name='repeat'
                                    size={16}
                                    color={Theme.colors.font}
                                />
                                <Text style={styles.detailText}>{workout.worCompletedCount}x</Text>
                            </View>
                        </View>
                    </View>
                    {onDelete && (
                        <TouchableOpacity
                            onPress={onDelete}
                            style={styles.trashButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialCommunityIcons
                                name="trash-can-outline"
                                size={20}
                                color={Theme.colors.font}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </Card>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
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
