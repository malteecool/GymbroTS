import CustomExerciseView from "@/components/CustomExerciseView";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import emitter from "@/hooks/CustomEventEmitter";
import { Exercise } from "@/Interfaces/Exercise.Interface";
import { User } from "@/Interfaces/User.Interface";
import { WorkoutExercise } from "@/Interfaces/WorkoutExercise.Interface";
import { getStordUserData } from "@/Services/UserService.Service";
import { addWorkout, addWorkoutWithExercises, getDefaultWorkouts } from "@/Services/WorkoutService.Service";
import Styles from "@/Styles";
import { Button, Card } from "@rneui/themed";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { TabView, TabBar, SceneRendererProps } from "react-native-tab-view";

export default function AddWorkout() {

    const [isLoading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filteredDataSource, setFilteredDataSource] = useState<Exercise[]>([]);
    const [masterDataSource, setMasterDataSource] = useState<Exercise[]>([]);
    const [index, setIndex] = useState(0);
    const [workoutName, setWorkoutName] = useState('');
    const [workoutTimeEstimate, setWorkoutTimeEstimate] = useState(0);
    const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
    const [user, setUser] = useState<User>();

    const childToParent = (childData: WorkoutExercise[]) => {
        setSelectedExercises(childData);
    }

    const load = async () => {
        setLoading(true);
        const storedUser = await getStordUserData();
        setUser(storedUser);
        const docDataArray = await getDefaultWorkouts();
        setFilteredDataSource(docDataArray);
        setMasterDataSource(docDataArray);
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    const onAddWorkout = async (name: string) => {
        setLoading(true);

        if (!user) {
            console.log("User is undefined");
            return;
        }

        try {
            if (selectedExercises.length > 0) {
                await addWorkoutWithExercises(name, selectedExercises, user.id);
            } else {
                await addWorkout(name, user.id);
            }
        }
        catch (error) {
            console.log(error);
        }
        finally {
            setLoading(false);
            emitter.emit('workoutEvent', 0);
            router.back();
        }
    }
    const searchFilterFunction = (text: string) => {
        if (text) {
            const newData = masterDataSource.filter(
                function (item: any /*default exericse*/) {
                    const itemData = item.def_name
                        ? item.def_name.toUpperCase()
                        : ''.toUpperCase();
                    const textData = text.toUpperCase();
                    return itemData.indexOf(textData) > -1;
                }
            );
            setFilteredDataSource(newData);
            setSearch(text);
        } else {
            setFilteredDataSource(masterDataSource);
            setSearch(text);
        }
    };
    const [routes] = useState([
        { key: 'default', title: 'Default workout' },
        { key: 'custom', title: 'Custom workout' },
    ]);

    const DefaultTab = () => {
        return (
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#121111' }}>
                <View style={Styles.searchContainer}>
                    <TextInput
                        onChangeText={(text) => searchFilterFunction(text)}
                        style={Styles.searchBar}
                        placeholder='Search'
                        placeholderTextColor={Styles.fontColor.color}
                    />
                </View>
                <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <ScrollView style={{ width: '100%', }} contentContainerStyle={{ paddingBottom: 120 }}>
                        {
                            filteredDataSource.length > 0 ? (
                                filteredDataSource.map((item: any /*default exericse*/, i) => {
                                    return (
                                        <TouchableOpacity key={i} onPress={() => onAddWorkout(item.def_name)}>
                                            <Card containerStyle={Styles.smallCard}>
                                                <Text style={{ ...Styles.detailText, margin: 0 }}>{item.def_name}</Text>
                                            </Card>
                                        </TouchableOpacity>
                                    )
                                })) :
                                (
                                    <TouchableOpacity onPress={() => onAddWorkout(search)}>
                                        <Card containerStyle={Styles.smallCard}>
                                            <Text style={{ ...Styles.detailText, margin: 0 }} >Nothing found, add: {search}</Text>
                                        </Card>
                                    </TouchableOpacity>
                                )

                        }
                    </ScrollView>

                </View>
            </View >
        );
    }

    const CustomTab = () => {

        if (!user) {
            console.log("user is undefined");
            return;
        }

        return (
            <View style={{ height: '100%', marginTop: 0, backgroundColor: '#121111' }}>
                <View style={Styles.searchContainer}>
                    <TextInput onChangeText={(text) => setWorkoutName(text)} style={Styles.searchBar}
                        placeholder='Workout name'
                        placeholderTextColor='gray'
                        value={workoutName} />
                </View>
                <View style={Styles.searchContainer}>
                    <TextInput onChangeText={(text) => setWorkoutTimeEstimate(Number(text))} style={Styles.searchBar}
                        keyboardType='numeric'
                        placeholder='Estimate time'
                        placeholderTextColor='gray'
                        value={`${workoutTimeEstimate}`}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <View style={{ flex: 1 }}>
                        <CustomExerciseView userId={user.id} childToParent={childToParent} />
                    </View>
                </View>
                <View style={{ position: 'absolute', width: '100%', bottom: 10 }}>
                    <Button disabled={workoutName.length <= 0} title='Create' titleStyle={{ fontSize: 18 }} buttonStyle={{ margin: 10, backgroundColor: Styles.green.backgroundColor }} onPress={() => { onAddWorkout(workoutName) }} />
                </View>
            </View>
        );
    }

    const renderTabs = (props: SceneRendererProps & { route: { key: string, title: string } }) => {
        const { route } = props;
        switch (route.key) {
            case 'default':
                return (
                    <DefaultTab />
                )
            case 'custom':
                return (
                    <CustomTab />
                )
        }
    }

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <LoadingIndicator />
            </View>
        )
    }

    return (
        <View style={{ flex: 1 }}>
            <Stack.Screen
                options={{
                    title: 'New workout'
                }}
            />
            <TabView
                swipeEnabled={true}
                renderTabBar={props => <TabBar
                    {...props}
                    style={Styles.green}
                />}
                navigationState={{ index, routes }}
                renderScene={renderTabs}
                onIndexChange={setIndex}
            />
        </View>
    );

}