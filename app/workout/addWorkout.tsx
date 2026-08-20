import CustomExerciseView from "../../components/CustomExerciseView";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { User } from "../../interfaces/User.Interface";
import { Workout } from "../../interfaces/Workout.Interface";
import { WorkoutExercise } from "../../interfaces/WorkoutExercise.Interface";
import { getStordUserData } from "../../services/UserService.Service";
import { addWorkout, addWorkoutWithExercises, getDefaultWorkouts } from "../../services/WorkoutService.Service";
import { Theme } from "../../constants/Theme";
import { Card } from "@rneui/themed";
import { router, Stack } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { TabView, TabBar, SceneRendererProps } from "react-native-tab-view";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomAddWorkout from "../../components/ui/CustomAddWorkout";

export default function AddWorkout() {

    const [isLoading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filteredDataSource, setFilteredDataSource] = useState<Workout[]>([]);
    const [masterDataSource, setMasterDataSource] = useState<Workout[]>([]);
    const [index, setIndex] = useState(0);
    const [workoutName, setWorkoutName] = useState('');
    const [workoutTimeEstimate, setWorkoutTimeEstimate] = useState(null);
    const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
    const [user, setUser] = useState<User>();

    const childToParent = useCallback((childData: WorkoutExercise[]) => {
        setSelectedExercises(childData);
    }, []);

    const load = async () => {
        setLoading(true);
        const storedUser = await getStordUserData();
        if (!storedUser) {
            return;
        }
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
                function (item: Workout) {
                    const itemData = item.worName
                        ? item.worName.toUpperCase()
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
            <View style={styles.tabContainer}>
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={20}
                        color={Theme.colors.font + '80'}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        onChangeText={(text) => searchFilterFunction(text)}
                        value={search}
                        style={styles.searchInput}
                        placeholder='Search default workouts...'
                        placeholderTextColor={Theme.colors.font + '60'}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity
                            onPress={() => searchFilterFunction('')}
                            style={styles.searchClearButton}
                        >
                            <MaterialCommunityIcons
                                name="close-circle"
                                size={20}
                                color={Theme.colors.font + '80'}
                            />
                        </TouchableOpacity>
                    )}
                </View>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                >
                    {filteredDataSource.length > 0 ? (
                        filteredDataSource.map((item: Workout, i) => {
                            return (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => onAddWorkout(item.worName)}
                                    activeOpacity={0.7}
                                >
                                    <Card containerStyle={styles.workoutCard}>
                                        <View style={styles.workoutContent}>
                                            <MaterialCommunityIcons
                                                name="dumbbell"
                                                size={24}
                                                color={Theme.colors.font}
                                            />
                                            <Text style={styles.workoutText}>{item.worName}</Text>
                                            <MaterialCommunityIcons
                                                name="chevron-right"
                                                size={20}
                                                color={Theme.colors.font + '60'}
                                            />
                                        </View>
                                    </Card>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <TouchableOpacity
                            onPress={() => onAddWorkout(search)}
                            disabled={!search.trim()}
                            activeOpacity={0.7}
                        >
                            <Card containerStyle={[
                                styles.workoutCard,
                                !search.trim() && styles.disabledCard
                            ]}>
                                <View style={styles.addNewContainer}>
                                    <MaterialCommunityIcons
                                        name="plus-circle"
                                        size={24}
                                        color={Theme.colors.font}
                                    />
                                    <Text style={styles.workoutText}>
                                        {search.trim()
                                            ? `Add new: ${search}`
                                            : 'Search for a workout or type to add new'}
                                    </Text>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    )}
                </ScrollView>
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
                    <CustomAddWorkout
                        user={user}
                        workoutName={workoutName}
                        workoutTimeEstimate={workoutTimeEstimate}
                        setWorkoutName={setWorkoutName}
                        setWorkoutTimeEstimate={setWorkoutTimeEstimate}
                        onAddWorkout={onAddWorkout}
                        childToParent={childToParent}
                        isLoading={isLoading}
                        styles={styles}
                    />
                )
        }
    }

    if (isLoading) {
        return (
            <LoadingIndicator />
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
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        style={styles.tabBar}
                        indicatorStyle={styles.tabIndicator}
                        //tabStyle={styles.tabLabel}
                        activeColor={Theme.colors.font}
                        inactiveColor={Theme.colors.font + '80'}
                    />
                )}
                navigationState={{ index, routes }}
                renderScene={renderTabs}
                onIndexChange={setIndex}
            />
        </View>
    );

}

const styles = StyleSheet.create({
    tabContainer: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        margin: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        gap: Theme.spacing.sm,
    },
    searchIcon: {
        marginRight: Theme.spacing.xs,
    },
    searchInput: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        paddingVertical: Theme.spacing.sm,
    },
    searchClearButton: {
        padding: Theme.spacing.xs,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Theme.spacing.xl,
    },
    workoutCard: {
        marginHorizontal: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.lessDark,
        padding: Theme.spacing.md,
    },
    workoutContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
    },
    workoutText: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
    },
    addNewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
    },
    disabledCard: {
        opacity: 0.5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        marginHorizontal: Theme.spacing.md,
        marginTop: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        gap: Theme.spacing.sm,
    },
    inputIcon: {
        marginRight: Theme.spacing.xs,
    },
    input: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        paddingVertical: Theme.spacing.md,
    },
    exerciseViewContainer: {
        flex: 1,
        marginTop: Theme.spacing.sm,
    },
    buttonContainer: {
        padding: Theme.spacing.md,
        backgroundColor: Theme.colors.dark,
        ...Theme.shadows.medium,
    },
    createButton: {
        height: 50,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.green,
    },
    createButtonDisabled: {
        backgroundColor: Theme.colors.lessDark,
        opacity: 0.5,
    },
    buttonTitle: {
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    tabBar: {
        backgroundColor: Theme.colors.lessDark,
    },
    tabIndicator: {
        backgroundColor: Theme.colors.green,
        height: 3,
    },
    tabLabel: {
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
        textTransform: 'none',
    },
});