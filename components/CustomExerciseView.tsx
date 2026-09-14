import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { getExercises } from "../services/ExerciseService.Service";
import { FlatList, StyleSheet, View } from "react-native";
import { Divider } from './ui/Divider';
import { Styles, Theme } from "../constants/Theme";
import { LoadingIndicator } from "./ui/LoadingIndicator";
import { EmptyState } from "./ui/EmptyState";
import { SearchBar } from "./ui/SearchBar";
import { SelectRow } from "./ui/SelectRow";
import {
    MuscleGroup,
    muscleGroupIcon,
    MUSCLE_GROUP_OPTIONS,
    UNCATEGORISED_ICON,
    UNCATEGORISED_LABEL,
} from "../constants/MuscleGroups";
import { FilterChips, FilterChipOption } from "./ui/FilterChips";
import { Exercise } from "../interfaces/Exercise.Interface";
import { WorkoutExercise } from "../interfaces/WorkoutExercise.Interface";


/** 'all' shows everything, 'none' narrows to exercises with no group set. */
type GroupFilter = 'all' | 'none' | MuscleGroup;

export function CustomExerciseView(props: {
    userId: string,
    childToParent: (selectedExercises: WorkoutExercise[]) => void,
    headerContent?: React.ReactNode,
}) {

    const { userId, childToParent, headerContent } = props;

    const [data, setData] = useState<Exercise[]>([]);
    const [isLoading, setLoading] = useState(false);
    const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

    useEffect(() => {
        const getAvailableExericses = async () => {
            setLoading(true);
            const fetchedData = await getExercises(userId)
            setData(fetchedData);
            setLoading(false);
        }
        getAvailableExericses();
    }, [userId]);

    // Same chip row as the exercise tab, limited to the groups actually present.
    const groupOptions = useMemo<FilterChipOption<GroupFilter>[]>(() => {
        const present = new Set(data.map((exercise) => exercise.exeMuscleGroup));
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
    }, [data]);

    useEffect(() => {
        if (!groupOptions.some((option) => option.value === groupFilter)) {
            setGroupFilter('all');
        }
    }, [groupOptions, groupFilter]);

    const filteredData = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();

        return data.filter((exercise) => {
            const matchesGroup =
                groupFilter === 'all' ||
                (groupFilter === 'none'
                    ? exercise.exeMuscleGroup === null
                    : exercise.exeMuscleGroup === groupFilter);

            if (!matchesGroup) return false;
            if (!needle) return true;

            return exercise.exeName.toLowerCase().includes(needle);
        });
    }, [data, searchQuery, groupFilter]);

    const addSelectedExercise = useCallback((exercise: Exercise) => {
        setSelectedExercises((prev) => {
            let updated: WorkoutExercise[];
            if (!prev.map((x: WorkoutExercise) => x.id).includes(exercise.id)) {
                updated = [...prev, { woeId: exercise.id, ordinal: prev.length, ...exercise }];
            } else {
                updated = prev.filter((item: WorkoutExercise) => item.id !== exercise.id);
            }
            childToParent(updated);
            return updated;
        });
    }, [childToParent]);

    return (
        <FlatList
            style={Styles.screen}
            contentContainerStyle={Styles.listContent}
            data={filteredData}
            keyExtractor={(item, i) => item.id || String(i)}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
                <View>
                    {headerContent}
                    {headerContent && <Divider style={styles.headerDivider} color={Theme.colors.dividerSubtle} />}
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search exercises..."
                    />
                    {groupOptions.length > 1 && (
                        <FilterChips
                            options={groupOptions}
                            value={groupFilter}
                            onChange={setGroupFilter}
                        />
                    )}
                </View>
            }
            ListEmptyComponent={
                isLoading ? (
                    <LoadingIndicator text='Loading exercises...' />
                ) : (
                    <EmptyState
                        icon="dumbbell"
                        size="compact"
                        title={searchQuery || groupFilter !== 'all' ? 'No exercises found' : 'No exercises available'}
                        subtitle={searchQuery
                            ? 'Try a different search term'
                            : groupFilter !== 'all'
                                ? 'Nothing in this group yet'
                                : 'Create exercises first to add them to your workout'}
                    />
                )
            }
            renderItem={({ item }) => (
                <SelectRow
                    icon={muscleGroupIcon(item.exeMuscleGroup)}
                    label={item.exeName}
                    selected={selectedExercises.some((x) => x.id === item.id)}
                    onPress={() => addSelectedExercise(item)}
                />
            )}
        />
    )
}

const styles = StyleSheet.create({
    headerDivider: {
        marginTop: Theme.spacing.sm,
        marginHorizontal: Theme.spacing.md,
    },
});

export default memo(CustomExerciseView);
