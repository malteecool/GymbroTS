import React from 'react';
import { Theme } from '../../constants/Theme';
import { SharePrompt } from './SharePrompt';

interface WorkoutSharePromptProps {
    visible: boolean;
    workoutName: string;
    workoutId: string;
    onClose: () => void;
    onShared: () => void;
}

/** Offered after finishing a workout. */
export function WorkoutSharePrompt({ visible, workoutName, workoutId, onClose, onShared }: WorkoutSharePromptProps) {
    return (
        <SharePrompt
            visible={visible}
            title="Workout Complete!"
            highlight={workoutName}
            icon="check-circle"
            iconColor={Theme.colors.green}
            postType="workout_complete"
            workoutId={workoutId}
            onClose={onClose}
            onShared={onShared}
        />
    );
}
