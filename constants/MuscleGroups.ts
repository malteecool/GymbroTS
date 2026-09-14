import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * The muscle groups an exercise can belong to. Stored on `exercise.exe_muscle_group`
 * as these exact slugs - the column's CHECK constraint lists the same values, so
 * adding one here means adding it to the migration too.
 */
export const MUSCLE_GROUPS = [
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'legs',
    'glutes',
    'core',
    'cardio',
    'other',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

interface MuscleGroupMeta {
    label: string;
    icon: IconName;
}

const META: Record<MuscleGroup, MuscleGroupMeta> = {
    chest: { label: 'Chest', icon: 'weight-lifter' },
    back: { label: 'Back', icon: 'human-handsup' },
    shoulders: { label: 'Shoulders', icon: 'karate' },
    biceps: { label: 'Biceps', icon: 'arm-flex' },
    triceps: { label: 'Triceps', icon: 'arm-flex-outline' },
    legs: { label: 'Legs', icon: 'walk' },
    glutes: { label: 'Glutes', icon: 'human-male' },
    core: { label: 'Core', icon: 'stomach' },
    cardio: { label: 'Cardio', icon: 'heart-pulse' },
    other: { label: 'Other', icon: 'dumbbell' },
};

/** Shown wherever an exercise has no group set yet. */
export const UNCATEGORISED_LABEL = 'Uncategorised';
export const UNCATEGORISED_ICON: IconName = 'help-circle-outline';

export function isMuscleGroup(value: unknown): value is MuscleGroup {
    return typeof value === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(value);
}

export function muscleGroupLabel(group: MuscleGroup | null | undefined): string {
    return group ? META[group].label : UNCATEGORISED_LABEL;
}

export function muscleGroupIcon(group: MuscleGroup | null | undefined): IconName {
    return group ? META[group].icon : UNCATEGORISED_ICON;
}

/** Every group as `{ value, label, icon }`, in the order they should be listed. */
export const MUSCLE_GROUP_OPTIONS: (MuscleGroupMeta & { value: MuscleGroup })[] =
    MUSCLE_GROUPS.map((value) => ({ value, ...META[value] }));

/**
 * Name keywords used to guess a group for a new exercise. Checked in order and
 * the first hit wins, so the specific entries ("leg curl") have to sit above the
 * generic ones ("curl") - which is why legs is tested before biceps.
 *
 * The migration's backfill applies the same rules in the same order; keep the
 * two in step if you change either.
 */
const NAME_HINTS: { group: MuscleGroup; keywords: string[] }[] = [
    { group: 'cardio', keywords: ['cardio', 'treadmill', 'elliptical', 'rowing machine', 'row machine', 'stationary bike', 'exercise bike', 'cycling', 'spin bike', 'jump rope', 'skipping', 'sprint', 'stair', 'jog', 'running'] },
    { group: 'legs', keywords: ['squat', 'lunge', 'leg press', 'leg extension', 'leg curl', 'calf', 'quad', 'hamstring', 'romanian', 'bulgarian', 'step up', 'hack '] },
    { group: 'glutes', keywords: ['glute', 'hip thrust', 'hip abduction', 'hip adduction'] },
    { group: 'core', keywords: ['abs', 'ab wheel', 'crunch', 'plank', 'sit up', 'situp', 'oblique', 'core', 'leg raise', 'russian twist', 'knee raise'] },
    { group: 'shoulders', keywords: ['shoulder', 'overhead press', 'military', 'lateral raise', 'front raise', 'delt', 'upright row', 'arnold', 'face pull', 'shrug'] },
    { group: 'triceps', keywords: ['tricep', 'pushdown', 'push down', 'skull', 'kickback', 'close grip', 'overhead extension', 'dip'] },
    { group: 'back', keywords: ['row', 'pull up', 'pullup', 'pull-up', 'pulldown', 'pull down', 'chin up', 'chinup', 'lat ', 'deadlift', 'back'] },
    { group: 'biceps', keywords: ['curl', 'bicep', 'preacher', 'hammer'] },
    { group: 'chest', keywords: ['bench', 'chest', 'pec', 'fly', 'flye', 'push up', 'pushup', 'push-up', 'press'] },
];

/**
 * Best guess at the muscle group for an exercise name, or null when nothing
 * matches - the caller decides whether to leave it uncategorised or ask.
 */
export function guessMuscleGroup(name: string): MuscleGroup | null {
    const haystack = name.trim().toLowerCase();
    if (!haystack) return null;

    for (const hint of NAME_HINTS) {
        if (hint.keywords.some((keyword) => haystack.includes(keyword))) {
            return hint.group;
        }
    }

    return null;
}
