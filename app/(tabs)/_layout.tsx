import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { useNotificationContext } from '../../providers/NotificationProvider';

function TabIconWithBadge({ name, color, size, count }: { name: any; color: string; size: number; count: number }) {
    return (
        <View>
            <MaterialCommunityIcons name={name} color={color} size={size} />
            {count > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
                </View>
            )}
        </View>
    );
}

/** Tab order is Social - Exercise - Workout - Split - Profile, but the app
 *  still opens on Workout. */
export const unstable_settings = {
    initialRouteName: 'index',
};

/**
 * The tab bar already names the screen you are on, so no tab carries a header
 * bar. Screen-level actions live inside each screen instead of `headerRight`.
 */
export default function TabLayout() {
    const { unreadCount } = useNotificationContext();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveBackgroundColor: Theme.colors.dark,
                tabBarInactiveBackgroundColor: Theme.colors.lessDark,
                tabBarActiveTintColor: Theme.colors.font,
                tabBarInactiveTintColor: Theme.colors.textMuted,
                headerShown: false,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: Theme.colors.lessDark,
                },
            }}
        >
            <Tabs.Screen
                name="social"
                options={{
                    title: 'Social',
                    tabBarIcon: ({ color, size }) => (
                        <TabIconWithBadge name='account-group' color={color} size={size || 26} count={unreadCount} />
                    ),
                }}
            />
            <Tabs.Screen
                name="exerciseTab"
                options={{
                    title: 'Exercise',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name='dumbbell' color={color} size={size || 26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Workout',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name='weight-lifter' color={color} size={size || 26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="splitTab"
                options={{
                    title: 'Split',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name='calendar' color={color} size={size || 26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name='account' color={color} size={size || 26} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 3,
        backgroundColor: Theme.colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: Theme.colors.white,
        fontSize: 10,
        fontWeight: Theme.fontWeight.bold,
    },
});
