import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import Styles from "../../Styles";

export function LoadingIndicator(props: { text?: string }) {
    const { text } = props;
    return (
        <View style={{ flex: 1, backgroundColor: Styles.dark.backgroundColor }}>
            <View style={Styles.activityIndicator}>
                <ActivityIndicator />
                <Text style={Styles.fontColor}>{text}</Text>
            </View>
        </View>
    )
}