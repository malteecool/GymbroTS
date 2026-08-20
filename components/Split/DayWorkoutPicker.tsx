import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
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
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Workout for {dayLabel}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <MaterialCommunityIcons name="close" size={24} color={Theme.colors.font} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color={Theme.colors.font + '80'} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search workouts..."
                            placeholderTextColor={Theme.colors.font + '60'}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <MaterialCommunityIcons name="close-circle" size={20} color={Theme.colors.font + '80'} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                        <TouchableOpacity
                            onPress={() => onSelect(null)}
                            style={[styles.option, selectedWorkoutId === null && styles.optionSelected]}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="sleep" size={22} color={Theme.colors.font + '80'} />
                            <Text style={styles.optionText}>Rest day</Text>
                            {selectedWorkoutId === null && (
                                <MaterialCommunityIcons name="check-circle" size={22} color={Theme.colors.green} />
                            )}
                        </TouchableOpacity>

                        {filteredWorkouts.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="weight-lifter" size={40} color={Theme.colors.font + '40'} />
                                <Text style={styles.emptyText}>
                                    {search ? 'No workouts found' : 'No workouts yet'}
                                </Text>
                            </View>
                        ) : (
                            filteredWorkouts.map((workout) => {
                                const isSelected = selectedWorkoutId === workout.id;
                                return (
                                    <TouchableOpacity
                                        key={workout.id}
                                        onPress={() => onSelect(workout)}
                                        style={[styles.option, isSelected && styles.optionSelected]}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons
                                            name="weight-lifter"
                                            size={22}
                                            color={isSelected ? Theme.colors.green : Theme.colors.font}
                                        />
                                        <Text style={styles.optionText}>{workout.worName}</Text>
                                        {isSelected && (
                                            <MaterialCommunityIcons name="check-circle" size={22} color={Theme.colors.green} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Theme.colors.dark,
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
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.lessDark,
    },
    title: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        fontWeight: Theme.fontWeight.bold,
        flex: 1,
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
    list: {
        flex: 1,
    },
    listContent: {
        padding: Theme.spacing.sm,
        paddingBottom: Theme.spacing.xl,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Theme.spacing.md,
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        marginBottom: Theme.spacing.sm,
        gap: Theme.spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: Theme.colors.green + '20',
        borderColor: Theme.colors.green,
    },
    optionText: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl * 2,
        gap: Theme.spacing.sm,
    },
    emptyText: {
        color: Theme.colors.font + '80',
        fontSize: Theme.fontSize.md,
    },
});
