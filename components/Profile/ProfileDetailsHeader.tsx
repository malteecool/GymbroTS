import React, { useState, useEffect, useCallback } from "react";
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from "react-native";
import { getWorkoutsCount } from "../../services/StatsService.Service";
import { Theme } from "../../constants/Theme";
import { User } from "../../interfaces/User.Interface";
import { getStordUserData } from "../../services/UserService.Service";

export function ProfileDetailsHeader() {
    const [workoutCounts, setWorkoutCount] = useState<{ weekly: string[]; lifetime: string[] } | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            if (!storedUser) {
                console.error('User not found');
                return;
            }

            setUser(storedUser);
            const data = await getWorkoutsCount(storedUser);
            setWorkoutCount(data);
        } catch (error) {
            console.error('Error loading workout counts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Theme.colors.font} />
            </View>
        );
    }

    const weeklyCount = workoutCounts?.weekly.length || 0;
    const timeText = weeklyCount === 1 ? "TIME" : "TIMES";

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.content}
                disabled={true}
                activeOpacity={1}
            >
                <Text style={styles.text}>
                    YOU'VE BEEN TO THE GYM
                    {' '}
                    <Text style={styles.highlight}>{weeklyCount}</Text>
                    {' '}
                    <Text style={styles.highlight}>{timeText}</Text>
                    {' '}
                    THIS WEEK, KEEP GOING!
                </Text>
            </TouchableOpacity>
        </View>
    );
}

export default ProfileDetailsHeader;

const styles = StyleSheet.create({
    container: {
        ...Theme.shadows.medium,
        backgroundColor: Theme.colors.yellow,
        borderBottomLeftRadius: Theme.borderRadius.xl,
        borderBottomRightRadius: Theme.borderRadius.xl,
        marginHorizontal: Theme.spacing.sm,
        marginBottom: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl * 1.5,
        paddingTop: Theme.spacing.xl * 1.5,
        paddingRight: 140,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: Theme.spacing.sm,
        marginTop: Theme.spacing.sm,
    },
    text: {
        fontFamily: 'Oswald-Bold',
        fontSize: Theme.fontSize.xxxl,
        color: Theme.colors.dark,
        textAlign: 'center',
    },
    highlight: {
        color: Theme.colors.green,
    },
});