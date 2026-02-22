import React, { useEffect, useState, useCallback, memo } from "react";
import { getExercises } from "../services/ExerciseService.Service";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Card } from '@rneui/themed';
import { Theme } from "../constants/Theme";
import { LoadingIndicator } from "./ui/LoadingIndicator";
import { Exercise } from "../interfaces/Exercise.Interface";
import { WorkoutExercise } from "../interfaces/WorkoutExercise.Interface";
import { MaterialCommunityIcons } from "@expo/vector-icons";


export function CustomExerciseView(props: { userId: string, childToParent: (selectedExercises: WorkoutExercise[]) => void }) {

    const { userId, childToParent } = props;

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

    if (isLoading) {
        return (
            <LoadingIndicator text='Loading exercises...' />
        )
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color={Theme.colors.font + '80'}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor={Theme.colors.font + '60'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearchQuery('')}
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
                {filteredData.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="dumbbell"
                            size={48}
                            color={Theme.colors.font + '40'}
                        />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No exercises found' : 'No exercises available'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Create exercises first to add them to your workout'}
                        </Text>
                    </View>
                ) : (
                    filteredData.map((item: Exercise, i: number) => {
                        const isSelected = selectedExercises.map(x => x.id).includes(item.id);
                        return (
                            <TouchableOpacity
                                key={item.id || i}
                                onPress={() => addSelectedExercise(item)}
                                activeOpacity={0.7}
                            >
                                <Card containerStyle={[
                                    styles.exerciseCard,
                                    isSelected && styles.exerciseCardSelected
                                ]}>
                                    <View style={styles.exerciseContent}>
                                        <MaterialCommunityIcons
                                            name="dumbbell"
                                            size={24}
                                            color={isSelected ? Theme.colors.green : Theme.colors.font}
                                        />
                                        <Text style={[
                                            styles.exerciseText,
                                            isSelected && styles.exerciseTextSelected
                                        ]}>
                                            {item.exeName}
                                        </Text>
                                        {isSelected && (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={24}
                                                color={Theme.colors.green}
                                            />
                                        )}
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
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
    exerciseCard: {
        marginHorizontal: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        backgroundColor: Theme.colors.lessDark,
        borderWidth: 2,
        borderColor: 'transparent',
        padding: Theme.spacing.md,
    },
    exerciseCardSelected: {
        backgroundColor: Theme.colors.green + '20',
        borderColor: Theme.colors.green,
    },
    exerciseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
    },
    exerciseText: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
    },
    exerciseTextSelected: {
        fontWeight: Theme.fontWeight.semibold,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl * 2,
    },
    emptyText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.semibold,
        marginTop: Theme.spacing.md,
    },
    emptySubtext: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.sm,
        marginTop: Theme.spacing.xs,
        textAlign: 'center',
    },
});

export default memo(CustomExerciseView);