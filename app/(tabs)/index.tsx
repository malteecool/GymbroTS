import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StatsSlider from '../../components/Profile/StatsSlider';
import ProfileDetailsHeader from '../../components/Profile/ProfileDetailsHeader';
import { getWorkoutsCount, getWeekNumber } from '../../services/StatsService.Service';
import emitter from '../../hooks/CustomEventEmitter';
import { getStordUserData } from '../../services/UserService.Service';
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
        marginTop: Theme.spacing.lg,
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