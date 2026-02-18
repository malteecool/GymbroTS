import { supabase } from '../supabaseConfig';
//import { AuthSession } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

/**
 * Service for handling Supabase Authentication
 * Supports Magic Links and Google OAuth
 */
export class AuthService {
    /**
     * Sign in with magic link (email authentication)
     * Sends an email with a magic link to the user
     */
    static async signInWithMagicLink(email: string) {
        try {
            const { data, error } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    // For Expo, we'll need to set up deep linking
                    emailRedirectTo: 'com.malteiscool.gymbrots://auth/confirm',
                },
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error signing in with magic link:', error);
            return { data: null, error };
        }
    }

    /**
     * Sign in with Google OAuth
     */
    static async signInWithGoogle(googleResponse: any) {
        try {
            if (!googleResponse.authentication?.idToken) {
                throw new Error('No ID token from Google');
            }

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: googleResponse.authentication.idToken,
            });

            if (error) throw error;
            
            // Extract Google user info from the response
            const googleUserInfo = {
                email: googleResponse.user?.email || data.user?.email || '',
                name: googleResponse.user?.name || data.user?.user_metadata?.full_name || '',
            };

            return { session: data.session, user: data.user, googleUserInfo, error: null };
        } catch (error) {
            console.error('Error signing in with Google:', error);
            return { session: null, user: null, googleUserInfo: null, error };
        }
    }

    /**
     * Sign in with Google using access token (alternative method)
     */
    static async signInWithGoogleAccessToken(accessToken: string) {
        try {
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: accessToken,
            });

            if (error) throw error;
            return { session: data.session, user: data.user, error: null };
        } catch (error) {
            console.error('Error signing in with Google access token:', error);
            return { session: null, user: null, error };
        }
    }

    /**
     * Verify magic link (via deep link)
     */
    static async verifyMagicLink(email: string, token: string) {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email,
                token: token,
                type: 'email',
            });

            if (error) throw error;
            return { session: data.session, user: data.user, error: null };
        } catch (error) {
            console.error('Error verifying magic link:', error);
            return { session: null, user: null, error };
        }
    }

    /**
     * Get current session
     */
    static async getSession() {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            return data.session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    /**
     * Get current user
     */
    static async getUser() {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error) throw error;
            return data.user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    /**
     * Sign out
     */
    static async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error signing out:', error);
            return { error };
        }
    }

    /**
     * Listen to auth state changes
     */
    static onAuthStateChange(callback: (user: any, session: any) => void) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(session?.user || null, session || null);
        });
    }

    /**
     * Update user profile
     */
    static async updateUserProfile(updates: { email?: string; password?: string; data?: any }) {
        try {
            const { data, error } = await supabase.auth.updateUser(updates);
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating user profile:', error);
            return { data: null, error };
        }
    }

    /**
     * Send password reset email
     */
    static async sendPasswordReset(email: string) {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error sending password reset:', error);
            return { data: null, error };
        }
    }
}
