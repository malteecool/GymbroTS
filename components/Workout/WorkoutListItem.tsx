import React from 'react';
import { Workout } from '../../interfaces/Workout.Interface';
import { getFormattedTime } from '../../services/WorkoutService.Service';
import { ListCard } from '../ui/ListCard';

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
        <ListCard
            title={workout.worName}
            onPress={onPress}
            onDelete={onDelete}
            meta={[
                { icon: 'clock-time-four-outline', label: getFormattedTime(workout.worEstimateTime) },
                { icon: 'calendar-range', label: lastDoneDate },
                { icon: 'repeat', label: `${workout.worCompletedCount}x` },
            ]}
        />
    );
}
