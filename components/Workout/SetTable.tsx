import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { Set } from '../../interfaces/Set.Interface';
import { NumberStepper } from '../ui/NumberStepper';

export type SetField = 'setWeight' | 'setReps';

interface SetTableProps {
    sets: Set[];
    /** Renders steppers and a per-row remove button instead of plain values. */
    editable?: boolean;
    onChange?: (index: number, field: SetField, value: number) => void;
    onRemove?: (index: number) => void;
    onAdd?: () => void;
}

/**
 * The set list of a single exercise session, shared by the history card and
 * the active-workout card so both read identically.
 *
 * Rows are separated by a hairline and the numbers use tabular figures, which
 * is what makes a long list of sets scannable at a glance.
 */
export function SetTable({ sets, editable = false, onChange, onRemove, onAdd }: SetTableProps) {
    return (
        <View>
            <View style={styles.headerRow}>
                <Text style={[styles.columnLabel, styles.indexColumn]}>SET</Text>
                <Text style={styles.columnLabel}>WEIGHT</Text>
                <Text style={styles.columnLabel}>REPS</Text>
                {editable && <View style={styles.actionColumn} />}
            </View>

            {sets.map((set, i) => (
                <View
                    key={i}
                    style={[styles.row, i < sets.length - 1 && styles.rowDivided]}
                >
                    <View style={styles.indexColumn}>
                        <View style={styles.indexBadge}>
                            <Text style={styles.indexText}>{i + 1}</Text>
                        </View>
                    </View>

                    {editable ? (
                        <>
                            <View style={styles.column}>
                                <NumberStepper
                                    value={set.setWeight}
                                    step={2.5}
                                    onChange={(v) => onChange?.(i, 'setWeight', v)}
                                />
                            </View>
                            <View style={styles.column}>
                                <NumberStepper
                                    value={set.setReps}
                                    step={1}
                                    onChange={(v) => onChange?.(i, 'setReps', v)}
                                />
                            </View>
                            <TouchableOpacity
                                onPress={() => onRemove?.(i)}
                                style={styles.actionColumn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <MaterialCommunityIcons name="close" size={16} color={Theme.colors.textMuted} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={styles.column}>
                                <Text style={styles.value}>
                                    {set.setWeight}
                                    <Text style={styles.unit}> kg</Text>
                                </Text>
                            </View>
                            <View style={styles.column}>
                                <Text style={styles.value}>
                                    {set.setReps}
                                    <Text style={styles.unit}> reps</Text>
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            ))}

            {editable && onAdd && (
                <TouchableOpacity style={styles.addButton} onPress={onAdd} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="plus" size={16} color={Theme.colors.textPrimary} />
                    <Text style={styles.addButtonText}>Add set</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const INDEX_COLUMN_WIDTH = 32;
const ACTION_COLUMN_WIDTH = 24;

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        paddingBottom: Theme.spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.divider,
    },
    columnLabel: {
        ...Theme.typography.sectionLabel,
        color: Theme.colors.textMuted,
        flex: 1,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        paddingVertical: Theme.spacing.sm,
    },
    rowDivided: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.divider,
    },
    column: {
        flex: 1,
    },
    indexColumn: {
        flex: 0,
        width: INDEX_COLUMN_WIDTH,
        alignItems: 'center',
    },
    actionColumn: {
        flex: 0,
        width: ACTION_COLUMN_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indexBadge: {
        width: 22,
        height: 22,
        borderRadius: Theme.borderRadius.round,
        backgroundColor: Theme.colors.neutralSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indexText: {
        ...Theme.typography.caption,
        color: Theme.colors.textSecondary,
        fontWeight: Theme.fontWeight.bold,
    },
    value: {
        ...Theme.typography.numeric,
        textAlign: 'center',
    },
    unit: {
        ...Theme.typography.caption,
        fontWeight: Theme.fontWeight.normal,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.xs,
        paddingVertical: Theme.spacing.sm,
        marginTop: Theme.spacing.sm,
        borderRadius: Theme.borderRadius.md,
        borderWidth: 1,
        borderColor: Theme.colors.outline,
    },
    addButtonText: {
        ...Theme.typography.meta,
        color: Theme.colors.textPrimary,
        fontWeight: Theme.fontWeight.medium,
    },
});
