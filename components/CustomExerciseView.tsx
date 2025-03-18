import React, { useEffect, useState } from "react";
import { getExercises } from "@/services/ExerciseService.Service";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View } from "react-native";
import { Card } from '@rneui/themed';
import Styles from "@/styles";
import { LoadingIndicator } from "./ui/LoadingIndicator";
import { Exercise } from "@/interfaces/Exercise.Interface";
import { WorkoutExercise } from "@/interfaces/WorkoutExercise.Interface";
import { Workout } from "@/interfaces/Workout.Interface";


export function CustomExerciseView(props: { userId: string, childToParent: (selectedExercises: WorkoutExercise[]) => void }) {

    const {userId, childToParent } = props;

    const [data, setData] = useState([]);
    const [isLoading, setLoading] = useState(false);
    const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);

    useEffect(() => {
        const getAvailableExericses = async () => {
            setLoading(true);
            const fetchedData = await getExercises(userId)
            setData(fetchedData);
            setLoading(false);
        }
        getAvailableExericses();
    }, []);

    // introduces alot of rerenders on the view but fixes the problem with not all elements in the array gets passed to the parent.
    useEffect(() => {
        childToParent(selectedExercises);
    }, [selectedExercises]);

    let start = 0;

    const addSelectedExercise = (exercise: Exercise) => {
        if (!selectedExercises.map((x: WorkoutExercise) => x.id).includes(exercise.id)) {
            setSelectedExercises((selectedExercises: WorkoutExercise[])  => [...selectedExercises, { woe_id: exercise.id, ordinal: selectedExercises.length, ...exercise }]);
            start = start + 1;
        } else {
            setSelectedExercises(selectedExercises.filter((item: any) => item["id"] !== exercise.id));
        }
    }

    const selectedStyle = StyleSheet.create({
        active: { backgroundColor: '#0C7C59' },
        inactive: { backgroundColor: '#1c1a1a' }
    });

    if (isLoading) {
        return (
            <LoadingIndicator text={''} />
        )
    }

    return (
        <View style={{ flex: 1 }}>
            {
                isLoading ? <ActivityIndicator style={Styles.activityIndicator} /> :
                    (
                        <ScrollView contentContainerStyle={{ paddingBottom: 75, backgroundColor: Styles.dark.backgroundColor, borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>
                            {
                                data.map((item: Exercise, i) => {
                                    return (<View key={i}>
                                        <TouchableOpacity onPress={() => { addSelectedExercise(item) }}>
                                            <Card key={i} containerStyle={[Styles.smallCard,
                                            selectedExercises.map(x => x.id).includes(item.id) ? selectedStyle.active : selectedStyle.inactive]}>
                                                <Text style={{ ...Styles.detailText, margin: 0 }}>{item.exe_name}</Text>
                                            </Card>
                                        </TouchableOpacity>
                                    </View>)
                                })
                            }
                        </ScrollView>
                    )
            }
        </View>
    )
}

export default CustomExerciseView;