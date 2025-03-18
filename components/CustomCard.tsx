import React, { Component, useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card, Divider } from '@rneui/themed';
import Styles from '@/styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export function Card2(props: { historyId: string, parentCallback: (sets:any) => void }) {

    const { historyId, parentCallback } = props;

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
            <Card containerStyle={Styles.card}>
                {
                    sets.map((set, i) => {
                        return (
                            <View key={i}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', width: '100%' }}>
                                    <Text style={{ marginStart: 0, padding: 10, ...Styles.fontColor, fontSize: 18 }}>{i + 1}</Text>

                                    <TextInput keyboardType='numeric' onChangeText={value => set.set_weight = parseInt(value)}
                                        style={{ padding: 5, marginStart: 20, textAlign: 'right', width: '20%', ...Styles.fontColor, fontSize: 18 }}
                                        placeholder={String(set.set_weight)}
                                        placeholderTextColor={Styles.fontColor.color}
                                    />

                                    <Text style={{ paddingHorizontal: 0, ...Styles.fontColor, fontWeight: 'bold', fontSize: 18 }}>KG</Text>

                                    <TextInput keyboardType='numeric' onChangeText={value => set.set_reps = parseInt(value)}
                                        style={{ padding: 5, marginStart: 20, width: '20%', textAlign: 'right', ...Styles.fontColor, fontSize: 18 }}
                                        placeholder={String(set.set_reps)}
                                        placeholderTextColor={Styles.fontColor.color}
                                    />

                                    <Text style={{ paddingHorizontal: 0, ...Styles.fontColor, fontWeight: 'bold', fontSize: 18 }}>Reps</Text>
                                    <TouchableOpacity onPress={() => onRemoveSet(i)} style={Styles.trashIcon}>
                                        <MaterialCommunityIcons name="trash-can-outline" size={20} style={Styles.icon} />
                                    </TouchableOpacity>
                                </View>
                                <Divider color={Styles.yellow.backgroundColor} />
                            </View>
                        )
                    })
                }
                <TouchableOpacity style={{ backgroundColor: Styles.green.backgroundColor, padding: 0, borderRadius: 10, marginTop: 15 }}
                    onPress={onAddSet}><Text style={{ ...Styles.detailText, paddingVertical: 6, marginBottom: 0, textAlign: 'center' }}>Add set</Text></TouchableOpacity>

            </Card>
        </View>
    )
}

