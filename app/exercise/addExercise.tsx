import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { Exercise } from "../../interfaces/Exercise.Interface";
import { User } from "../../interfaces/User.Interface";
import { addExercise, getDefaultExercises, getExercises } from "../../services/ExerciseService.Service";
import { getStordUserData } from "../../services/UserService.Service";
import { attachToWorkout } from "../../services/WorkoutService.Service";
import { Theme, Styles } from "../../constants/Theme";
import { Card } from "@rneui/themed";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
                const itemData = item.exe_name?.toUpperCase() || '';
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
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color={Theme.colors.font + '80'}
                    style={styles.searchIcon}
                />
                <TextInput
                    onChangeText={searchFilterFunction}
                    value={search}
                    style={styles.searchInput}
                    placeholder='Search exercises...'
                    placeholderTextColor={Theme.colors.font + '60'}
                    autoCapitalize="none"
                />
                {search.length > 0 && (
                    <TouchableOpacity
                        onPress={() => searchFilterFunction('')}
                        style={styles.clearButton}
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
                {filteredDataSource.length > 0 ? (
                    filteredDataSource.map((item: Exercise, i: number) => (
                        <TouchableOpacity
                            key={item.id || i}
                            onPress={() => onAddExercise(item.exe_name, item.id)}
                            activeOpacity={0.7}
                        >
                            <Card containerStyle={styles.exerciseCard}>
                                <View style={styles.exerciseContent}>
                                    <MaterialCommunityIcons
                                        name="dumbbell"
                                        size={24}
                                        color={Theme.colors.font}
                                    />
                                    <Text style={styles.exerciseText}>
                                        {item.exe_name}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={20}
                                        color={Theme.colors.font + '60'}
                                    />
                                </View>
                            </Card>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View>
                        <TouchableOpacity
                            onPress={() => onAddExercise(search)}
                            disabled={!search.trim()}
                            activeOpacity={0.7}
                        >
                            <Card containerStyle={[
                                styles.exerciseCard,
                                !search.trim() && styles.disabledCard
                            ]}>
                                <View style={styles.addNewContainer}>
                                    <MaterialCommunityIcons
                                        name="plus-circle"
                                        size={24}
                                        color={Theme.colors.font}
                                    />
                                    <Text style={styles.exerciseText}>
                                        {search.trim()
                                            ? `Add new: ${search}`
                                            : 'Search for an exercise or type to add new'}
                                    </Text>
                                </View>
                            </Card>
                        </TouchableOpacity>
                        {!search.trim() && (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons
                                    name="dumbbell"
                                    size={48}
                                    color={Theme.colors.font + '40'}
                                />
                                <Text style={styles.emptyText}>
                                    No exercises found
                                </Text>
                                <Text style={styles.emptySubtext}>
                                    Type an exercise name above to create a new one
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
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
    clearButton: {
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
        padding: Theme.spacing.md,
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
    addNewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
    },
    disabledCard: {
        opacity: 0.5,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl * 2,
        paddingHorizontal: Theme.spacing.xl,
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