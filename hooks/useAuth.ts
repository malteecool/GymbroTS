import { useEffect, useState, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { AuthService } from '../services/AuthService.Service';
import { getUserData, setStordUserData, createUser } from '../services/UserService.Service';
import { User } from '../interfaces/User.Interface';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Web browser setup for Google OAuth redirect
WebBrowser.maybeCompleteAuthSession();

export interface AuthState {
    session: Session | null;
    user: SupabaseUser | null;
    userInfo: User | null;
    isLoading: boolean;
    error: Error | null;
}

export interface AuthMethod {
    type: 'magic-link' | 'google';
}

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);

    // Google OAuth setup
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: process.env.EXPO_PUBLIC_REACT_APP_TOKEN || '',
        androidClientId: process.env.EXPO_PUBLIC_REACT_APP_TOKEN || '',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
        redirectUri: AuthSession.makeRedirectUri({
            scheme: 'com.malteiscool.gymbrots',
            path: '/oathredirect',
        }),
    });

    // Initialize auth state on app load
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Get current session
                const currentSession = await AuthService.getSession();
                const currentUser = await AuthService.getUser();

                if (currentSession && currentUser) {
                    setSession(currentSession);
                    setUser(currentUser);

                    // Fetch user data from app database using Supabase auth
                    try {
                        const userData = await getUserData(currentUser.id);
                        if (userData) {
                            setUserInfo(userData);
                            await setStordUserData(userData);
                        }
                    } catch (err) {
                        console.error('Error fetching user data:', err);
                    }
                }
            } catch (err) {
                console.error('Error initializing auth:', err);
                setError(err instanceof Error ? err : new Error('Auth initialization failed'));
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // Listen to auth state changes
    useEffect(() => {
        const { data: authListener } = AuthService.onAuthStateChange((authUser, authSession) => {
            setSession(authSession);
            setUser(authUser);

            if (authUser && authSession) {
                // Fetch user data when authenticated
                getUserData(authUser.id)
                    .then(userData => {
                        if (userData) {
                            setUserInfo(userData);
                            setStordUserData(userData);
                        }
                    })
                    .catch(err => console.error('Error fetching user data:', err));
            } else {
                setUserInfo(null);
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // Handle Google OAuth response
    useEffect(() => {
        if (response?.type === 'success') {
            const handleGoogleSignIn = async () => {
                try {
                    setIsLoading(true);
                    const result = await AuthService.signInWithGoogle(response);

                    if (result.error) {
                        throw result.error;
                    }

                    if (result.session && result.user) {
                        setSession(result.session);
                        setUser(result.user);
                        setAuthMethod({ type: 'google' });

                        // Fetch user data or create if doesn't exist
                        try {
                            let userData = await getUserData(result.user.id);
                            
                            // If user doesn't exist, create them with Google info
                            if (!userData && result.googleUserInfo) {
                                userData = await createUser(
                                    result.user.id,
                                    result.googleUserInfo.name,
                                    result.googleUserInfo.email
                                );
                            }
                            
                            if (userData) {
                                setUserInfo(userData);
                                await setStordUserData(userData);
                            }
                        } catch (err) {
                            console.error('Error fetching or creating user data:', err);
                        }
                    }
                } catch (err) {
                    console.error('Error with Google sign in:', err);
                    setError(err instanceof Error ? err : new Error('Google sign in failed'));
                } finally {
                    setIsLoading(false);
                }
            };

            handleGoogleSignIn();
        }
    }, [response]);

    /**
     * Sign in with magic link
     */
    const signInWithMagicLink = useCallback(async (email: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await AuthService.signInWithMagicLink(email);

            if (result.error) {
                throw result.error;
            }

            setAuthMethod({ type: 'magic-link' });
            return { error: null };
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Magic link sign in failed');
            setError(error);
            return { error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Sign in with Google
     */
    const signInWithGoogle = useCallback(async () => {
        try {
            setError(null);
            await promptAsync();
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Google sign in failed');
            setError(error);
        }
    }, [promptAsync]);

    /**
     * Sign out
     */
    const signOut = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await AuthService.signOut();

            if (result.error) {
                throw result.error;
            }

            setSession(null);
            setUser(null);
            setUserInfo(null);
            setAuthMethod(null);
        } catch (err) {
            console.error('Error signing out:', err);
            setError(err instanceof Error ? err : new Error('Sign out failed'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Verify magic link (typically called from deep link)
     */
    const verifyMagicLink = useCallback(async (email: string, token: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const result = await AuthService.verifyMagicLink(email, token);

            if (result.error) {
                throw result.error;
            }

            if (result.session && result.user) {
                setSession(result.session);
                setUser(result.user);

                // Fetch user data
                try {
                    const userData = await getUserData(result.user.id);
                    if (userData) {
                        setUserInfo(userData);
                        await setStordUserData(userData);
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                }

                return { error: null };
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Magic link verification failed');
            setError(error);
            return { error };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        session,
        user,
        userInfo,
        isLoading,
        error,
        authMethod,
        signInWithMagicLink,
        signInWithGoogle,
        signOut,
        verifyMagicLink,
    };
}
