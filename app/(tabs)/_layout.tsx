import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import emitter from "@/hooks/CustomEventEmitter";
import Styles from '@/styles';

export default function TabLayout() {

    const updateExercisesEmitter = () => {
        emitter.emit('exerciseEvent', 0);
    }

    const updateWorkoutEmitter = () => {
        emitter.emit('workoutEvent', 0);
    }

    const updateProfileEmitter = () => {
        emitter.emit('profileEvent', 0);
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors['light'].tint,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: {
                    backgroundColor: Styles.dark.backgroundColor
                }
                
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name='account' color={color} size={26} />,
                }}
                listeners={{ tabPress: () => updateProfileEmitter() }}
            />
            <Tabs.Screen
                name="exercise"
                options={{
                    title: 'Exercise',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name='dumbbell' color={color} size={26} />,
                }}
                listeners={{ tabPress: () => updateExercisesEmitter() }}
            />
            <Tabs.Screen
                name="workout"
                options={{
                    title: 'Workout',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name='weight-lifter' color={color} size={26} />,
                }}
                listeners={{ tabPress: () => updateWorkoutEmitter() }}
            />
            <Tabs.Screen
                name="split"
                options={{
                    title: 'Split',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name='calendar' color={color} size={26} />,
                }}
            />
        </Tabs>
    );
}
