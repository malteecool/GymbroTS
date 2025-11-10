import React, { useEffect, useImperativeHandle, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card, Divider } from '@rneui/themed';
import Styles from '../Styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Exercise } from '../interfaces/Exercise.Interface';
import { Set } from '../interfaces/Set.Interface';
import { ExerciseHistory } from '../interfaces/ExerciseHistory.Interface';
import { LoadingIndicator } from './ui/LoadingIndicator';
import { getFirebaseTimeStamp } from '../services/ExerciseService.Service';
import Reanimated, {
    SharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';

const LABEL_WEIGHT = "WEIGHT";
const LABEL_REPS = "REPS"

export interface SetsRef {
    getSets: () => Set[];
    getComment: () => string;
}

interface SetCardProps {
    editable: boolean;
    exercise: Exercise;
    exerciseHistory?: ExerciseHistory
}

function RightAction(prog: SharedValue<number>, drag: SharedValue<number>) {
    const styleAnimation = useAnimatedStyle(() => {
        console.log('showRightProgress:', prog.value);
        console.log('appliedTranslation:', drag.value);

        return {
            transform: [{ translateX: drag.value + 50 }],
        };
    });

    return (
        <Reanimated.View style={styleAnimation}>
            <Text>Right action</Text>
        </Reanimated.View>
    );
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
                updated[i] = { ...updated[i], set_weight: parseInt(value) || 0 };
                return updated;
            });
        };

        const handleChangeReps = (i: number, value: string) => {
            setSets(prevSets => {
                const updated = [...prevSets];
                updated[i] = { ...updated[i], set_reps: parseInt(value) || 0 };
                return updated;
            });
        };

        const onAddSet = () => {
            setSets([...sets, { set_weight: 0, set_reps: 0, set_order: sets.length + 1 }]);
        };

        const onRemoveSet = (index: number) => {
            let newSets = sets;
            newSets.splice(index, 1);
            setSets([...newSets]);
        }

        const load = () => {
            if (exerciseHistory) {
                setDate(getFirebaseTimeStamp(exerciseHistory.exh_date.seconds, exerciseHistory.exh_date.nanoseconds).toDateString());
                setSets(exerciseHistory.exh_sets);
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
                        <Text style={{ fontSize: 30 }}>{date}</Text>
                    </Card.Title>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: 5, }}>
                        <Text style={{ marginHorizontal: 0, ...Styles.detailText, fontWeight: 'bold', width: '50%', textAlign: 'center' }}>{LABEL_WEIGHT}</Text>
                        <Text style={{ marginHorizontal: 0, ...Styles.detailText, fontWeight: 'bold', width: '50%', textAlign: 'center' }}>{LABEL_REPS}</Text>
                    </View>
                    {

                        sets.map((set, i) => {
                            return (
                                <View key={i} style={{ backgroundColor: Styles.fontColor.color }}>
                                    <Divider width={1} color={Styles.lessDark.backgroundColor} />

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', width: '100%' }}>

                                        <View style={{ width: '50%', borderRightWidth: 1, borderColor: Styles.lessDark.backgroundColor, alignItems: 'center' }}>
                                            <TextInput keyboardType='number-pad' onChangeText={value => handleChangeWeight(i, value)}
                                                style={{ ...Styles.detailText, color: Styles.dark.backgroundColor, textAlign: 'center', width: '10%' }}
                                                placeholder={String(set.set_weight)}
                                                placeholderTextColor={Styles.dark.backgroundColor}
                                                editable={editable}
                                                multiline={true}
                                            />
                                        </View>

                                        <TextInput keyboardType='number-pad' onChangeText={value => handleChangeReps(i, value)}
                                            style={{ ...Styles.detailText, color: Styles.dark.backgroundColor, width: '50%', borderRightWidth: 1, borderColor: Styles.lessDark.backgroundColor, textAlign: 'center' }}
                                            placeholder={String(set.set_reps)}
                                            placeholderTextColor={Styles.dark.backgroundColor}
                                            editable={editable}
                                            multiline={true}
                                        />
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
                            onChangeText={(text) => setComment(text)}
                            placeholder={exerciseHistory?.exh_comment ? exerciseHistory.exh_comment : "Comment"}
                            placeholderTextColor={Styles.fontColor.color}
                            editable={editable}
                        />
                    </View>
                }
            </View>
        )
    })

