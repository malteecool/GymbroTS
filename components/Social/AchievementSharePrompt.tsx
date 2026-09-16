import React from 'react';
import { Theme } from '../../constants/Theme';
import { Milestone, PersonalRecord } from '../../interfaces/Achievement.Interface';
import {
    describeMilestone, describePersonalRecords, milestoneCaption, personalRecordCaption,
} from '../../services/AchievementService.Service';
import { SharePrompt } from './SharePrompt';

interface PersonalRecordPromptProps {
    visible: boolean;
    records: PersonalRecord[];
    onClose: () => void;
    onShared: () => void;
}

/**
 * Offered when a logged session beats a stored maximum. Weight and reps records
 * from the same session are announced together as one post.
 */
export function PersonalRecordSharePrompt({ visible, records, onClose, onShared }: PersonalRecordPromptProps) {
    if (records.length === 0) return null;

    return (
        <SharePrompt
            visible={visible}
            title={records.length > 1 ? 'New PRs!' : 'New PR!'}
            highlight={describePersonalRecords(records)}
            icon="trophy"
            iconColor={Theme.colors.accent}
            postType="pr_broken"
            workoutId={null}
            initialCaption={personalRecordCaption(records)}
            onClose={onClose}
            onShared={onShared}
        />
    );
}

interface MilestonePromptProps {
    visible: boolean;
    milestone: Milestone | null;
    onClose: () => void;
    onShared: () => void;
}

/** Offered when a workout count or streak threshold is crossed. */
export function MilestoneSharePrompt({ visible, milestone, onClose, onShared }: MilestonePromptProps) {
    if (!milestone) return null;

    return (
        <SharePrompt
            visible={visible}
            title="Milestone reached!"
            highlight={describeMilestone(milestone)}
            icon="star-circle"
            iconColor={Theme.colors.accent}
            postType="milestone"
            workoutId={null}
            initialCaption={milestoneCaption(milestone)}
            onClose={onClose}
            onShared={onShared}
        />
    );
}
