import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import 'react-native-reanimated';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { HeaderBackButton } from "@react-navigation/elements";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthProvider, useAuthContext } from '../providers/AuthProvider';
import { NotificationProvider } from '../providers/NotificationProvider';
import { useFonts } from '../hooks/useFonts';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import LoginScreen from './(auth)/LoginScreen';
import { Theme, Styles } from '../constants/Theme';

import 'expo-router/entry';

WebBrowser.maybeCompleteAuthSession();

/**
 * Root layout content - uses auth context
 * This component is wrapped by AuthProvider below
 */
function RootLayoutContent() {
    const router = useRouter();
    const { user, userInfo, isLoading } = useAuthContext();
    const { fontsLoading } = useFonts();

    const isAuthenticated = !!user && !!userInfo;
    const showLoading = isLoading || fontsLoading;

    // Show login screen if not authenticated
    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    // Loading state for authenticated session setup
    if (showLoading) {
        return (
            <View style={styles.container}>
                <StatusBar
                    backgroundColor="transparent"
                    barStyle="light-content"
                    translucent={true}
                />
                <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons 
                        size={100} 
                        name='dumbbell' 
                        color={Theme.colors.accent} 
                    />
                    <LoadingIndicator 
                        text='Loading...' 
                        backgroundColor={Theme.colors.dark} 
                    />
                </View>
            </View>
        );
    }

    // Main app layout for authenticated users
    return (
        <NotificationProvider>
            <View style={styles.appContainer}>
                <StatusBar
                    backgroundColor="transparent"
                    barStyle="light-content"
                    translucent={true}
                />
                <Stack
                    screenOptions={{
                        header: ({ options }) => (
                            <View style={Styles.headerContainer}>
                                <HeaderBackButton
                                    tintColor={Theme.colors.font}
                                    style={Styles.backButton}
                                    onPress={() => router.back()}
                                />
                                <Text style={Styles.headerTitle}>
                                    {options.title}
                                </Text>
                            </View>
                        ),
                    }}
                >
                    <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="exercise/exerciseDetails"
                        options={{ headerShown: true }}
                    />
                    <Stack.Screen
                        name="exercise/addExercise"
                        options={{ headerShown: true }}
                    />
                    <Stack.Screen
                        name="exercise/addSet"
                        options={{ headerShown: true }}
                    />
                    <Stack.Screen
                        name="workout/workoutDetails"
                        options={{ headerShown: true }}
                    />
                    <Stack.Screen
                        name="workout/addWorkout"
                        options={{ headerShown: true }}
                    />
                    <Stack.Screen
                        name="workout/allWorkouts"
                        options={{ headerShown: true, title: 'My Workouts' }}
                    />
                    <Stack.Screen
                        name="split/createSplit"
                        options={{ headerShown: true }}
                    />
                    <Stack.Screen
                        name="profile/[userId]"
                        options={{ headerShown: true, title: 'Profile' }}
                    />
                    <Stack.Screen
                        name="social/discover"
                        options={{ headerShown: true, title: 'Find People' }}
                    />
                    <Stack.Screen
                        name="social/followers"
                        options={{ headerShown: true, title: 'Followers' }}
                    />
                    <Stack.Screen
                        name="social/post/[postId]"
                        options={{ headerShown: true, title: 'Post' }}
                    />
                    <Stack.Screen
                        name="social/notifications"
                        options={{ headerShown: true, title: 'Notifications' }}
                    />
                    <Stack.Screen
                        name="social/userWorkouts"
                        options={{ headerShown: true, title: 'Workouts' }}
                    />
                    <Stack.Screen
                        name="+not-found"
                    />
                </Stack>
            </View>
        </NotificationProvider>
    );
}

/**
 * Root Layout - Wraps everything with AuthProvider
 */
export default function RootLayout() {
    return (
        <AuthProvider>
            <RootLayoutContent />
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
    },
    appContainer: {
        flex: 1,
        paddingTop: StatusBar.currentHeight || 0,
        backgroundColor: Theme.colors.lessDark,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.dark,
    },
});