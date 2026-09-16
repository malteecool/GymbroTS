import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { EmptyState } from '../ui/EmptyState';
import { SearchBar } from '../ui/SearchBar';
import { SelectRow } from '../ui/SelectRow';
import { Workout } from '../../interfaces/Workout.Interface';

interface DayWorkoutPickerProps {
    visible: boolean;
    dayLabel: string;
    workouts: Workout[];
    selectedWorkoutId: string | null;
    onSelect: (workout: Workout | null) => void;
    onClose: () => void;
}

export function DayWorkoutPicker({ visible, dayLabel, workouts, selectedWorkoutId, onSelect, onClose }: DayWorkoutPickerProps) {
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (visible) setSearch('');
    }, [visible]);

    const filteredWorkouts = search
        ? workouts.filter((w) => (w.worName || '').toUpperCase().includes(search.toUpperCase()))
        : workouts;

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Workout for {dayLabel}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <MaterialCommunityIcons name="close" size={24} color={Theme.colors.font} />
                        </TouchableOpacity>
                    </View>

                    <SearchBar
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search workouts..."
                    />

                    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                        <SelectRow
                            icon="sleep"
                            label="Rest day"
                            selected={selectedWorkoutId === null}
                            onPress={() => onSelect(null)}
                        />

                        {filteredWorkouts.length === 0 ? (
                            <EmptyState
                                icon="weight-lifter"
                                size="compact"
                                title={search ? 'No workouts found' : 'No workouts yet'}
                            />
                        ) : (
                            filteredWorkouts.map((workout) => (
                                <SelectRow
                                    key={workout.id}
                                    icon="weight-lifter"
                                    label={workout.worName}
                                    selected={selectedWorkoutId === workout.id}
                                    onPress={() => onSelect(workout)}
                                />
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: Theme.colors.overlay,
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Theme.colors.background,
        borderTopLeftRadius: Theme.borderRadius.lg,
        borderTopRightRadius: Theme.borderRadius.lg,
        maxHeight: '80%',
        ...Theme.shadows.large,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Theme.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.divider,
    },
    title: {
        ...Theme.typography.cardTitle,
        flex: 1,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingVertical: Theme.spacing.xs,
        paddingBottom: Theme.spacing.xl,
    },
});
