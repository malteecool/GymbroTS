import React, { useEffect, useState, useCallback, memo } from "react";
import { getExercises } from "../services/ExerciseService.Service";
import { FlatList, StyleSheet, View } from "react-native";
import { Divider } from '@rneui/themed';
import { Styles, Theme } from "../constants/Theme";
import { LoadingIndicator } from "./ui/LoadingIndicator";
import { EmptyState } from "./ui/EmptyState";
import { SearchBar } from "./ui/SearchBar";
import { SelectRow } from "./ui/SelectRow";
import { Exercise } from "../interfaces/Exercise.Interface";
import { WorkoutExercise } from "../interfaces/WorkoutExercise.Interface";


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
    const [filteredData, setFilteredData] = useState<Exercise[]>([]);

    useEffect(() => {
        const getAvailableExericses = async () => {
            setLoading(true);
            const fetchedData = await getExercises(userId)
            setData(fetchedData);
            setFilteredData(fetchedData);
            setLoading(false);
        }
        getAvailableExericses();
    }, [userId]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredData(data);
        } else {
            const filtered = data.filter(exercise =>
                exercise.exeName.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredData(filtered);
        }
    }, [searchQuery, data]);

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
                </View>
            }
            ListEmptyComponent={
                isLoading ? (
                    <LoadingIndicator text='Loading exercises...' />
                ) : (
                    <EmptyState
                        icon="dumbbell"
                        size="compact"
                        title={searchQuery ? 'No exercises found' : 'No exercises available'}
                        subtitle={searchQuery
                            ? 'Try a different search term'
                            : 'Create exercises first to add them to your workout'}
                    />
                )
            }
            renderItem={({ item }) => (
                <SelectRow
                    icon="dumbbell"
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
