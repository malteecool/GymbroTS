import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import emitter from "@/hooks/CustomEventEmitter";
import { Exercise } from "@/interfaces/Exercise.Interface";
import { User } from "@/interfaces/User.Interface";
import { addExercise, getDefaultExercises, getExercises } from "@/services/ExerciseService.Service";
import { getStordUserData } from "@/services/UserService.Service";
import { attachToWorkout } from "@/services/WorkoutService.Service";
import Styles from "@/Styles";
import { Card } from "@rneui/themed";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function addExerciseScreen() {

    const [isLoading, setLoading] = useState<Boolean>(false);
    const [search, setSearch] = useState('');
    const [filteredDataSource, setFilteredDataSource] = useState([]);
    const [masterDataSource, setMasterDataSource] = useState([]);
    const [user, setUser] = useState<User>();

    const { workoutId } = useLocalSearchParams();

    useEffect(() => {
        setLoading(true);
        const getAllExercises = async () => {
            const storedUser = await getStordUserData();
            setUser(storedUser);

            var docDataArray;
            if (workoutId) {
                docDataArray = await getExercises(user ? user.id : storedUser.id);
            } else {
                docDataArray = await getDefaultExercises();
            }
            setFilteredDataSource(docDataArray);
            setMasterDataSource(docDataArray);
            setLoading(false);
        };
        getAllExercises();
    }, []);

    const onAddExercise = async (name: string, exerciseId?: string) => {
        try {
            setLoading(true);
            /**
             * We first handle the case someone adds an existing exercise from the workout tab,
             * then adding a new exercise from the workout tab,
             * then adding a new exercise from the exercise tab.
             */
            if (workoutId && exerciseId) {
                console.log("attaching existing exercise to workout")
                await attachToWorkout(exerciseId, workoutId as string, masterDataSource.length);
            } else if (workoutId) {
                console.log("adding new exercise and attaching to workout");
                const newExercise = await addExercise(name, user!.id);
                await attachToWorkout(newExercise, workoutId as string, masterDataSource.length);
            } else {
                await addExercise(name, user!.id);
            }
        }
        catch (error) {
            console.log(error);
        }
        finally {
            setLoading(false);
            emitter.emit('exerciseEvent', 0);
            if (workoutId) {
                emitter.emit('workoutExerciseEvent', 0);
            }
            router.back();
        }
    }

    const searchFilterFunction = (text: string) => {
        // Check if searched text is not blank
        if (text) {
            // Inserted text is not blank
            // Filter the masterDataSource and update FilteredDataSource
            const newData = masterDataSource.filter(
                function (item: Exercise) {
                    // Applying filter for the inserted text in search bar
                    var itemData = '';
                    if (item.exe_name != null) {
                        itemData = item.exe_name ? item.exe_name.toUpperCase() : ''.toUpperCase();
                    }
                    const textData = text.toUpperCase();
                    return itemData.indexOf(textData) > -1;
                }
            );
            setFilteredDataSource(newData);
            setSearch(text);
        } else {
            // Inserted text is blank
            // Update FilteredDataSource with masterDataSource
            setFilteredDataSource(masterDataSource);
            setSearch(text);
        }
    };

    if (isLoading) {
        return (
            <LoadingIndicator text={''} />
        )
    }

    return (
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: Styles.dark.backgroundColor }}>

            <View style={Styles.searchContainer}>
                <TextInput
                    onChangeText={(text: string) => searchFilterFunction(text)}
                    style={Styles.searchBar}
                    placeholder='Search'
                    placeholderTextColor={Styles.fontColor.color}
                />
            </View>

            <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 120 }}>
                    {
                        filteredDataSource.length > 0 ? (
                            filteredDataSource.map((item: Exercise, i) => {
                                return (
                                    <TouchableOpacity key={i} onPress={() => onAddExercise(item.exe_name, item.id)}>
                                        <Card containerStyle={Styles.smallCard}>
                                            <Text style={{ ...Styles.detailText, margin: 0 }}>{item.exe_name != null ? item.exe_name : item.exe_name}</Text>
                                        </Card>
                                    </TouchableOpacity>
                                )
                            })) :
                            (
                                <TouchableOpacity onPress={() => onAddExercise(search)}>
                                    <Card containerStyle={Styles.smallCard}>
                                        <Text style={{ ...Styles.detailText, margin: 0 }}>Nothing found, add: {search}</Text>
                                    </Card>
                                </TouchableOpacity>
                            )
                    }
                </ScrollView>
            </View>
        </View>
    )
}