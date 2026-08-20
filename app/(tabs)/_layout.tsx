import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
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

function NotificationBellButton() {
    const router = useRouter();
    const { unreadCount } = useNotificationContext();

    return (
        <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/social/notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <MaterialCommunityIcons name="bell-outline" size={24} color={Theme.colors.font} />
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

export default function TabLayout() {
    const { unreadCount } = useNotificationContext();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveBackgroundColor: Theme.colors.dark,
                tabBarInactiveBackgroundColor: Theme.colors.lessDark,
                tabBarActiveTintColor: Theme.colors.font,
                tabBarInactiveTintColor: Theme.colors.font + '80',
                headerShown: false,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: Theme.colors.lessDark,
                },
            }}
        >
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name='account' color={color} size={size || 26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="exerciseTab"
                options={{
                    title: 'Exercise',
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerStatusBarHeight: 0,
                    headerStyle: {
                        backgroundColor: Theme.colors.lessDark,
                        borderBottomWidth: 1,
                        borderBottomColor: Theme.colors.dark,
                    },
                    headerTitleStyle: {
                        color: Theme.colors.font,
                        fontWeight: '600',
                    },
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name='dumbbell' color={color} size={size || 26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Workout',
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerStatusBarHeight: 0,
                    headerStyle: {
                        backgroundColor: Theme.colors.lessDark,
                        borderBottomWidth: 1,
                        borderBottomColor: Theme.colors.dark,
                    },
                    headerTitleStyle: {
                        color: Theme.colors.font,
                        fontWeight: '600',
                    },
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name='weight-lifter' color={color} size={size || 26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="splitTab"
                options={{
                    title: 'Split',
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerStatusBarHeight: 0,
                    headerStyle: {
                        backgroundColor: Theme.colors.lessDark,
                        borderBottomWidth: 1,
                        borderBottomColor: Theme.colors.dark,
                    },
                    headerTitleStyle: {
                        color: Theme.colors.font,
                        fontWeight: '600',
                    },
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name='calendar' color={color} size={size || 26} />
                    ),
                }}
            />
            <Tabs.Screen
                name="social"
                options={{
                    title: 'Social',
                    headerShown: true,
                    headerTitleAlign: 'center',
                    headerStatusBarHeight: 0,
                    headerStyle: {
                        backgroundColor: Theme.colors.lessDark,
                        borderBottomWidth: 1,
                        borderBottomColor: Theme.colors.dark,
                    },
                    headerTitleStyle: {
                        color: Theme.colors.font,
                        fontWeight: '600',
                    },
                    headerRight: () => <NotificationBellButton />,
                    tabBarIcon: ({ color, size }) => (
                        <TabIconWithBadge name='account-group' color={color} size={size || 26} count={unreadCount} />
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
    headerButton: {
        marginRight: Theme.spacing.md,
    },
});