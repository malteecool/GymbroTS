import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { User } from '../../interfaces/User.Interface';
import { getStordUserData, toggleVisibility } from '../../services/UserService.Service';
import { useAuthContext } from '../../providers/AuthProvider';

export default function ProfileSettingsScreen() {
    const router = useRouter();
    const { signOut } = useAuthContext();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [publicToggleSaving, setPublicToggleSaving] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            setUser(storedUser);
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleToggleVisibility = async (value: boolean) => {
        if (!user) return;
        try {
            setPublicToggleSaving(true);
            await toggleVisibility(user.id, value);
            setUser(u => u ? { ...u, isPublic: value } : u);
        } catch (e) {
            console.error('Error updating visibility:', e);
        } finally {
            setPublicToggleSaving(false);
        }
    };

    const handleSignOut = async () => {
        try {
            setSigningOut(true);
            await signOut();
            router.replace('/(auth)/LoginScreen');
        } catch (error) {
            console.error('Error signing out:', error);
            setSigningOut(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.visibilityRow}>
                <View style={styles.visibilityInfo}>
                    <MaterialCommunityIcons
                        name={user?.isPublic ? 'earth' : 'lock-outline'}
                        size={20}
                        color={user?.isPublic ? Theme.colors.yellow : Theme.colors.secondary}
                    />
                    <View style={styles.visibilityTextBlock}>
                        <Text style={styles.visibilityLabel}>
                            {user?.isPublic ? 'Public Profile' : 'Private Profile'}
                        </Text>
                        <Text style={styles.visibilityHint}>
                            {user?.isPublic ? 'Others can find and follow you' : 'Only you can see your profile'}
                        </Text>
                    </View>
                </View>
                {publicToggleSaving ? (
                    <ActivityIndicator size="small" color={Theme.colors.yellow} />
                ) : (
                    <Switch
                        value={user?.isPublic ?? false}
                        onValueChange={handleToggleVisibility}
                        trackColor={{ false: Theme.colors.border, true: Theme.colors.yellow }}
                        thumbColor={Theme.colors.white}
                    />
                )}
            </View>

            <TouchableOpacity
                style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
                onPress={handleSignOut}
                disabled={signingOut}
                activeOpacity={0.7}
            >
                {signingOut ? (
                    <ActivityIndicator size="small" color={Theme.colors.white} />
                ) : (
                    <>
                        <MaterialCommunityIcons name="logout" size={20} color={Theme.colors.white} />
                        <Text style={styles.signOutButtonText}>Sign Out</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
        padding: Theme.spacing.md,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.background,
    },
    visibilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Theme.colors.surface,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        marginBottom: Theme.spacing.lg,
        ...Theme.shadows.small,
    },
    visibilityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        flex: 1,
    },
    visibilityTextBlock: {
        flex: 1,
    },
    visibilityLabel: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    visibilityHint: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.xs,
        marginTop: 2,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.md,
        backgroundColor: Theme.colors.danger,
        borderRadius: Theme.spacing.sm,
        ...Theme.shadows.small,
    },
    signOutButtonDisabled: {
        opacity: 0.6,
    },
    signOutButtonText: {
        color: Theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: Theme.spacing.sm,
    },
});
