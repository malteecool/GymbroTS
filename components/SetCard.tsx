import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Card } from '@rneui/themed';
import { Theme, Styles } from '../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Exercise } from '../interfaces/Exercise.Interface';
import { Set } from '../interfaces/Set.Interface';
import { ExerciseHistory } from '../interfaces/ExerciseHistory.Interface';
import { LoadingIndicator } from './ui/LoadingIndicator';
import { NumberStepper } from './ui/NumberStepper';

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

        const updateSet = (index: number, field: 'setWeight' | 'setReps', value: number) => {
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
                <Card containerStyle={Styles.card}>
                    <View style={styles.dateRow}>
                        <MaterialCommunityIcons name="calendar" size={16} color={Theme.colors.font + '80'} />
                        <Text style={styles.dateText}>{date}</Text>
                    </View>

                    <View style={styles.headerRow}>
                        <Text style={[styles.colLabel, styles.setIndexCol]}>SET</Text>
                        <Text style={styles.colLabel}>WEIGHT</Text>
                        <Text style={styles.colLabel}>REPS</Text>
                        {editable && <View style={styles.removeCol} />}
                    </View>

                    {sets.map((set, i) => (
                        <View key={i} style={styles.setRow}>
                            <Text style={[styles.setIndex, styles.setIndexCol]}>{i + 1}</Text>
                            {editable ? (
                                <>
                                    <View style={styles.stepperCol}>
                                        <NumberStepper value={set.setWeight} step={2.5} onChange={(v) => updateSet(i, 'setWeight', v)} />
                                    </View>
                                    <View style={styles.stepperCol}>
                                        <NumberStepper value={set.setReps} step={1} onChange={(v) => updateSet(i, 'setReps', v)} />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => onRemoveSet(i)}
                                        style={styles.removeCol}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <MaterialCommunityIcons name="close" size={16} color={Theme.colors.font + '80'} />
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.valueText}>{set.setWeight}kg</Text>
                                    <Text style={styles.valueText}>{set.setReps}</Text>
                                </>
                            )}
                        </View>
                    ))}

                    {editable && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={onAddSet}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="plus" size={16} color={Theme.colors.font} />
                            <Text style={styles.addButtonText}>Add set</Text>
                        </TouchableOpacity>
                    )}
                </Card>
                {(editable || exerciseHistory?.exhComment) && (
                    <View style={styles.commentContainer}>
                        <MaterialCommunityIcons
                            size={18}
                            color={Theme.colors.font + '80'}
                            name="comment-outline"
                        />
                        <TextInput
                            style={styles.commentInput}
                            onChangeText={(text) => setComment(text)}
                            placeholder={exerciseHistory?.exhComment || "Add a note (optional)"}
                            placeholderTextColor={Theme.colors.font + '60'}
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
        backgroundColor: Theme.colors.dark,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.xs,
        marginBottom: Theme.spacing.md,
        paddingBottom: Theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.dark,
    },
    dateText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    headerRow: {
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
    removeCol: {
        flex: 0,
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperCol: {
        flex: 1,
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
    valueText: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
        textAlign: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginTop: Theme.spacing.xs,
    },
    addButtonText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
    },
    commentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.xs,
        marginTop: Theme.spacing.sm,
        marginHorizontal: Theme.spacing.xs,
        gap: Theme.spacing.sm,
    },
    commentInput: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.sm,
        paddingVertical: Theme.spacing.xs,
        minHeight: 36,
    },
});
