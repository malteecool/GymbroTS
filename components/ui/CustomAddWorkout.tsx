import { TextInput, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { CustomExerciseView } from "../CustomExerciseView";

function CustomAddWorkout({
    user,
    workoutName,
    workoutTimeEstimate,
    setWorkoutName,
    setWorkoutTimeEstimate,
    childToParent,
    styles,
}: any) {
    if (!user) {
        console.log("user is undefined");
        return null;
    }

    const headerContent = (
        <View>
            <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                    name="format-title"
                    size={20}
                    color={Theme.colors.font + "80"}
                    style={styles.inputIcon}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Workout name"
                    placeholderTextColor={Theme.colors.font + "60"}
                    onChangeText={setWorkoutName}
                    value={workoutName}
                />
            </View>

            <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                    name="clock-outline"
                    size={20}
                    color={Theme.colors.font + "80"}
                    style={styles.inputIcon}
                />
                <TextInput
                    onChangeText={(text) => setWorkoutTimeEstimate(Number(text))}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Estimate time (minutes)"
                    placeholderTextColor={Theme.colors.font + "60"}
                />
            </View>
        </View>
    );

    return (
        <View style={styles.tabContainer}>
            <View style={styles.exerciseViewContainer}>
                <CustomExerciseView userId={user.id} childToParent={childToParent} headerContent={headerContent} />
            </View>
        </View>
    );
};

export default memo(CustomAddWorkout);
