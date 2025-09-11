import { useEffect, useState } from "react";
import { Button, Image, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { TokenResponse } from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserData } from "./services/UserService.Service"
import Styles from './styles';
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import 'expo-router/entry';

WebBrowser.maybeCompleteAuthSession();

export default function Index() {

    const [userInfo, setUserInfo] = useState();
    const [auth, setAuth] = useState<TokenResponse | null>();
    const [requireRefresh, setRequireRefresh] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: process.env.EXPO_PUBLIC_REACT_APP_TOKEN,
        redirectUri: AuthSession.makeRedirectUri({
            scheme: 'com.malteiscool.gymbrots',
            path: '/oathredirect', // To match the redirect of google auth we need to add an additional "/"
        }),
    });

    const colorScheme = useColorScheme();

    console.log("index-test.tsx")


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
        // check if user data exists;
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
                //const userData = await getUserData(authFromJson);
                let userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                    headers: { Authorization: `Bearer ${authFromJson.accessToken}` }
                });
                const userData = await userInfoResponse.json();
                if (userData.id) {
                    setUserInfo(userData);
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

    if (!auth || !userInfo) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Styles.dark.backgroundColor }}>
                <Text style={{ padding: 6 }}>Please sign in to store your workouts!</Text>
                <Button title='Login' onPress={() => promptAsync({ showInRecents: true })} />
            </View>
        )
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}
