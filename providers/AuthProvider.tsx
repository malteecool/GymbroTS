import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth as useAuthHook } from '../hooks/useAuth';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '../interfaces/User.Interface';

interface AuthContextType {
    session: Session | null;
    user: SupabaseUser | null;
    userInfo: User | null;
    isLoading: boolean;
    error: Error | null;
    authMethod: { type: 'magic-link' | 'google' } | null;
    signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    verifyMagicLink: (email: string, token: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const auth = useAuthHook();

    return <AuthContext.Provider value={auth as AuthContextType}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
