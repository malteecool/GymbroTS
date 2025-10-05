import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from "react-native";
import { getWorkoutsCount } from "../../services/StatsService.Service";
import Styles from "../../Styles";
import { User } from "../../interfaces/User.Interface";
import { getStordUserData } from "../../services/UserService.Service";

export function ProfileDetailsHeader() {

    const [workoutCounts, setWorkoutCount] = useState<any>([]);
    const [isLoading, setLoading] = useState(true);
    const [user, setUser] = useState<User>();

    const load = async () => {
        try {
            setLoading(true);
            const storedUser = await getStordUserData();
            setUser(storedUser);
            const data = await getWorkoutsCount(storedUser);
            setWorkoutCount(data);
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);


    if (isLoading) {
        return (
            <ActivityIndicator style={Styles.activityIndicator} />
        )
    }

    return (
        <View style={Styles.container}>
            <TouchableOpacity style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                marginHorizontal: 10,
                marginTop: 10,
            }}
                disabled={true}>
                {<Text style={{ ...Styles.oswaldBold }}>
                    YOU'VE BEEN TO THE GYM
                    {!workoutCounts ? (<ActivityIndicator size="large" />) : (<Text style={{ ...Styles.oswaldBold, color: '#0C7C59' }}> {workoutCounts.weekly.length} </Text>)}
                    {workoutCounts && (workoutCounts.weekly.length > 1 || workoutCounts.weekly.length == 0) ? (<Text style={{ ...Styles.oswaldBold, color: '#0C7C59' }}>TIMES </Text>) : <Text style={{ ...Styles.oswaldBold, color: '#0C7C59' }}>TIME </Text>}
                    THIS WEEK, KEEP GOING!
                </Text>}
            </TouchableOpacity>

        </View>
    );

}



export default ProfileDetailsHeader;
