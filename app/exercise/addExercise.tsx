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
                    color={Theme.colors.font}
                    style={styles.searchIcon}
                />
                <TextInput
                    onChangeText={searchFilterFunction}
                    value={search}
                    style={styles.searchBar}
                    placeholder='Search exercises...'
                    placeholderTextColor={Theme.colors.font + '80'}
                />
                {search.length > 0 && (
                    <TouchableOpacity
                        onPress={() => searchFilterFunction('')}
                        style={styles.clearButton}
                    >
                        <MaterialCommunityIcons
                            name="close-circle"
                            size={20}
                            color={Theme.colors.font}
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
                            <Card containerStyle={Styles.smallCard}>
                                <Text style={styles.cardText}>
                                    {item.exe_name}
                                </Text>
                            </Card>
                        </TouchableOpacity>
                    ))
                ) : (
                    <TouchableOpacity
                        onPress={() => onAddExercise(search)}
                        disabled={!search.trim()}
                        activeOpacity={0.7}
                    >
                        <Card containerStyle={[
                            Styles.smallCard,
                            !search.trim() && styles.disabledCard
                        ]}>
                            <View style={styles.addNewContainer}>
                                <MaterialCommunityIcons
                                    name="plus-circle"
                                    size={20}
                                    color={Theme.colors.font}
                                />
                                <Text style={styles.cardText}>
                                    {search.trim()
                                        ? `Add new: ${search}`
                                        : 'Search for an exercise or type to add new'}
                                </Text>
                            </View>
                        </Card>
                    </TouchableOpacity>
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
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        marginHorizontal: Theme.spacing.xs,
        marginTop: Theme.spacing.xs,
        borderRadius: Theme.borderRadius.md,
    },
    searchIcon: {
        marginRight: Theme.spacing.sm,
    },
    searchBar: {
        flex: 1,
        height: 40,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
    },
    clearButton: {
        marginLeft: Theme.spacing.sm,
        padding: Theme.spacing.xs,
    },
    scrollView: {
        width: '100%',
    },
    scrollContent: {
        paddingBottom: 120,
    },
    cardText: {
        ...Styles.detailText,
        margin: 0,
        fontSize: Theme.fontSize.md,
    },
    addNewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
    },
    disabledCard: {
        opacity: 0.5,
    },
});