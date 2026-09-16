import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Theme } from '../../constants/Theme';

interface DividerProps {
    /** Line thickness. A hairline by default, which is thinner than 1px on most screens. */
    width?: number;
    color?: string;
    style?: StyleProp<ViewStyle>;
}

/** A horizontal rule between rows or blocks. */
export function Divider({
    width = StyleSheet.hairlineWidth,
    color = Theme.colors.divider,
    style,
}: DividerProps) {
    return <View style={[{ height: width, backgroundColor: color }, style]} />;
}
