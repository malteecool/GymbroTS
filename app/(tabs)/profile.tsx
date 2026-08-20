import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Modal, TextInput, Switch, Alert } from "react-native";
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StatsSlider from '../../components/Profile/StatsSlider';
import ProfileDetailsHeader from '../../components/Profile/ProfileDetailsHeader';
import { getWorkoutsCount, getWeekNumber } from '../../services/StatsService.Service';
import emitter from '../../hooks/CustomEventEmitter';
import { getStordUserData, updateProfile, toggleVisibility } from '../../services/UserService.Service';
import { User } from '../../interfaces/User.Interface';
import { Theme } from '../../constants/Theme';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { useAuthContext } from '../../providers/AuthProvider';

export interface WeeklyData {
    title: string;
    count: number;
}

interface TrendData {
    title: string;
    x: number[];
    y: number[];
}

const LoadingSlider = () => {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.loadingCard}>
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color={Theme.colors.font} />
                </View>
            </View>
        </View>
    );
};

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut } = useAuthContext();
    const [weeklyCountLoading, setWeeklyCountLoading] = useState(true);
    const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
    const [trendCountLoading, setTrendCountLoading] = useState(true);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [signingOut, setSigningOut] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [publicToggleSaving, setPublicToggleSaving] = useState(false);

    const createWeeklyData = useCallback((data: { weekly: string[]; lifetime: string[] }) => {
        setWeeklyData([
            {
                title: 'This week',
                count: data.weekly.length
            },
            {
                title: 'Lifetime',
                count: data.lifetime.length
            }
        ]);
        setWeeklyCountLoading(false);
    }, []);

    const createTrendData = useCallback((data: string[]) => {
        const currentWeek = getWeekNumber(new Date());
        const groupedDates = data.reduce((result: Record<number, string[]>, date: string) => {
            const weekNumber = getWeekNumber(new Date(date));
            if (!result[weekNumber]) {
                result[weekNumber] = [];
            }
            result[weekNumber].push(date);
            return result;
        }, {});

        const xArray: number[] = [];
        const yArray: number[] = [];

        for (let i = 0; i < 5; i++) {
            let x = currentWeek - i;
            if (x < 1) {
                x = 52 - Math.abs(x);
            }
            xArray.push(x);
            yArray.push(groupedDates[x] ? groupedDates[x].length : 0);
        }

        // Reverse arrays to show 5 weeks ago on the left and current week on the right
        xArray.reverse();
        yArray.reverse();

        setTrendData([{
            title: '5 Week Trend',
            x: xArray,
            y: yArray
        }]);
        setTrendCountLoading(false);
    }, []);

    const load = useCallback(async () => {
        try {
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                return;
            }

            setUser(storedUser);
            setWeeklyCountLoading(true);
            setTrendCountLoading(true);

            const counts = await getWorkoutsCount(storedUser);

            if (counts) {
                createWeeklyData(counts);
                createTrendData(counts.lifetime);
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }, [createWeeklyData, createTrendData]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const listener = () => {
            load();
        };
        emitter.on('profileEvent', listener);

        return () => {
            emitter.off('profileEvent', listener);
        };
    }, [load]);

    const openEditModal = () => {
        setEditName(user?.name ?? '');
        setEditBio(user?.bio ?? '');
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        if (!editName.trim()) {
            Alert.alert('Name required', 'Please enter a display name.');
            return;
        }
        try {
            setEditSaving(true);
            const updated = await updateProfile(user.id, { name: editName.trim(), bio: editBio.trim() || undefined });
            setUser(updated);
            setEditModalVisible(false);
        } catch (e) {
            Alert.alert('Error', 'Could not save profile. Please try again.');
        } finally {
            setEditSaving(false);
        }
    };

    const handleToggleVisibility = async (value: boolean) => {
        if (!user) return;
        try {
            setPublicToggleSaving(true);
            await toggleVisibility(user.id, value);
            setUser(u => u ? { ...u, isPublic: value } : u);
        } catch (e) {
            Alert.alert('Error', 'Could not update visibility. Please try again.');
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

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ProfileDetailsHeader />

                {weeklyCountLoading ? (
                    <LoadingSlider />
                ) : (
                    <StatsSlider
                        stats={weeklyData}
                        sliderComponent={'CounterComponent'}
                    />
                )}

                {trendCountLoading ? (
                    <LoadingSlider />
                ) : (
                    <StatsSlider
                        stats={trendData}
                        sliderComponent={'BarGraph'}
                    />
                )}

                <View style={styles.profileActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={openEditModal} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="account-edit-outline" size={20} color={Theme.colors.font} />
                        <Text style={styles.actionButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

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
            </ScrollView>

            <Modal
                visible={editModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={Theme.colors.font} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Your name"
                            placeholderTextColor={Theme.colors.placeholder}
                            maxLength={60}
                        />

                        <Text style={styles.inputLabel}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={editBio}
                            onChangeText={setEditBio}
                            placeholder="Tell people about your training..."
                            placeholderTextColor={Theme.colors.placeholder}
                            multiline
                            maxLength={160}
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, editSaving && styles.saveButtonDisabled]}
                            onPress={handleSaveProfile}
                            disabled={editSaving}
                            activeOpacity={0.8}
                        >
                            {editSaving ? (
                                <ActivityIndicator size="small" color={Theme.colors.dark} />
                            ) : (
                                <Text style={styles.saveButtonText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Theme.spacing.xl,
    },
    cardContainer: {
        backgroundColor: Theme.colors.dark,
        height: 250,
        marginHorizontal: Theme.spacing.xs,
        marginBottom: Theme.spacing.md,
        ...Theme.shadows.small,
    },
    loadingCard: {
        flex: 1,
        margin: Theme.spacing.sm,
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignContent: 'center',
        marginTop: -20,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Theme.spacing.md,
        marginTop: Theme.spacing.md,
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
    profileActions: {
        marginHorizontal: Theme.spacing.md,
        marginTop: Theme.spacing.lg,
        gap: Theme.spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.lessDark,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        ...Theme.shadows.small,
    },
    actionButtonText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.medium,
    },
    visibilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Theme.colors.lessDark,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: Theme.colors.lessDark,
        borderTopLeftRadius: Theme.borderRadius.xl,
        borderTopRightRadius: Theme.borderRadius.xl,
        padding: Theme.spacing.lg,
        paddingBottom: Theme.spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Theme.spacing.lg,
    },
    modalTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xl,
        fontWeight: Theme.fontWeight.bold,
    },
    inputLabel: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.medium,
        marginBottom: Theme.spacing.xs,
        marginLeft: Theme.spacing.xs,
    },
    input: {
        backgroundColor: Theme.colors.dark,
        color: Theme.colors.font,
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.md,
        fontSize: Theme.fontSize.md,
        marginBottom: Theme.spacing.md,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    bioInput: {
        height: 90,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: Theme.colors.yellow,
        paddingVertical: Theme.spacing.md,
        borderRadius: Theme.borderRadius.md,
        alignItems: 'center',
        marginTop: Theme.spacing.sm,
        ...Theme.shadows.small,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.bold,
    },
});