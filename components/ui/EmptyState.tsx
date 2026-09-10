import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface EmptyStateProps {
    icon: IconName;
    title: string;
    subtitle?: string;
    /** Rendered under the copy - typically a call-to-action button. */
    action?: React.ReactNode;
    /** `compact` suits an empty list inside a modal or card. */
    size?: 'default' | 'compact';
    style?: StyleProp<ViewStyle>;
}

/**
 * The "nothing here yet" placeholder used by every list in the app.
 */
export function EmptyState({ icon, title, subtitle, action, size = 'default', style }: EmptyStateProps) {
    const compact = size === 'compact';

    return (
        <View style={[styles.container, compact && styles.containerCompact, style]}>
            <MaterialCommunityIcons
                name={icon}
                size={compact ? 40 : 64}
                color={Theme.colors.textDisabled}
            />
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {action ? <View style={styles.action}>{action}</View> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xl * 2,
        paddingHorizontal: Theme.spacing.xl,
    },
    containerCompact: {
        paddingVertical: Theme.spacing.xl,
    },
    title: {
        ...Theme.typography.bodyStrong,
        fontSize: Theme.fontSize.lg,
        marginTop: Theme.spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        ...Theme.typography.meta,
        marginTop: Theme.spacing.xs,
        textAlign: 'center',
        lineHeight: Theme.lineHeight.md,
    },
    action: {
        marginTop: Theme.spacing.lg,
        alignSelf: 'stretch',
    },
});
