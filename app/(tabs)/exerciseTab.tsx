import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { addExercise, getExercises, removeExercise as removeExerciseService } from '../../services/ExerciseService.Service';
import { Theme, Styles } from '../../constants/Theme';
import {
    guessMuscleGroup,
    MuscleGroup,
    muscleGroupIcon,
    muscleGroupLabel,
    MUSCLE_GROUP_OPTIONS,
    UNCATEGORISED_ICON,
    UNCATEGORISED_LABEL,
} from '../../constants/MuscleGroups';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListCard } from '../../components/ui/ListCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { SelectRow } from '../../components/ui/SelectRow';
import { FilterChips, FilterChipOption } from '../../components/ui/FilterChips';
import { IconButton } from '../../components/ui/IconButton';
import { Exercise } from '../../interfaces/Exercise.Interface';
import { User } from '../../interfaces/User.Interface';
import { getStordUserData } from '../../services/UserService.Service';
import { router } from 'expo-router';
import emitter from '../../hooks/CustomEventEmitter';

/** 'all' shows everything, 'none' narrows to exercises with no group set. */
type GroupFilter = 'all' | 'none' | MuscleGroup;

export default function ExerciseScreen() {
    const [isLoading, setLoading] = useState(true);
    const [data, setData] = useState<Exercise[]>([]);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                return;
            }

            setUser(storedUser);
            const exercises = await getExercises(storedUser.id);
            setData(exercises);
        } catch (error) {
            console.error('Error loading exercises:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const removeExercise = useCallback(async (exe_id: string) => {
        if (!user) return;

        try {
            setLoading(true);
            await removeExerciseService(exe_id, user.id);
            await load();
        } catch (error) {
            console.error('Error removing exercise:', error);
            Alert.alert('Error', 'Failed to remove exercise. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user, load]);

    const warnUser = useCallback((exercise: Exercise) => {
        Alert.alert(
            'Remove exercise',
            `Are you sure you want to delete exercise "${exercise.exeName}"?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => removeExercise(exercise.id),
                },
            ]
        );
    }, [removeExercise]);

    /**
     * Only offer the groups the user actually has exercises in - a chip row of
     * ten groups where eight are empty is harder to scan than a short one.
     */
    const groupOptions = useMemo<FilterChipOption<GroupFilter>[]>(() => {
        const present = new Set(data.map((item) => item.exeMuscleGroup));
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

    // Drop a filter that no longer has any exercises behind it (last one deleted,
    // or its group reassigned) so the list cannot get stuck showing nothing.
    useEffect(() => {
        if (!groupOptions.some((option) => option.value === groupFilter)) {
            setGroupFilter('all');
        }
    }, [groupOptions, groupFilter]);

    const trimmedSearch = search.trim();

    const visibleExercises = useMemo(() => {
        const needle = trimmedSearch.toUpperCase();

        return data.filter((item) => {
            const matchesGroup =
                groupFilter === 'all' ||
                (groupFilter === 'none' ? item.exeMuscleGroup === null : item.exeMuscleGroup === groupFilter);

            if (!matchesGroup) return false;
            if (!needle) return true;

            return (item.exeName?.toUpperCase() || '').indexOf(needle) > -1;
        });
    }, [data, trimmedSearch, groupFilter]);

    const hasExactMatch = data.some(
        (item: Exercise) => item.exeName?.trim().toUpperCase() === trimmedSearch.toUpperCase()
    );
    const canQuickAdd = trimmedSearch.length > 0 && !hasExactMatch;

    const quickAddExercise = useCallback(async () => {
        if (!user) return;

        const name = search.trim();
        if (!name) return;

        try {
            setLoading(true);
            // A filter-picked group beats the name guess: if you are looking at
            // Back and type a new name, you meant to add it to Back.
            const group = groupFilter === 'all' || groupFilter === 'none'
                ? guessMuscleGroup(name)
                : groupFilter;
            await addExercise(name, user.id, group);
            setSearch('');
            emitter.emit('exerciseEvent', 0);
            await load();
        } catch (error) {
            console.error('Error adding exercise:', error);
            Alert.alert('Error', 'Failed to add exercise. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user, search, groupFilter, load]);

    useEffect(() => {
        const listener = () => {
            load();
        };
        emitter.on('exerciseEvent', listener);

        return () => {
            emitter.off('exerciseEvent', listener);
        };
    }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load().finally(() => setRefreshing(false));
    }, [load]);

    if (isLoading && data.length === 0) {
        return <LoadingIndicator text='Loading exercises...' />;
    }

    return (
        <View style={Styles.screen}>
            <View style={styles.actionRow}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder='Search exercises...'
                    style={styles.search}
                />
                <IconButton
                    icon="plus"
                    onPress={() => router.push('/exercise/addExercise')}
                    accessibilityLabel="Add exercise"
                    color={Theme.colors.green}
                    size={24}
                />
            </View>
            {groupOptions.length > 1 && (
                <FilterChips
                    options={groupOptions}
                    value={groupFilter}
                    onChange={setGroupFilter}
                />
            )}
            <ScrollView
                contentContainerStyle={Styles.listContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {visibleExercises.length === 0 ? (
                    <EmptyState
                        icon="dumbbell"
                        title={trimmedSearch || groupFilter !== 'all' ? 'No exercises found' : 'No exercises yet'}
                        subtitle={trimmedSearch
                            ? 'Add it as a new exercise below'
                            : groupFilter !== 'all'
                                ? 'Nothing in this group yet'
                                : 'Tap the + button to add an exercise'}
                    />
                ) : (
                    visibleExercises.map((item: Exercise, i: number) => (
                        <ListCard
                            key={item.id || i}
                            title={item.exeName}
                            onPress={() =>
                                router.push({
                                    pathname: '/exercise/exerciseDetails',
                                    params: { exerciseId: item.id, workoutId: undefined }
                                })
                            }
                            onDelete={() => warnUser(item)}
                            meta={[
                                { icon: muscleGroupIcon(item.exeMuscleGroup), label: muscleGroupLabel(item.exeMuscleGroup) },
                                { icon: 'weight-kilogram', label: `${item.exeMaxWeight} kg` },
                                { icon: 'calendar-range', label: new Date(item.exeDate).toDateString() },
                            ]}
                        />
                    ))
                )}
                {canQuickAdd && (
                    <SelectRow
                        icon="plus-circle"
                        label={`Add new: ${trimmedSearch}`}
                        trailingIcon="chevron-right"
                        onPress={quickAddExercise}
                        style={styles.quickAdd}
                    />
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        paddingRight: Theme.spacing.md,
    },
    search: {
        flex: 1,
        marginRight: 0,
    },
    quickAdd: {
        marginTop: Theme.spacing.xs,
    },
});
