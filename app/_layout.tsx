import { Stack, useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import Styles from '@/styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import { getUserData, setStordUserData } from '@/services/UserService.Service';
import { Button, StyleSheet, Text, View, StatusBar } from 'react-native';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import * as Font from 'expo-font';
import { HeaderBackButton, HeaderButton } from "@react-navigation/elements";

import 'expo-router/entry';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {

    const [fontsLoading, setFontsLoading] = useState(true);
    const [userInfo, setUserInfo] = useState();
    const [auth, setAuth] = useState<AuthSession.TokenResponse | null>();
    const [requireRefresh, setRequireRefresh] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: process.env.EXPO_PUBLIC_REACT_APP_TOKEN,
        redirectUri: AuthSession.makeRedirectUri({
            scheme: 'com.malteiscool.gymbrots',
            path: '/oathredirect', // To match the redirect of google auth we need to add an additional "/"
        }),
    });
    const router = useRouter();

    // first time sign in
    useEffect(() => {
        if (response?.type === 'success') {
            setAuth(response!.authentication);
            setLoading(true);
            //store user session so we do not need to login every time we enter the app.
            const persistAuth = async () => {
                await AsyncStorage.setItem('auth', JSON.stringify(response.authentication));
                await getPersistedAuth();
            };
            persistAuth();
        }
    }, [response]);

    useEffect(() => {
        const loadFonts = async () => {
            await Font.loadAsync({
                'Oswald-Bold': require('../assets/fonts/Oswald-Bold.ttf'),
            });
            setFontsLoading(false);
        };

        // check if user data exists;
        loadFonts();

        getPersistedAuth();
    }, []);

    const getPersistedAuth = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem('auth');
            const authFromJson = jsonValue ? JSON.parse(jsonValue) : null;
            if (authFromJson) {
                setAuth(authFromJson);
                const isTokenFresh = AuthSession.TokenResponse.isTokenFresh({
                    expiresIn: authFromJson.expiresIn,
                    issuedAt: authFromJson.issuedAt
                });
                setRequireRefresh(!isTokenFresh);
                console.log("getting user data");
                const userData = await getUserData(authFromJson);
                if (userData.id) {
                    setUserInfo(userData);
                    await setStordUserData(JSON.stringify(userData));
                } else if (userData.error?.code == 401) {
                    console.log("refreshing token");
                    const clientId = process.env.EXPO_PUBLIC_REACT_APP_TOKEN;
                    const tokenResult = await AuthSession.refreshAsync({
                        clientId: clientId!,
                        refreshToken: authFromJson.refreshToken
                    }, {
                        tokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token'
                    });
                    tokenResult.refreshToken = authFromJson.refreshToken;
                    setAuth(tokenResult);
                    await AsyncStorage.setItem('auth', JSON.stringify(tokenResult));
                    setRequireRefresh(false);
                    const userData = await getUserData(tokenResult);
                    if (userData) {
                        setUserInfo(userData);
                        await setStordUserData(JSON.stringify(userData));
                    }
                }
            } else {
                console.log('auth is null, user needs to sign in.');
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    if (isLoading || fontsLoading) {
        return (
            <LoadingIndicator text={'Logging in...'} />
        )
    }

    if (!auth || !userInfo) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Styles.dark.backgroundColor }}>
                <Text style={{ padding: 6 }}>Please sign in to store your workouts!</Text>
                <Button title='Login' onPress={() => promptAsync({ showInRecents: true })} />
            </View>
        )
    }

    return (
        <View style={{
            flex: 1,
            paddingTop: StatusBar.currentHeight || 0,
            backgroundColor: Styles.lessDark.backgroundColor
        }}>
            <StatusBar
                backgroundColor="transparent"
                barStyle="light-content"
                translucent={true}
            />
            {<Stack screenOptions={{
                header: ({ options }) => (
                    <View style={Styles.headerContainer}>
                        <HeaderBackButton tintColor={Styles.fontColor.color}
                            style={Styles.backButton}
                            onPress={() => router.back()} />
                        <Text style={Styles.headerTitle}>{options.title}</Text>
                    </View>
                )
            }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
            </Stack>}

        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    userInfo: {
        alignItems: 'center',
        marginTop: 16,
    },
    welcome: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});