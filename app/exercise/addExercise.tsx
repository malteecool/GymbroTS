import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { User } from "../../interfaces/User.Interface";
import { addExercise, getDefaultExercises, getExercises } from "../../services/ExerciseService.Service";
import { getStordUserData } from "../../services/UserService.Service";
import { attachToWorkout } from "../../services/WorkoutService.Service";
import { Styles } from "../../constants/Theme";
import { EmptyState } from "../../components/ui/EmptyState";
import { SearchBar } from "../../components/ui/SearchBar";
import { SelectRow } from "../../components/ui/SelectRow";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { ScrollView, View } from "react-native";

export default function AddExerciseScreen() {
    const [isLoading, setLoading] = useState<boolean>(false);
    const [search, setSearch] = useState('');
    const [filteredDataSource, setFilteredDataSource] = useState<Exercise[]>([]);
    const [masterDataSource, setMasterDataSource] = useState<Exercise[]>([]);
    const [user, setUser] = useState<User | null>(null);

    const { workoutId } = useLocalSearchParams();

    const loadExercises = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                return;
            }

            setUser(storedUser);
            let docDataArray: Exercise[];

            if (workoutId) {
                docDataArray = await getExercises(storedUser.id);
            } else {
                docDataArray = await getDefaultExercises();
            }

            setFilteredDataSource(docDataArray);
            setMasterDataSource(docDataArray);
        } catch (error) {
            console.error('Error loading exercises:', error);
        } finally {
            setLoading(false);
        }
    }, [workoutId]);

    useEffect(() => {
        loadExercises();
    }, [loadExercises]);

    const onAddExercise = useCallback(async (name: string, exerciseId?: string) => {
        if (!user) {
            console.error('User not found');
            return;
        }

        try {
            setLoading(true);
            if (workoutId && exerciseId) {
                console.log("Attaching existing exercise to workout");
                await attachToWorkout(exerciseId, workoutId as string, masterDataSource.length);
            } else if (workoutId) {
                console.log("Adding new exercise and attaching to workout");
                const newExerciseId = await addExercise(name, user.id);
                await attachToWorkout(newExerciseId, workoutId as string, masterDataSource.length);
            } else {
                await addExercise(name, user.id);
            }

            emitter.emit('exerciseEvent', 0);
            if (workoutId) {
                emitter.emit('workoutExerciseEvent', 0);
            }
            router.back();
        } catch (error) {
            console.error('Error adding exercise:', error);
        } finally {
            setLoading(false);
        }
    }, [user, workoutId, masterDataSource.length]);

    const searchFilterFunction = useCallback((text: string) => {
        setSearch(text);
        if (text) {
            const newData = masterDataSource.filter((item: Exercise) => {
                const itemData = item.exeName?.toUpperCase() || '';
                const textData = text.toUpperCase();
                return itemData.indexOf(textData) > -1;
            });
            setFilteredDataSource(newData);
        } else {
            setFilteredDataSource(masterDataSource);
        }
    }, [masterDataSource]);

    if (isLoading && masterDataSource.length === 0) {
        return <LoadingIndicator text='Loading exercises...' />;
    }

    return (
        <View style={Styles.screen}>
            <SearchBar
                value={search}
                onChangeText={searchFilterFunction}
                placeholder='Search exercises...'
            />

            <ScrollView contentContainerStyle={Styles.listContent} keyboardShouldPersistTaps="handled">
                {filteredDataSource.length > 0 ? (
                    filteredDataSource.map((item: Exercise, i: number) => (
                        <SelectRow
                            key={item.id || i}
                            icon="dumbbell"
                            label={item.exeName}
                            trailingIcon="chevron-right"
                            onPress={() => onAddExercise(item.exeName, item.id)}
                        />
                    ))
                ) : (
                    <View>
                        <SelectRow
                            icon="plus-circle"
                            label={search.trim()
                                ? `Add new: ${search}`
                                : 'Search for an exercise or type to add new'}
                            disabled={!search.trim()}
                            onPress={() => onAddExercise(search)}
                        />
                        {!search.trim() && (
                            <EmptyState
                                icon="dumbbell"
                                size="compact"
                                title="No exercises found"
                                subtitle="Type an exercise name above to create a new one"
                            />
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
