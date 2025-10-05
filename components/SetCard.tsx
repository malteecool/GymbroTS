import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card, Divider } from '@rneui/themed';
import Styles from '../Styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Exercise } from '../interfaces/Exercise.Interface';
import { Set } from '../interfaces/Set.Interface';
import { ExerciseHistory } from '../interfaces/ExerciseHistory.Interface';
import { LoadingIndicator } from './ui/LoadingIndicator';

export interface SetsRef {
    getSets: () => Set[];
}

interface SetCardProps {
    editable: boolean;
    exercise: Exercise;
    exerciseHistory?: ExerciseHistory
    commentCallback?: (comment: string) => void;
}

export const SetCard = React.forwardRef<SetsRef, SetCardProps>(
    ({ editable, exerciseHistory, commentCallback }, ref) => {

        const [sets, setSets] = useState<Set[]>([]);
        const [isLoading, setLoading] = useState<boolean>(true);

        useImperativeHandle(ref, () => ({
            getSets: () => sets
        }));

        const onAddSet = () => {
            setSets([...sets, { set_weight: 0, set_reps: 0, set_order: sets.length + 1 }]);
        };

        const onRemoveSet = (index: number) => {
            let newSets = sets;
            newSets.splice(index, 1);
            // Need to trigger a rerender of the updates state.
            setSets([...newSets]);
        }

        const load = () => {
            if (exerciseHistory) {
                setSets(exerciseHistory.exh_sets);
                console.log(exerciseHistory.exh_sets)
            } else {
                setSets([{ set_weight: 0, set_reps: 0, set_order: 1 }])
            }
            setLoading(false);
        }

        useEffect(() => {
            load();
        }, []);

        if (isLoading) {
            return (
                <LoadingIndicator text='loading...' />
            )
        }

        return (
            <View style={Styles.dark}>
                <Card containerStyle={{
                    ...Styles.card,
                    paddingHorizontal: 0,
                    paddingBottom: 0,
                    borderWidth: 1,
                    backgroundColor: Styles.green.backgroundColor,
                    borderColor: Styles.lessDark.backgroundColor
                }}>
                    <Card.Title style={{
                        ...Styles.cardTitle,
                        color: '#E5E3D4',
                        alignSelf: 'flex-start',
                        paddingHorizontal: 16,
                        fontSize: 25,
                        backgroundColor: Styles.green.backgroundColor,
                        marginLeft: 0
                    }}>
                        <Text style={{ fontSize: 30 }}>{new Date().toDateString()}</Text>
                    </Card.Title>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: 5, }}>
                        <Text style={{ marginHorizontal: 0, ...Styles.detailText, fontWeight: 'bold', width: '50%', textAlign: 'center' }}>{"WEIGHT"}</Text>
                        <Text style={{ marginHorizontal: 0, ...Styles.detailText, fontWeight: 'bold', width: '50%', textAlign: 'center' }}>{"REPS"}</Text>
                    </View>
                    {
                        sets.map((set, i) => {
                            return (
                                <View key={i} style={{ backgroundColor: Styles.fontColor.color }}>
                                    <Divider width={1} color={Styles.lessDark.backgroundColor} />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', width: '100%' }}>

                                        <TextInput keyboardType='numeric' onChangeText={value => set.set_weight = parseInt(value)}
                                            style={{ ...Styles.detailText, color: Styles.dark.backgroundColor, width: '50%', borderRightWidth: 1, borderColor: Styles.lessDark.backgroundColor, textAlign: 'center' }}
                                            placeholder={String(set.set_weight)}
                                            placeholderTextColor={Styles.dark.backgroundColor}
                                            editable={editable}
                                            multiline={true}
                                        />

                                        <TextInput keyboardType='numeric' onChangeText={value => set.set_reps = parseInt(value)}
                                            style={{ ...Styles.detailText, color: Styles.dark.backgroundColor, width: '50%', borderRightWidth: 1, borderColor: Styles.lessDark.backgroundColor, textAlign: 'center' }}
                                            placeholder={String(set.set_reps)}
                                            placeholderTextColor={Styles.dark.backgroundColor}
                                            editable={editable}
                                            multiline={true}
                                        />

                                        <TouchableOpacity onPress={() => onRemoveSet(i)} style={Styles.trashIcon}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={20} style={Styles.iconDark} />
                                        </TouchableOpacity>
                                    </View>

                                </View>
                            )
                        })
                    }

                    {editable &&
                        <TouchableOpacity style={{ backgroundColor: Styles.green.backgroundColor, padding: 0, borderRadius: 10, margin: 5 }}
                            onPress={onAddSet}><Text style={{ ...Styles.detailText, paddingVertical: 6, marginBottom: 0, textAlign: 'center' }}>Add set</Text></TouchableOpacity>
                    }

                </Card>
                {
                    (editable || exerciseHistory?.exh_comment) &&
                    <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#1c1a1a',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        marginHorizontal: 5,
                        marginTop: 5
                    }}
                >
                    <MaterialCommunityIcons
                        size={22}
                        color={Styles.fontColor.color}
                        name="comment"
                    />
                    <TextInput
                        style={{
                            flex: 1,
                            marginLeft: 10,
                            color: Styles.fontColor.color,
                            fontSize: 18,
                            paddingVertical: 5,
                        }}
                        onChangeText={commentCallback}
                        placeholder={exerciseHistory?.exh_comment ? exerciseHistory.exh_comment : "Comment"}
                        placeholderTextColor={Styles.fontColor.color}
                        editable={editable}
                    />
                </View>
                }
            </View>
        )
    })

