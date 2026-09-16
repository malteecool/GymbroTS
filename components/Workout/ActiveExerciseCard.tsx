import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme, Styles } from '../../constants/Theme';
import { SetField, SetTable } from './SetTable';
import { MetaRow } from '../ui/MetaRow';
import { muscleGroupIcon, muscleGroupLabel } from '../../constants/MuscleGroups';
import { addExerciseHistory, getLastLoggedSession } from '../../services/ExerciseService.Service';
import { PersonalRecord } from '../../interfaces/Achievement.Interface';
import { WorkoutExercise } from '../../interfaces/WorkoutExercise.Interface';
import { Set as WorkoutSet } from '../../interfaces/Set.Interface';
import { ExerciseHistory } from '../../interfaces/ExerciseHistory.Interface';

interface ActiveExerciseCardProps {
    exercise: WorkoutExercise;
    isFirst: boolean;
    isLast: boolean;
    editMode: boolean;
    expanded: boolean;
    alreadyLoggedToday: boolean;
    onToggleExpand: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    onLogged: () => void;
    /**
     * Raised when the saved session beat a record. The sheet is rendered by the
     * screen, not here: this card lives inside a clipped, scrolling container,
     * so a full-screen overlay mounted from it would be cut off at the card.
     */
    onPersonalRecords: (records: PersonalRecord[]) => void;
}

export function ActiveExerciseCard({
    exercise, isFirst, isLast, editMode, expanded, alreadyLoggedToday,
    onToggleExpand, onMoveUp, onMoveDown, onDelete, onLogged, onPersonalRecords,
}: ActiveExerciseCardProps) {
    const [sets, setSets] = useState<WorkoutSet[]>([{ setWeight: 0, setReps: 0, setOrder: 1 }]);
    const [comment, setComment] = useState<string>('');
    const [saving, setSaving] = useState<boolean>(false);
    const [saved, setSaved] = useState<boolean>(alreadyLoggedToday);
    const [lastSession, setLastSession] = useState<ExerciseHistory | null>(null);
    const [lastSessionLoaded, setLastSessionLoaded] = useState<boolean>(false);
    const [lastSessionLoading, setLastSessionLoading] = useState<boolean>(false);

    useEffect(() => {
        if (alreadyLoggedToday) setSaved(true);
    }, [alreadyLoggedToday]);

    useEffect(() => {
        if (!expanded || lastSessionLoaded) return;

        let cancelled = false;
        (async () => {
            try {
                setLastSessionLoading(true);
                const session = await getLastLoggedSession(exercise.id, new Date().toDateString());
                if (!cancelled) setLastSession(session);
            } catch (error) {
                console.error('Error loading last session:', error);
            } finally {
                if (!cancelled) {
                    setLastSessionLoading(false);
                    setLastSessionLoaded(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [expanded, lastSessionLoaded, exercise.id]);

    const exerciseDate = exercise.exeDate ? new Date(exercise.exeDate).toDateString() : 'never';
    const sessionMaxWeight = Math.max(0, ...sets.map((s) => s.setWeight));
    const displayWeight = Math.max(exercise.exeMaxWeight ?? 0, sessionMaxWeight);
    const displayDate = saved ? new Date().toDateString() : exerciseDate;

    const updateSet = (index: number, field: SetField, value: number) => {
        setSets((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    };

    const addSet = () => {
        setSets((prev) => {
            const last = prev[prev.length - 1];
            return [...prev, { setWeight: last?.setWeight ?? 0, setReps: last?.setReps ?? 0, setOrder: prev.length + 1 }];
        });
    };

    const removeSet = (index: number) => {
        setSets((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, setOrder: i + 1 })));
    };

    const handleSave = async () => {
        if (sets.length === 0 || sets.every((s) => s.setWeight === 0 && s.setReps === 0)) {
            Alert.alert('Add a set', 'Enter at least one set with weight or reps.');
            return;
        }

        try {
            setSaving(true);
            const { success, personalRecords } = await addExerciseHistory(exercise, sets, comment);
            if (success) {
                setSaved(true);
                onLogged();
                if (personalRecords.length > 0) onPersonalRecords(personalRecords);
            } else {
                Alert.alert('Error', 'Failed to save sets. Please try again.');
            }
        } catch (error) {
            console.error('Error saving sets:', error);
            Alert.alert('Error', 'Failed to save sets. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={Styles.card}>
            <TouchableOpacity
                onPress={editMode ? undefined : onToggleExpand}
                activeOpacity={editMode ? 1 : 0.7}
                disabled={editMode}
            >
                <View style={styles.headerRow}>
                    <View style={styles.headerInfo}>
                        <View style={styles.nameRow}>
                            {saved && (
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={16}
                                    color={Theme.colors.green}
                                />
                            )}
                            <Text style={styles.exerciseName}>{exercise.exeName}</Text>
                        </View>
                        <MetaRow
                            items={[
                                { icon: muscleGroupIcon(exercise.exeMuscleGroup), label: muscleGroupLabel(exercise.exeMuscleGroup) },
                                { icon: 'weight-kilogram', label: `${displayWeight} kg` },
                                { icon: 'calendar-range', label: displayDate },
                            ]}
                        />
                    </View>
                    {editMode ? (
                        <View style={styles.exerciseActions}>
                            <TouchableOpacity
                                disabled={isFirst}
                                onPress={onMoveUp}
                                style={styles.actionButton}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialCommunityIcons
                                    name='arrow-up'
                                    size={20}
                                    color={isFirst ? Theme.colors.textDisabled : Theme.colors.textPrimary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                disabled={isLast}
                                onPress={onMoveDown}
                                style={styles.actionButton}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialCommunityIcons
                                    name='arrow-down'
                                    size={20}
                                    color={isLast ? Theme.colors.textDisabled : Theme.colors.textPrimary}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onDelete}
                                style={styles.actionButton}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialCommunityIcons name='trash-can-outline' size={20} color={Theme.colors.danger} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <MaterialCommunityIcons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={24}
                            color={Theme.colors.textMuted}
                        />
                    )}
                </View>
            </TouchableOpacity>

            {expanded && !editMode && (
                <View style={styles.expandedContent}>
                    {lastSessionLoading ? (
                        <Text style={styles.lastSessionText}>Loading last time...</Text>
                    ) : lastSession ? (
                        <View style={styles.lastSessionRow}>
                            <MaterialCommunityIcons name="history" size={14} color={Theme.colors.textMuted} />
                            <Text style={styles.lastSessionText} numberOfLines={1}>
                                Last time ({new Date(lastSession.exhDate).toDateString()}): {' '}
                                {lastSession.exhSets.map((s) => `${s.setWeight}×${s.setReps}`).join(', ')}
                            </Text>
                        </View>
                    ) : null}
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/exercise/exerciseDetails', params: { exerciseId: exercise.id } })}
                        style={styles.fullHistoryLink}
                    >
                        <Text style={styles.fullHistoryLinkText}>View full history</Text>
                        <MaterialCommunityIcons name="chevron-right" size={14} color={Theme.colors.accent} />
                    </TouchableOpacity>

                    <SetTable
                        sets={sets}
                        editable
                        onChange={updateSet}
                        onRemove={removeSet}
                        onAdd={addSet}
                    />

                    <TextInput
                        style={styles.commentInput}
                        placeholder="Add a note (optional)"
                        placeholderTextColor={Theme.colors.textMuted}
                        value={comment}
                        onChangeText={setComment}
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={Theme.colors.textOnAccent} />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check" size={18} color={Theme.colors.textOnAccent} />
                                <Text style={styles.saveButtonText}>
                                    Log {sets.length} set{sets.length !== 1 ? 's' : ''}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Theme.spacing.sm,
    },
    headerInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    exerciseName: {
        ...Theme.typography.cardTitle,
        flexShrink: 1,
    },
    exerciseActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
    },
    actionButton: {
        padding: Theme.spacing.xs,
    },
    expandedContent: {
        marginTop: Theme.spacing.md,
        paddingTop: Theme.spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Theme.colors.divider,
    },
    lastSessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        marginBottom: Theme.spacing.xs,
    },
    lastSessionText: {
        ...Theme.typography.caption,
        flex: 1,
    },
    fullHistoryLink: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 2,
        marginBottom: Theme.spacing.md,
    },
    fullHistoryLinkText: {
        color: Theme.colors.accent,
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.semibold,
    },
    commentInput: {
        backgroundColor: Theme.colors.surfaceSunken,
        color: Theme.colors.textPrimary,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        fontSize: Theme.fontSize.sm,
        marginTop: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        backgroundColor: Theme.colors.accent,
        borderRadius: Theme.borderRadius.md,
        paddingVertical: Theme.spacing.sm,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: Theme.colors.textOnAccent,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
});
