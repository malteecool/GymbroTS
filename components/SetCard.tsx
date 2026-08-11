import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Card, Divider } from '@rneui/themed';
import { Theme, Styles } from '../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Exercise } from '../interfaces/Exercise.Interface';
import { Set } from '../interfaces/Set.Interface';
import { ExerciseHistory } from '../interfaces/ExerciseHistory.Interface';
import { LoadingIndicator } from './ui/LoadingIndicator';

const LABEL_WEIGHT = "WEIGHT";
const LABEL_REPS = "REPS";

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

        const handleChangeWeight = (i: number, value: string) => {
            setSets(prevSets => {
                const updated = [...prevSets];
                updated[i] = {
                    ...updated[i],
                    setWeight: parseInt(value) || 0
                };
                return updated;
            });
        };

        const handleChangeReps = (i: number, value: string) => {
            setSets(prevSets => {
                const updated = [...prevSets];
                updated[i] = {
                    ...updated[i],
                    setReps: parseInt(value) || 0
                };
                return updated;
            });
        };

        const onAddSet = () => {
            setSets([...sets, {
                setWeight: 0,
                setReps: 0,
                setOrder: sets.length + 1
            }]);
        };

        const onRemoveSet = (index: number) => {
            const newSets = sets.filter((_, i) => i !== index);
            setSets(newSets.map((set, i) => ({ ...set, setOrder: i + 1 })));
        };

        const load = () => {
            if (exerciseHistory) {
                setDate(new Date(exerciseHistory.exhDate).toDateString());
                setSets(exerciseHistory.exhSets);
                console.log(exerciseHistory.exhSets);
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
                <Card
                    containerStyle={styles.card}
                >
                    <Card.Title style={styles.cardTitle}>
                        <Text style={styles.dateText}>{date}</Text>
                    </Card.Title>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerText}>{LABEL_WEIGHT}</Text>
                        <Text style={styles.headerText}>{LABEL_REPS}</Text>
                        {editable && <View style={{width: '10%'}} />}
                    </View>
                    {sets.map((set, i) => {
                        return (
                            <View key={i} style={styles.setRow}>
                                <Divider width={1} color={Theme.colors.lessDark} />
                                <View style={styles.setContent}>
                                    <View style={editable ? {...styles.inputContainer} : {...styles.inputContainer, width: '50%'}}>
                                        <TextInput
                                            keyboardType='number-pad'
                                            onChangeText={value => handleChangeWeight(i, value)}
                                            style={styles.input}
                                            placeholder={String(set.setWeight)}
                                            placeholderTextColor={Theme.colors.dark + '80'}
                                            editable={editable}
                                            defaultValue={set.setWeight > 0 ? String(set.setWeight) : ''}
                                        />
                                    </View>
                                    <View style={editable ? styles.inputContainer : {width: '50%'}}>
                                        <TextInput
                                            keyboardType='number-pad'
                                            onChangeText={value => handleChangeReps(i, value)}
                                            style={styles.input}
                                            placeholder={String(set.setReps)}
                                            placeholderTextColor={Theme.colors.dark + '80'}
                                            editable={editable}
                                            defaultValue={set.setReps > 0 ? String(set.setReps) : ''}
                                        />
                                    </View>
                                    {editable && sets.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() => onRemoveSet(i)}
                                            style={styles.removeButton}
                                        >
                                            <MaterialCommunityIcons
                                                name="trash-can"
                                                size={20}
                                                color={'#123'}
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}

                    {editable && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={onAddSet}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="plus-circle"
                                size={20}
                                color={Theme.colors.font}
                            />
                            <Text style={styles.addButtonText}>Add set</Text>
                        </TouchableOpacity>
                    )}
                </Card>
                {(editable || exerciseHistory?.exhComment) && (
                    <View style={styles.commentContainer}>
                        <MaterialCommunityIcons
                            size={22}
                            color={Theme.colors.font}
                            name="comment"
                        />
                        <TextInput
                            style={styles.commentInput}
                            onChangeText={(text) => setComment(text)}
                            placeholder={exerciseHistory?.exhComment || "Comment"}
                            placeholderTextColor={Theme.colors.font + '80'}
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
    card: {
        ...Styles.setCard,
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    cardTitle: {
        ...Styles.cardTitle,
        color: Theme.colors.font,
        alignSelf: 'flex-start',
        paddingHorizontal: Theme.spacing.md,
        fontSize: Theme.fontSize.xl,
        backgroundColor: Theme.colors.green,
        marginLeft: 0,
        marginBottom: Theme.spacing.xs,
    },
    dateText: {
        fontSize: Theme.fontSize.xl,
        color: Theme.colors.font,
        fontWeight: Theme.fontWeight.bold,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: Theme.spacing.xs,
    },
    headerText: {
        ...Styles.detailText,
        fontWeight: Theme.fontWeight.bold,
        width: '40%',
        textAlign: 'center',
    },
    setRow: {
        backgroundColor: Theme.colors.font,
    },
    setContent: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: Theme.spacing.xs,
    },
    inputContainer: {
        width: '40%',
        borderRightWidth: 1,
        borderColor: Theme.colors.lessDark,
        alignItems: 'center',
        paddingVertical: Theme.spacing.xs,
    },
    input: {
        ...Styles.detailText,
        color: Theme.colors.dark,
        textAlign: 'center',
        width: '100%',
        fontSize: Theme.fontSize.md,
    },
    removeButton: {
        padding: Theme.spacing.xs,
        width: '10%',
        alignItems: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.green,
        padding: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        margin: Theme.spacing.xs,
        marginTop: Theme.spacing.sm,
        gap: Theme.spacing.xs,
    },
    addButtonText: {
        ...Styles.detailText,
        paddingVertical: 0,
        marginBottom: 0,
        textAlign: 'center',
        fontWeight: Theme.fontWeight.semibold,
    },
    commentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: Theme.spacing.sm,
        paddingVertical: Theme.spacing.xs,
        marginHorizontal: Theme.spacing.xs,
        marginTop: Theme.spacing.xs,
    },
    commentInput: {
        flex: 1,
        marginLeft: Theme.spacing.sm,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        paddingVertical: Theme.spacing.xs,
        minHeight: 40,
    },
});