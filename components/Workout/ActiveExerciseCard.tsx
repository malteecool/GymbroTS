import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card } from '@rneui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme, Styles } from '../../constants/Theme';
import { NumberStepper } from '../ui/NumberStepper';
import { addExerciseHistory, getLastLoggedSession } from '../../services/ExerciseService.Service';
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
}

export function ActiveExerciseCard({
    exercise, isFirst, isLast, editMode, expanded, alreadyLoggedToday,
    onToggleExpand, onMoveUp, onMoveDown, onDelete, onLogged,
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

    const updateSet = (index: number, field: 'setWeight' | 'setReps', value: number) => {
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
            const success = await addExerciseHistory(exercise, sets, comment);
            if (success) {
                setSaved(true);
                onLogged();
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
        <Card containerStyle={Styles.card}>
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
                                    style={styles.savedIcon}
                                />
                            )}
                            <Text style={styles.exerciseName}>{exercise.exeName}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <MaterialCommunityIcons name="weight-kilogram" size={16} color={Theme.colors.font} />
                                <Text style={styles.metaText}>{displayWeight}kg</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <MaterialCommunityIcons name="calendar-range" size={16} color={Theme.colors.font} />
                                <Text style={styles.metaText}>{displayDate}</Text>
                            </View>
                        </View>
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
                                    color={isFirst ? Theme.colors.font + '40' : Theme.colors.font}
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
                                    color={isLast ? Theme.colors.font + '40' : Theme.colors.font}
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
                            color={Theme.colors.font + '80'}
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
                            <MaterialCommunityIcons name="history" size={14} color={Theme.colors.font + '80'} />
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

                    <View style={styles.setsHeaderRow}>
                        <Text style={[styles.colLabel, styles.setIndexCol]}>SET</Text>
                        <Text style={styles.colLabel}>WEIGHT</Text>
                        <Text style={styles.colLabel}>REPS</Text>
                        <View style={styles.removeCol} />
                    </View>
                    {sets.map((set, i) => (
                        <View key={i} style={styles.setRow}>
                            <Text style={[styles.setIndex, styles.setIndexCol]}>{i + 1}</Text>
                            <View style={styles.stepperCol}>
                                <NumberStepper value={set.setWeight} step={2.5} onChange={(v) => updateSet(i, 'setWeight', v)} />
                            </View>
                            <View style={styles.stepperCol}>
                                <NumberStepper value={set.setReps} step={1} onChange={(v) => updateSet(i, 'setReps', v)} />
                            </View>
                            <TouchableOpacity
                                onPress={() => removeSet(i)}
                                style={styles.removeCol}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialCommunityIcons name="close" size={16} color={Theme.colors.font + '80'} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.addSetButton} onPress={addSet} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="plus" size={16} color={Theme.colors.font} />
                        <Text style={styles.addSetText}>Add set</Text>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.commentInput}
                        placeholder="Add a note (optional)"
                        placeholderTextColor={Theme.colors.font + '60'}
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
                            <ActivityIndicator size="small" color={Theme.colors.dark} />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check" size={18} color={Theme.colors.dark} />
                                <Text style={styles.saveButtonText}>
                                    Log {sets.length} set{sets.length !== 1 ? 's' : ''}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    savedIcon: {
        marginRight: Theme.spacing.xs,
    },
    exerciseName: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
        marginLeft: Theme.spacing.sm,
    },
    metaRow: {
        flexDirection: 'row',
        marginTop: Theme.spacing.xs,
        marginLeft: Theme.spacing.sm,
        gap: Theme.spacing.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
    },
    metaText: {
        ...Styles.fontColor,
        fontSize: Theme.fontSize.sm,
    },
    exerciseActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        marginLeft: Theme.spacing.sm,
    },
    actionButton: {
        padding: Theme.spacing.xs,
    },
    expandedContent: {
        marginTop: Theme.spacing.md,
        paddingTop: Theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.dark,
    },
    lastSessionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        marginBottom: Theme.spacing.xs,
    },
    lastSessionText: {
        flex: 1,
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.xs,
    },
    fullHistoryLink: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 2,
        marginBottom: Theme.spacing.sm,
    },
    fullHistoryLinkText: {
        color: Theme.colors.accent,
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.semibold,
    },
    setsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        marginBottom: Theme.spacing.xs,
    },
    colLabel: {
        flex: 1,
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.xs,
        fontWeight: Theme.fontWeight.semibold,
        textAlign: 'center',
    },
    setIndexCol: {
        flex: 0,
        width: 24,
        textAlign: 'center',
    },
    stepperCol: {
        flex: 1,
    },
    removeCol: {
        flex: 0,
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        marginBottom: Theme.spacing.sm,
    },
    setIndex: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    addSetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginBottom: Theme.spacing.sm,
    },
    addSetText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
    },
    commentInput: {
        backgroundColor: Theme.colors.dark,
        color: Theme.colors.font,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        fontSize: Theme.fontSize.sm,
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
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
});
