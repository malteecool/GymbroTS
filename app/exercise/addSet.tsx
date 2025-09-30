import { Card2 } from "@/components/CustomCard";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import emitter from "@/hooks/CustomEventEmitter";
import { Exercise } from "@/interfaces/Exercise.Interface";
import { Set } from "@/interfaces/Set.Interface";
import { addExerciseHistory, getExerciseById } from "@/services/ExerciseService.Service";
import Styles from "@/Styles";
import { Button } from "@rneui/themed";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function addSetScreen() {

    const { exerciseId } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(false);
    const [data, setData] = useState<Set[]>([]);
    const [exercise, setExercise] = useState<Exercise>();

    const parentCallback = (childData: Set[]) => {
        setData(childData);
    }

    const load = async () => {
        setLoading(true);
        try {
            const e = await getExerciseById(exerciseId as string);
            setExercise(e);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }

    }

    useEffect(() => {
        load();
    }, []);

    const onAddHistory = async () => {
        try {
            setLoading(true);
            await addExerciseHistory(exercise, data)
        }

        catch (error) {
            console.log(error);
        }
        finally {
            emitter.emit('setEvent', 0);
            emitter.emit('workoutEvent', 0);
            setLoading(false);
            router.back();
        }
    }

    if (isLoading) {
        return (
            <LoadingIndicator text={''} />
        )
    }

    if (!exercise) {
        return (
            <View style={{ flex: 1, ...Styles.dark }}>
                <Text>Could not load the exercise</Text>
            </View>
        )
    }

    return (
        <View style={{ flex: 1, ...Styles.dark }}>
            <View style={{ flex: 1, }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                    <Card2 historyId={exercise.id} exercise={exercise} parentCallback={parentCallback} />
                </ScrollView>
                <View style={{ position: 'absolute', width: '100%', bottom: 0 }}>
                    <Button title='Complete' onPress={onAddHistory} buttonStyle={{ margin: 10, height: 40 }} />
                </View>
            </View>
        </View>
    )

}