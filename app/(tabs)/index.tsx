import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Text } from "react-native";
import StatsSlider from '@/components/Profile/StatsSlider';
import ProfileDetailsHeader from '@/components/Profile/ProfileDetailsHeader';
import { getWorkoutsCount, getWeekNumber } from '../../services/StatsService.Service';
import emitter from '@/hooks/CustomEventEmitter';
import { getStordUserData } from '@/services/UserService.Service';
import { User } from '@/interfaces/User.Interface';


export interface WeeklyData {
    title: string;
    count: number;
};

const LoadingSlider = () => {
    return (<View style={styles.cardContainer}>
        <View style={{
            flex: 1,
            margin: 10,
        }}>
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignContent: 'center',
                marginTop: -20
            }}>
                <ActivityIndicator />
            </View>
        </View>
    </View>)
}


export default function ProfileScreen() {

    const [weeklyCountLoading, setWeeklyCountLoading] = useState(true);
    const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
    const [trendCountLoading, setTrendCountLoading] = useState(true);
    const [trendData, setTrendData] = useState<{ title: string; x: number[]; y: any[]; }[]>([]);
    const [user, setUser] = useState<User>();


    const createWeekylData = (data: any) => {
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
    }

    const createTrendData = (data: any) => {
        const currentWeek = getWeekNumber(new Date());
        const groupedDates = data.reduce((result: any, date: any) => {
            const weekNumber = getWeekNumber(date);
            if (!result[weekNumber]) {
                result[weekNumber] = [];
            }
            result[weekNumber].push(date);
            return result;
        }, {});

        let xArray = [];
        let yArray = [];

        for (let i = 0; i < 5; i++) {
            let x = currentWeek - i;
            if (x < 1) {
                x = 52 - Math.abs(x);
            }
            xArray.push(x);
            yArray.push(groupedDates[x] ? groupedDates[x].length : 0);
        }

        // We have to reverse the arrays since we want the graph to have 5 weeks ago on the lhs and current week on the 
        xArray = xArray.reverse();
        yArray = yArray.reverse();

        setTrendData([{
            title: '5 Week Trend',
            x: xArray,
            y: yArray
        }]);
        setTrendCountLoading(false);
    }

    const load = async () => {
        // get weekly and lifetime count
        try {

            const storedUser = await getStordUserData();
            setUser(storedUser);
            setWeeklyCountLoading(true);
            setTrendCountLoading(true);
            // Use storedUser incase the user state yet has to be updated.
            const counts = await getWorkoutsCount(storedUser);
            console.log(counts.lifetime)
            if (counts) {
                createWeekylData(counts);
                createTrendData(counts.lifetime);
            }

        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        const listener = (data: any) => {
            load();
        };
        emitter.on('profileEvent', listener);

        return () => {
            emitter.off('profileEvent', listener);
        }

    }, []);

    return (
        <View style={{
            flex: 1,
            backgroundColor: '#121111',
        }}>
            <ScrollView style={{
                flex: 1,
            }}>
                <ProfileDetailsHeader />

                {weeklyCountLoading ? (<LoadingSlider />) : (<StatsSlider stats={weeklyData} sliderComponent={'CounterComponent'} />)}

                {trendCountLoading ? (<LoadingSlider />) : (<StatsSlider stats={trendData} sliderComponent={'BarGraph'} />)}

            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#121111',
        //borderRadius: 30,
        height: 250,
        marginLeft: 5,
        marginRight: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        marginBottom: 20
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    count: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#3498db',
    },
});