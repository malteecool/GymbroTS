import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { Theme, Styles } from '../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Exercise } from '../interfaces/Exercise.Interface';
import { Set } from '../interfaces/Set.Interface';
import { ExerciseHistory } from '../interfaces/ExerciseHistory.Interface';
import { LoadingIndicator } from './ui/LoadingIndicator';
import { SetField, SetTable } from './Workout/SetTable';

export interface SetsRef {
    getSets: () => Set[];
    getComment: () => string;
}

interface SetCardProps {
    editable: boolean;
    exercise: Exercise;
    exerciseHistory?: ExerciseHistory;
}

export const SetCard = React.forwardRef<SetsRef, SetCardProps>(
    ({ editable, exerciseHistory }, ref) => {
        const [sets, setSets] = useState<Set[]>([]);
        const [comment, setComment] = useState<string>("");
        const [isLoading, setLoading] = useState<boolean>(true);
        const [date, setDate] = useState<string>(new Date().toDateString());

        useImperativeHandle(ref, () => ({
            getSets: () => sets,
            getComment: () => comment
        }));

        const updateSet = (index: number, field: SetField, value: number) => {
            setSets((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
        };

        const onAddSet = () => {
            setSets((prev) => {
                const last = prev[prev.length - 1];
                return [...prev, {
                    setWeight: last?.setWeight ?? 0,
                    setReps: last?.setReps ?? 0,
                    setOrder: prev.length + 1,
                }];
            });
        };

        const onRemoveSet = (index: number) => {
            const newSets = sets.filter((_, i) => i !== index);
            setSets(newSets.map((set, i) => ({ ...set, setOrder: i + 1 })));
        };

        const load = () => {
            if (exerciseHistory) {
                setDate(new Date(exerciseHistory.exhDate).toDateString());
                setSets(exerciseHistory.exhSets);
                setComment(exerciseHistory.exhComment || "");
            } else {
                setSets([{ setWeight: 0, setReps: 0, setOrder: 1 }]);
            }
            setLoading(false);
        };

        useEffect(() => {
            load();
        }, []);

        if (isLoading) {
            return <LoadingIndicator text='Loading...' />;
        }

        return (
            <View style={styles.container}>
                <View style={Styles.card}>
                    <View style={styles.dateRow}>
                        <View style={styles.dateGroup}>
                            <MaterialCommunityIcons name="calendar" size={14} color={Theme.colors.textMuted} />
                            <Text style={styles.dateText}>{date}</Text>
                        </View>
                        <View style={styles.countPill}>
                            <Text style={styles.countText}>
                                {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                            </Text>
                        </View>
                    </View>

                    <SetTable
                        sets={sets}
                        editable={editable}
                        onChange={updateSet}
                        onRemove={onRemoveSet}
                        onAdd={onAddSet}
                    />
                </View>

                {(editable || exerciseHistory?.exhComment) && (
                    <View style={styles.commentContainer}>
                        <MaterialCommunityIcons
                            size={16}
                            color={Theme.colors.textMuted}
                            name="comment-outline"
                        />
                        <TextInput
                            style={styles.commentInput}
                            onChangeText={(text) => setComment(text)}
                            placeholder={exerciseHistory?.exhComment || "Add a note (optional)"}
                            placeholderTextColor={Theme.colors.textMuted}
                            editable={editable}
                            defaultValue={exerciseHistory?.exhComment || ''}
                            multiline
                        />
                    </View>
                )}
            </View>
        );
    }
);

SetCard.displayName = 'SetCard';

const styles = StyleSheet.create({
    container: {
        backgroundColor: Theme.colors.background,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Theme.spacing.sm,
        marginBottom: Theme.spacing.md,
        paddingBottom: Theme.spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.divider,
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        flexShrink: 1,
    },
    dateText: {
        ...Theme.typography.bodyStrong,
        fontSize: Theme.fontSize.sm,
    },
    countPill: {
        paddingHorizontal: Theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: Theme.borderRadius.round,
        backgroundColor: Theme.colors.neutralSoft,
    },
    countText: {
        ...Theme.typography.caption,
        color: Theme.colors.textSecondary,
        fontWeight: Theme.fontWeight.semibold,
    },
    commentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.xs,
        marginTop: Theme.spacing.xs,
        marginHorizontal: Theme.spacing.sm,
        gap: Theme.spacing.sm,
    },
    commentInput: {
        flex: 1,
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.sm,
        paddingVertical: Theme.spacing.xs,
        minHeight: 36,
    },
});
