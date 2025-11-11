import { StyleSheet, TouchableOpacity } from "react-native";
import { Button } from "@rneui/base";
import { RelativePathString, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Theme } from "../../constants/Theme";

type AddButtonProps = {
    navigation: string | { pathname: string; params?: Record<string, any> };
};

export function AddButton({ navigation }: AddButtonProps) {
    const handlePress = () => {
        if (typeof navigation === "string") {
            router.push(navigation as RelativePathString);
        } else {
            router.push({
                pathname: navigation.pathname as RelativePathString,
                params: navigation.params
            });
        }
    };

    return (
        <TouchableOpacity 
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <Button
                onPress={handlePress}
                buttonStyle={styles.button}
                icon={
                    <MaterialCommunityIcons
                        name="plus"
                        size={28}
                        color={Theme.colors.font}
                    />
                }
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Theme.spacing.lg,
        right: Theme.spacing.lg,
        borderRadius: Theme.borderRadius.round,
        overflow: "hidden",
        ...Theme.shadows.small,
    },
    button: {
        width: 60,
        height: 60,
        borderRadius: Theme.borderRadius.round,
        borderWidth: 2,
        borderColor: Theme.colors.green,
        backgroundColor: Theme.colors.green,
    },
});