import CustomExerciseView from "../../components/CustomExerciseView";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import { BrowsePopular } from "../../components/Workout/BrowsePopular";
import emitter from "../../hooks/CustomEventEmitter";
import { User } from "../../interfaces/User.Interface";
import { WorkoutExercise } from "../../interfaces/WorkoutExercise.Interface";
import { getStordUserData } from "../../services/UserService.Service";
import { addWorkout, addWorkoutWithExercises } from "../../services/WorkoutService.Service";
import { Theme } from "../../constants/Theme";
import { router, Stack } from "expo-router";
import { memo, useCallback, useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { TabView, SceneRendererProps } from "react-native-tab-view";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomAddWorkout from "../../components/ui/CustomAddWorkout";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";

export default function AddWorkout() {

    const [isLoading, setLoading] = useState(false);
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
    const [routes] = useState([
        { key: 'browse', title: 'Browse Popular' },
        { key: 'custom', title: 'Custom workout' },
    ]);

    const renderTabs = (props: SceneRendererProps & { route: { key: string, title: string } }) => {
        const { route } = props;
        switch (route.key) {
            case 'browse':
                return (
                    <BrowsePopular currentUserId={user?.id ?? ''} />
                )
            case 'custom':
                return (
                    <CustomAddWorkout
                        user={user}
                        workoutName={workoutName}
                        workoutTimeEstimate={workoutTimeEstimate}
                        setWorkoutName={setWorkoutName}
                        setWorkoutTimeEstimate={setWorkoutTimeEstimate}
                        childToParent={childToParent}
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

    const canCreate = workoutName.trim().length > 0 && !isLoading;

    return (
        <View style={{ flex: 1 }}>
            <Stack.Screen
                options={{
                    title: 'New workout',
                    headerRight: index === 1 ? () => (
                        <TouchableOpacity
                            onPress={() => onAddWorkout(workoutName)}
                            disabled={!canCreate}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <MaterialCommunityIcons
                                name="check"
                                size={26}
                                color={canCreate ? Theme.colors.green : Theme.colors.textDisabled}
                            />
                        </TouchableOpacity>
                    ) : undefined,
                }}
            />
            <TabView
                swipeEnabled={true}
                renderTabBar={({ navigationState }) => (
                    <SegmentedTabs
                        options={navigationState.routes.map(route => ({
                            value: route.key,
                            label: route.title ?? '',
                        }))}
                        value={navigationState.routes[navigationState.index].key}
                        onChange={key => setIndex(routes.findIndex(route => route.key === key))}
                        stretch
                        style={styles.tabBar}
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
        backgroundColor: Theme.colors.background,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
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
    tabBar: {
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        backgroundColor: Theme.colors.background
    },
});