import Styles from "@/Styles";
import { HeaderBackButton } from "@react-navigation/elements";
import { router, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function exerciseLayout() {
    return (
        <Stack screenOptions={{
            header: ({ options }) => (
                <View style={Styles.headerContainer}>
                    <HeaderBackButton tintColor={Styles.fontColor.color}
                        style={Styles.backButton}
                        onPress={() => router.back()} />
                    <Text style={Styles.headerTitle}>{options.title}</Text>
                </View>
            )
        }}>
            <Stack.Screen name="index" options={{
                headerShown: false,
            }} />
            <Stack.Screen name="workoutDetails" options={{
                headerShown: true,
            }} />
             <Stack.Screen name="addWorkout" options={{
                headerShown: true,
            }} />
        </Stack>
    )
}