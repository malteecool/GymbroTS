import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card, Divider } from '@rneui/themed';
import Styles from '@/Styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Stack } from 'expo-router';
import { Exercise } from '@/interfaces/Exercise.Interface';

export function Card2(props: { historyId: string, exercise: Exercise, parentCallback: (sets: any) => void }) {

    const { historyId, exercise, parentCallback } = props;

    const [sets, setSets] = useState([{ set_weight: 0, set_reps: 0 }]);

    useEffect(() => {
        parentCallback(sets);
    }, [sets]);

    const onAddSet = () => {
        setSets([...sets, { set_weight: 0, set_reps: 0 }]);
    };

    const onRemoveSet = (index: number) => {
        let newSets = sets;
        newSets.splice(index, 1);
        // Need to trigger a rerender of the updates state.
        setSets([...newSets]);
    }

    return (
        <View style={Styles.dark}>
            <Stack.Screen
                options={{
                    title: exercise?.exe_name,
                }}
            />
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
                                    />



                                    <TextInput keyboardType='numeric' onChangeText={value => set.set_reps = parseInt(value)}
                                        style={{ ...Styles.detailText, color: Styles.dark.backgroundColor, width: '50%', borderRightWidth: 1, borderColor: Styles.lessDark.backgroundColor, textAlign: 'center' }}
                                        placeholder={String(set.set_reps)}
                                        placeholderTextColor={Styles.dark.backgroundColor}
                                    />

                                    <TouchableOpacity onPress={() => onRemoveSet(i)} style={Styles.trashIcon}>
                                        <MaterialCommunityIcons name="trash-can-outline" size={20} style={Styles.iconDark} />
                                    </TouchableOpacity>
                                </View>

                            </View>
                        )
                    })
                }

                <TouchableOpacity style={{ backgroundColor: Styles.green.backgroundColor, padding: 0, borderRadius: 10, margin: 5 }}
                    onPress={onAddSet}><Text style={{ ...Styles.detailText, paddingVertical: 6, marginBottom: 0, textAlign: 'center' }}>Add set</Text></TouchableOpacity>

            </Card>
        </View>
    )
}

