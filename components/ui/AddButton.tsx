import Styles from "@/Styles";
import { Button } from "@rneui/base";
import { RelativePathString, router } from "expo-router";
import { TouchableOpacity } from "react-native";

type AddButtonProps = {
    navigation: string | { pathname: string; params?: Record<string, any> };
};

export function AddButton({ navigation }: AddButtonProps) {

    const handlePress = () => {
        if (typeof navigation === "string") {
            router.push(navigation as RelativePathString);
        } else {
            router.push({pathname: navigation.pathname as RelativePathString, params: navigation.params});
        }

    }

    return (
        <TouchableOpacity style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            borderRadius: 30,
            overflow: "hidden"
        }}>
            <Button onPress={handlePress}
                title='+' titleStyle={{ fontSize: 24 }} buttonStyle={{
                    width: 60,
                    height: 60,
                    borderWidth: 1,
                    borderRadius: 30,
                    borderColor: '#4e7e6fff',
                    backgroundColor: Styles.green.backgroundColor
                }} />
        </TouchableOpacity>
    )
}