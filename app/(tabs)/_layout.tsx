import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';

export default function TabLayout() {
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
                name="index"
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
                name="workoutTab"
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
        </Tabs>
    );
}