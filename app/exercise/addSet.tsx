import { SetCard } from "@/components/SetCard";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import emitter from "@/hooks/CustomEventEmitter";
import { Exercise } from "@/interfaces/Exercise.Interface";
import { Set } from "@/interfaces/Set.Interface";
import { addExerciseHistory, getExerciseById } from "@/services/ExerciseService.Service";
import Styles from "@/Styles";
import { Button } from "@rneui/themed";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

export default function addSetScreen() {

    const { exerciseId } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(false);
    const [setData, setSetData] = useState<Set[]>([]); // setData might not be the best variable naming.
    const [comment, setComment] = useState<string>("");
    const [exercise, setExercise] = useState<Exercise>();

    const setCallback = (setData: Set[]) => {
        setSetData(setData);
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
            await addExerciseHistory(exercise, setData, comment)
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
                    <SetCard historyId={exercise.id} exercise={exercise} setCallback={setCallback} commentCallback={setComment} />
                </ScrollView>
                <View style={{ position: 'absolute', width: '100%', bottom: 0 }}>
                    <Button title='Complete' onPress={onAddHistory} buttonStyle={{ margin: 10, height: 40 }} />
                </View>
            </View>
        </View>
    )

}