import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, ScrollView, RefreshControl, FlatList } from "react-native";
import { Card, Button } from '@rneui/themed';
import Carousel from "react-native-snap-carousel";
import { getReferenceWeek, markDayAsCompleted } from '../../services/SplitService.Service';
import { getWeekNumber } from "../../services/StatsService.Service";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Styles from "../../Styles";
import { LoadingIndicator } from "../../components/ui/LoadingIndicator";
import emitter from "../../hooks/CustomEventEmitter";
import { getStordUserData } from "../../services/UserService.Service";
import { User } from "../../interfaces/User.Interface";
import { Workout } from "../../interfaces/Workout.Interface";

/**
 * 
 * @TODO    Optimization is needed for this component in 
 *          order to effectively render and update the list
 *          which gets quite large. Currently its strictly 
 *          set to 5 weeks but if a larger value is wanted
 *          the list handling could be switched to useMemo (possibly)
 *  
 */

export interface Day {
    completed: boolean;
    day: string;
    weekId: string;
    workout: Workout;
}

export interface Week {
    Monday: Day;
    Tuesday: Day;
    Wednesday: Day;
    Thursday: Day;
    Friday: Day;
    Saturday: Day;
    Sunday: Day;
}

export interface Split {
    splRefWeek: number | undefined;
    weeks: Week[];
}

export default function SplitScreen() {

    const sliderWidth = Dimensions.get('window').width;
    let carouselRef = useRef<Carousel<any>>(null);
    const [weekData, setWeekData] = useState<Week[]>();
    const [isLoading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const currentWeek = getWeekNumber(new Date());
    const [currentWeekLabel, setCurrentWeekLabel] = useState('Week ' + currentWeek);
    const [user, setUser] = useState<User>();

    const load = async () => {
        setLoading(true);

        const storedUser = await getStordUserData();
        setUser(storedUser);

        const data = await getReferenceWeek(storedUser.id);
        if (data) {
            setWeekData(data.weeks);
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        const listener = (data: any) => {
            load();
        };
        emitter.on('splitEvent', listener);

        return () => {
            emitter.off('splitEvent', listener);
        }

    }, []);

    const _onSnapToItem = (index: number) => {
        if (index > 0) {
            setCurrentWeekLabel('Week ' + (currentWeek + (index - 1)));
        } else {
            setCurrentWeekLabel('Reference week');
        }
    }

    const snapToNext = () => {
        if (carouselRef.current) {
            carouselRef.current.snapToNext();
        }
    }

    const snapToPrev = () => {
        if (carouselRef.current) {
            carouselRef.current.snapToPrev();
        }
    }

    const _onRefresh = React.useCallback(() => {
        load();
    }, []);

    const markAsCompleted = (week: number, day: string) => {

        if (weekData) {
            const dayKey = day as keyof Week;
            weekData[week][dayKey].completed = !weekData[week][dayKey].completed;
            const updatedWeekData = weekData.map(item => ({ ...item }));
            setWeekData(updatedWeekData);
            markDayAsCompleted(weekData[week][dayKey].weekId, weekData[week][dayKey].day, weekData[week][dayKey].completed);
        }

    }

    const FirstIndexComponent = () => {
        return (
            <View key={0} style={{ flex: 1, backgroundColor: Styles.dark.backgroundColor }}>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, justifyContent: 'center', textAlign: 'center', color: Styles.fontColor.color }}>
                        When creating a new split, all the following weeks will be based on your reference week. Add the split that you want and the following weeks will be automatically generated.
                    </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: Styles.dark.backgroundColor, alignContent: 'center' }}>
                    <Button onPress={() => { console.log("test1") }}
                        buttonStyle={{ ...Styles.green, alignSelf: 'center' }} title={'Create a new split'} />
                </View>
            </View>
        )
    }

    const _renderItem = (props: { item: Week, index: number }) => {

        const { item, index } = props;
        if (index == 0) {
            return (
                <FirstIndexComponent />
            );
        }
        const keys = Object.keys(item);
        return (
            <View style={{ flex: 1 }}>
                <FlatList
                    contentContainerStyle={{ paddingBottom: 10 }}
                    data={keys}
                    renderItem={({ item: day, index: number }) => (
                        <TouchableOpacity key={index} onPress={() => { if (item[day as keyof Week].workout) { console.log(item[day as keyof Week].workout) } }}>
                            <Card containerStyle={[Styles.card, item[day as keyof Week].completed ? Styles.green : null]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <MaterialCommunityIcons style={Styles.icon} name='calendar' size={22} />
                                            <Text style={Styles.cardTitle}>{day}</Text>
                                        </View>
                                        <Text style={{ ...Styles.fontColor, fontSize: 18, marginLeft: 10 }}>
                                            <MaterialCommunityIcons style={Styles.icon} name='weight-lifter' size={22} />
                                            {item[day as keyof Week].workout ? (' ' + item[day as keyof Week].workout.wor_name) : 'Could not find workout'}
                                        </Text>
                                    </View>
                                    <View style={{ justifyContent: 'center', alignContent: 'center', marginRight: 10 }}>
                                        <TouchableOpacity style={{ padding: 10 }} onPress={() => markAsCompleted(index, day)}>
                                            {
                                                !item[day as keyof Week].completed ?
                                                    (<MaterialCommunityIcons style={Styles.icon} name="check" size={35} />) :
                                                    (<MaterialCommunityIcons style={Styles.icon} name="window-close" size={35} />)
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={_onRefresh} />}
                />
            </View>
        );
    };

    if (isLoading) {
        return (
            <LoadingIndicator text={'Loading split...'} />
        )
    }

    if (!weekData) {
        return (
            <FirstIndexComponent />
        )
    }

    if (true) {
        return (
            <View style={{ flex: 1, backgroundColor: Styles.dark.backgroundColor, alignContent: 'center', justifyContent: 'center'}}>
                <Text style={{textAlign: 'center', color: Styles.fontColor.color}}>To be added</Text>
            </View>
        )
    }

    /*return (
        <View style={{ flex: 1, backgroundColor: Styles.dark.backgroundColor }}>
            <View style={{ flex: 1 }}>
                <View style={{ height: 60, flexDirection: 'row', alignContent: 'center', justifyContent: 'space-between', backgroundColor: Styles.lessDark.backgroundColor }}>
                    <TouchableOpacity onPress={snapToPrev}
                        style={{ justifyContent: 'center', alignContent: 'center' }}>
                        <MaterialCommunityIcons style={Styles.fontColor} name='chevron-left' size={50} />
                    </TouchableOpacity>
                    <Text style={{ ...Styles.headerTitle, marginTop: 8, fontWeight: 'bold' }}>{currentWeekLabel}</Text>
                    <TouchableOpacity onPress={snapToNext}
                        style={{ justifyContent: 'center', alignContent: 'center' }}>
                        <MaterialCommunityIcons style={Styles.fontColor} name='chevron-right' size={50} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, backgroundColor: Styles.dark.backgroundColor }}>{
                    <Carousel
                        ref={carouselRef}
                        data={weekData}
                        renderItem={_renderItem}
                        sliderWidth={sliderWidth}
                        itemWidth={sliderWidth}
                        firstItem={1}
                        onSnapToItem={_onSnapToItem}
                    >
                    </Carousel>
                }</View>
            </View>
        </View>
    )*/
}