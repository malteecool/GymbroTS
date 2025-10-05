import { SetCard, SetsRef } from "../../components/SetCard";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { addExerciseHistory, getExerciseById } from "../../services/ExerciseService.Service";
import Styles from "../../Styles";
import { Button } from "@rneui/themed";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function addSetScreen() {

    const { exerciseId } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(false);
    const [comment, setComment] = useState<string>("");
    const [exercise, setExercise] = useState<Exercise>();

    const setsRef = useRef<SetsRef>(null);

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
            if (setsRef.current) {
                setLoading(true);
                const sets = setsRef.current?.getSets();
                await addExerciseHistory(exercise, sets, comment)
            }
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
            <Stack.Screen
                    options={{
                        title: exercise?.exe_name,
                    }}
                />
            <View style={{ flex: 1, }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                    <SetCard editable={true} exercise={exercise} commentCallback={setComment} ref={setsRef} />
                </ScrollView>
                <View style={{ position: 'absolute', width: '100%', bottom: 0 }}>
                    <Button title='Complete' onPress={onAddHistory} buttonStyle={{ margin: 10, height: 40 }} />
                </View>
            </View>
        </View>
    )

}