import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';


// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {

  return (
    <Tabs
    screenOptions={{
        tabBarActiveBackgroundColor: '#121111',
        tabBarInactiveBackgroundColor: '#1c1a1a'
    }}
     >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color }) => (<MaterialCommunityIcons name='account' color={color} size={26} />)
        }}
      />
      <Tabs.Screen
        name="exerciseTab"
        options={{
          title: 'Exercise',
          headerShown: false,
          tabBarIcon: ({ color }) => (<MaterialCommunityIcons name='dumbbell' color={color} size={26} />),
        }}
      />
       <Tabs.Screen
        name="workoutTab"
        options={{
          title: 'Workout',
          headerShown: false,
          tabBarIcon: ({ color }) => (<MaterialCommunityIcons name='weight-lifter' color={color} size={26} />)
        }}
      />
       <Tabs.Screen
        name="splitTab"
        options={{
          title: 'Split',
          headerShown: false,
          tabBarIcon: ({ color }) => (<MaterialCommunityIcons name='calendar' color={color} size={26} />)
        }}
      />
    </Tabs>
  );
}
