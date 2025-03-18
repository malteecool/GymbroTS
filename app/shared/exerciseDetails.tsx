import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import emitter from "@/hooks/CustomEventEmitter";
import { Exercise } from "@/interfaces/Exercise.Interface";
import { ExerciseHistory } from "@/interfaces/ExerciseHistory.Interface";
import { getExerciseById, getFirebaseTimeStamp, getHistory } from "@/services/ExerciseService.Service";
import Styles from "@/styles";
import { Button, Card } from "@rneui/themed";
import { Divider } from "@rneui/themed";
import { router, Stack, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

const LABEL_WEIGHT = "WEIGHT";
const LABEL_REPS = "REPS"

export default function exerciseDetails() {

    const { exerciseId, workoutId } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isEmpty, setEmpty] = useState(true);
    const [exercise, setExercise] = useState<Exercise>();
    const [data, setData] = useState<ExerciseHistory[]>([]);

    const load = async () => {
        try {
            setLoading(true);

            const exercise = await getExerciseById(exerciseId as string);
            setExercise(exercise);

            const history = await getHistory(exerciseId as string);
            setData(history);

            setLoading(false);
            setEmpty(history.length == 0);
        }
        catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        const listener = (data: any) => {
            load();
        };
        emitter.on('setEvent', listener);

        return () => {
            emitter.off('setEvent', listener);
        }

    }, []);


    const _onRefresh = React.useCallback(() => {
        load();
    }, []);


    if (isLoading) {
        return (
            <LoadingIndicator text={''} />
        )
    }

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Styles.dark.backgroundColor }}>

            <Stack.Screen
                options={{
                    title: exercise?.exe_name,
                    
                }}
                
            />

            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                {
                    isEmpty ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Styles.dark.backgroundColor }}>
                            <Text style={Styles.fontColor}>No sets yet</Text>
                        </View>
                    ) : (
                        <ScrollView style={{ width: '100%' }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={_onRefresh} />}
                        >{
                                data.map((exercise: ExerciseHistory, i: number) => (
                                    <Card key={i} containerStyle={{
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
                                            <Text style={{ fontSize: 30 }}>{getFirebaseTimeStamp(exercise.exh_date.seconds, exercise.exh_date.nanoseconds).toDateString()}</Text>
                                        </Card.Title>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: 5, }}>
                                            <Text style={{ marginHorizontal: 0, ...Styles.detailText, fontWeight: 'bold', width: '50%', textAlign: 'center' }}>{LABEL_WEIGHT}</Text>
                                            <Text style={{ marginHorizontal: 0, ...Styles.detailText, fontWeight: 'bold', width: '50%', textAlign: 'center' }}>{LABEL_REPS}</Text>
                                        </View>
                                        {
                                            (exercise.exh_sets !== null && exercise.exh_sets !== undefined) &&
                                            exercise.exh_sets.map((set, i) => {
                                                return (
                                                    <View key={i} style={{ backgroundColor: Styles.fontColor.color }}>
                                                        <Divider width={1} color={Styles.lessDark.backgroundColor} />
                                                        <View style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-evenly',

                                                        }}>
                                                            <Text style={{ ...Styles.detailText, color: Styles.dark.backgroundColor, width: '50%', borderRightWidth: 1, borderColor: Styles.lessDark.backgroundColor, textAlign: 'center' }}>{set.set_weight}</Text>
                                                            <Text style={{ ...Styles.detailText, color: Styles.dark.backgroundColor, width: '50%', textAlign: 'center' }}>{set.set_reps}</Text>
                                                        </View>
                                                    </View>
                                                )
                                            })
                                        }
                                    </Card>
                                ))
                            }
                        </ScrollView>)
                }
            </View>
            <TouchableOpacity style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
            }}>
                <Button onPress={() => router.push({ pathname: '/(tabs)/exercise/addSet', params: { exerciseId: exerciseId } })}
                    title='+' titleStyle={{ fontSize: 24 }} buttonStyle={{ width: 60, height: 60, borderRadius: 30, borderColor: '#1c7bc7', backgroundColor: Styles.green.backgroundColor }} />
            </TouchableOpacity>
        </View>
    );

}