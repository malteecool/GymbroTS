import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, setStordUserData } from '../services/UserService.Service';
import { User } from '../interfaces/User.Interface';

export interface AuthState {
    auth: AuthSession.TokenResponse | null;
    userInfo: User | null;
    isLoading: boolean;
    error: Error | null;
}

export function useAuth() {
    const [auth, setAuth] = useState<AuthSession.TokenResponse | null>(null);
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: process.env.EXPO_PUBLIC_REACT_APP_TOKEN,
        redirectUri: AuthSession.makeRedirectUri({
            scheme: 'com.malteiscool.gymbrots',
            path: '/oathredirect',
        }),
    });

    const getPersistedAuth = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const jsonValue = await AsyncStorage.getItem('auth');
            const authFromJson = jsonValue ? JSON.parse(jsonValue) : null;
            
            if (authFromJson) {
                setAuth(authFromJson);
                
                const isTokenFresh = AuthSession.TokenResponse.isTokenFresh({
                    expiresIn: authFromJson.expiresIn,
                    issuedAt: authFromJson.issuedAt
                });
                
                if (!isTokenFresh) {
                    await refreshToken(authFromJson);
                    return;
                }
                
                console.log("Getting user data");
                const userData = await getUserData(authFromJson);
                
                if (userData.id) {
                    setUserInfo(userData);
                    await setStordUserData(userData);
                } else if (userData.error?.code === 401) {
                    console.log("Refreshing token");
                    await refreshToken(authFromJson);
                }
            } else {
                console.log('Auth is null, user needs to sign in.');
            }
        } catch (err) {
            console.error('Error getting persisted auth:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    const refreshToken = async (authFromJson: AuthSession.TokenResponse) => {
        try {
            const clientId = process.env.EXPO_PUBLIC_REACT_APP_TOKEN;
            if (!clientId) {
                throw new Error('Client ID not found');
            }
            
            const tokenResult = await AuthSession.refreshAsync(
                {
                    clientId: clientId,
                    refreshToken: authFromJson.refreshToken
                },
                {
                    tokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token'
                }
            );
            
            tokenResult.refreshToken = authFromJson.refreshToken;
            setAuth(tokenResult);
            await AsyncStorage.setItem('auth', JSON.stringify(tokenResult));
            
            const userData = await getUserData(tokenResult);
            if (userData.id) {
                setUserInfo(userData);
                await setStordUserData(userData);
            }
        } catch (err) {
            console.error('Error refreshing token:', err);
            setError(err instanceof Error ? err : new Error('Token refresh failed'));
            setAuth(null);
            setUserInfo(null);
        }
    };

    useEffect(() => {
        if (response?.type === 'success') {
            setAuth(response.authentication);
            setIsLoading(true);
            
            const persistAuth = async () => {
                await AsyncStorage.setItem('auth', JSON.stringify(response.authentication));
                await getPersistedAuth();
            };
            persistAuth();
        }
    }, [response]);

    useEffect(() => {
        getPersistedAuth();
    }, []);

    const signIn = async () => {
        try {
            await promptAsync({ showInRecents: true });
        } catch (err) {
            console.error('Error signing in:', err);
            setError(err instanceof Error ? err : new Error('Sign in failed'));
        }
    };

    const signOut = async () => {
        try {
            await AsyncStorage.removeItem('auth');
            await AsyncStorage.removeItem('user');
            setAuth(null);
            setUserInfo(null);
        } catch (err) {
            console.error('Error signing out:', err);
            setError(err instanceof Error ? err : new Error('Sign out failed'));
        }
    };

    return {
        auth,
        userInfo,
        isLoading,
        error,
        signIn,
        signOut,
        refetch: getPersistedAuth,
    };
}
