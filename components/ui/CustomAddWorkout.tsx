import { TextInput, View } from "react-native";
import { Theme } from "../../constants/Theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { CustomExerciseView } from "../CustomExerciseView";
import { Button } from "@rneui/themed";

function CustomAddWorkout({
    user,
    workoutName,
    workoutTimeEstimate,
    isLoading,
    setWorkoutName,
    setWorkoutTimeEstimate,
    onAddWorkout,
    childToParent,
    styles,
}: any) {
    if (!user) {
        console.log("user is undefined");
        return null;
    }

    return (
        <View style={styles.tabContainer}>
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

            <View style={styles.exerciseViewContainer}>
                <CustomExerciseView userId={user.id} childToParent={childToParent} />
            </View>

            <View style={styles.buttonContainer}>
                <Button
                    disabled={workoutName.length <= 0 || isLoading}
                    title="Create Workout"
                    titleStyle={styles.buttonTitle}
                    buttonStyle={[
                        styles.createButton,
                        (workoutName.length <= 0 || isLoading) && styles.createButtonDisabled,
                    ]}
                    onPress={() => onAddWorkout(workoutName)}
                    loading={isLoading}
                />
            </View>
        </View>
    );
};

export default memo(CustomAddWorkout);