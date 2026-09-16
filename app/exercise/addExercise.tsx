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
import { FilterChips, FilterChipOption } from "../../components/ui/FilterChips";
import {
    guessMuscleGroup,
    muscleGroupIcon,
    MuscleGroup,
    MUSCLE_GROUP_OPTIONS,
    UNCATEGORISED_ICON,
    UNCATEGORISED_LABEL,
} from "../../constants/MuscleGroups";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { ScrollView, View } from "react-native";

/** 'all' shows everything, 'none' narrows to exercises with no group set. */
type GroupFilter = 'all' | 'none' | MuscleGroup;

export default function AddExerciseScreen() {
    const [isLoading, setLoading] = useState<boolean>(false);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
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

    /**
     * Only offer the groups the list actually has exercises in - the same chip
     * row as the exercise tab.
     */
    const groupOptions = useMemo<FilterChipOption<GroupFilter>[]>(() => {
        const present = new Set(masterDataSource.map((item) => item.exeMuscleGroup));
        const options: FilterChipOption<GroupFilter>[] = [{ value: 'all', label: 'All' }];

        for (const option of MUSCLE_GROUP_OPTIONS) {
            if (present.has(option.value)) {
                options.push({ value: option.value, label: option.label, icon: option.icon });
            }
        }

        if (present.has(null)) {
            options.push({ value: 'none', label: UNCATEGORISED_LABEL, icon: UNCATEGORISED_ICON });
        }

        return options;
    }, [masterDataSource]);

    // Drop a filter that no longer has anything behind it, so the list cannot
    // get stuck showing nothing.
    useEffect(() => {
        if (!groupOptions.some((option) => option.value === groupFilter)) {
            setGroupFilter('all');
        }
    }, [groupOptions, groupFilter]);

    const trimmedSearch = search.trim();

    const filteredDataSource = useMemo(() => {
        const needle = trimmedSearch.toUpperCase();

        return masterDataSource.filter((item: Exercise) => {
            const matchesGroup =
                groupFilter === 'all' ||
                (groupFilter === 'none' ? item.exeMuscleGroup === null : item.exeMuscleGroup === groupFilter);

            if (!matchesGroup) return false;
            if (!needle) return true;

            return (item.exeName?.toUpperCase() || '').indexOf(needle) > -1;
        });
    }, [masterDataSource, trimmedSearch, groupFilter]);

    /**
     * A filter-picked group beats the name guess: if you are looking at Back and
     * type a new name, you meant to add it to Back.
     */
    const newExerciseGroup = useMemo(
        () => (groupFilter === 'all' || groupFilter === 'none'
            ? guessMuscleGroup(trimmedSearch)
            : groupFilter),
        [groupFilter, trimmedSearch]
    );

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
                const newExerciseId = await addExercise(name, user.id, newExerciseGroup);
                await attachToWorkout(newExerciseId, workoutId as string, masterDataSource.length);
            } else {
                await addExercise(name, user.id, newExerciseGroup);
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
    }, [user, workoutId, masterDataSource.length, newExerciseGroup]);

    if (isLoading && masterDataSource.length === 0) {
        return <LoadingIndicator text='Loading exercises...' />;
    }

    return (
        <View style={Styles.screen}>
            <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder='Search exercises...'
            />

            {groupOptions.length > 1 && (
                <FilterChips
                    options={groupOptions}
                    value={groupFilter}
                    onChange={setGroupFilter}
                />
            )}

            <ScrollView contentContainerStyle={Styles.listContent} keyboardShouldPersistTaps="handled">
                {filteredDataSource.length > 0 ? (
                    filteredDataSource.map((item: Exercise, i: number) => (
                        <SelectRow
                            key={item.id || i}
                            icon={muscleGroupIcon(item.exeMuscleGroup)}
                            label={item.exeName}
                            trailingIcon="chevron-right"
                            onPress={() => onAddExercise(item.exeName, item.id)}
                        />
                    ))
                ) : (
                    <View>
                        <SelectRow
                            icon={trimmedSearch ? muscleGroupIcon(newExerciseGroup) : 'plus-circle'}
                            label={trimmedSearch
                                ? `Add new: ${trimmedSearch}`
                                : 'Search for an exercise or type to add new'}
                            disabled={!trimmedSearch}
                            onPress={() => onAddExercise(trimmedSearch)}
                        />
                        {!trimmedSearch && (
                            <EmptyState
                                icon="dumbbell"
                                size="compact"
                                title={groupFilter === 'all' ? 'No exercises found' : 'No exercises in this group'}
                                subtitle="Type an exercise name above to create a new one"
                            />
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
