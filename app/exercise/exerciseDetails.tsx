import { SetCard } from "../../components/SetCard";
import { AddButton } from "../../components/ui/AddButton";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { ExerciseHistory } from "../../interfaces/ExerciseHistory.Interface";
import { getExerciseById, getHistory } from "../../services/ExerciseService.Service";
import Styles from "../../Styles";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

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

            const history: ExerciseHistory[] = await getHistory(exerciseId as string);
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
                                data.map((exerciseHistory: ExerciseHistory, i: number) => (
                                    <View>
                                        <SetCard editable={false} exercise={exercise!} exerciseHistory={exerciseHistory} commentCallback={undefined} ref={undefined} />
                                    </View>

                                ))
                            }
                        </ScrollView>)
                }
            </View>
            <AddButton
                navigation={{
                    pathname: '/exercise/addSet',
                    params: { exerciseId: exerciseId }
                }}
            />
        </View>
    );

}