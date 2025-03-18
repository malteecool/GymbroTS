import { Text, View, TouchableOpacity, ScrollView, TextInput, StyleSheet, RefreshControl, Pressable } from 'react-native';
import React, { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getExercises, removeExercise as removeExerciseService, getFirebaseTimeStamp } from '@/services/ExerciseService.Service';
import Styles from '../../../styles';
import { Card, Button } from '@rneui/themed';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Exercise } from '@/interfaces/Exercise.Interface';
import { User } from '@/interfaces/User.Interface';
import { getStordUserData } from '@/services/UserService.Service';
import { Link, router } from 'expo-router';
import emitter from '@/hooks/CustomEventEmitter';


export default function ExcerciseScreen() {
    const [isLoading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [filteredDataSource, setFilteredDataSource] = useState([]);
    const [masterDataSource, setMasterDataSource] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState<User>();

    // fetch exercises
    const load = async () => {
        try {
            setLoading(true);

            const storedUser = await getStordUserData();
            setUser(storedUser);

            const exercises = await getExercises(storedUser!.id);

            setData(exercises);
            setFilteredDataSource(exercises);
            setMasterDataSource(exercises);
        }
        catch (error) {
            console.error(error)
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const removeExercise = async (exe_id: string) => {
        try {
            setLoading(true);
            await removeExerciseService(exe_id, user!.id);
        }
        catch (error) {
            console.error(error)
        }
        finally {
            load();
        }
    };

    const searchFilterFunction = (text: string) => {
        // Check if searched text is not blank
        if (text) {
            // Inserted text is not blank
            // Filter the masterDataSource and update FilteredDataSource
            const newData = masterDataSource.filter(
                function (item: Exercise) {
                    // Applying filter for the inserted text in search bar
                    var itemData = '';
                    if (item.exe_name != null) {
                        itemData = item.exe_name ? item.exe_name.toUpperCase() : ''.toUpperCase();
                    }
                    const textData = text.toUpperCase();
                    return itemData.indexOf(textData) > -1;
                }
            );
            setFilteredDataSource(newData);
            setSearch(text);
        } else {
            // Inserted text is blank
            // Update FilteredDataSource with masterDataSource
            setFilteredDataSource(masterDataSource);
            setSearch(text);
        }
    };

    useEffect(() => {
        const listener = (data: any) => {
            load();
        };
        emitter.on('exerciseEvent', listener);

        return () => {
            emitter.off('exerciseEvent', listener);
        }

    }, []);

    const _onRefresh = React.useCallback(() => {
        load();
    }, []);

    if (isLoading) {
        return (<LoadingIndicator text={'Loading exercises...'} />)
    }

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Styles.dark.backgroundColor }}>
            <View style={Styles.searchContainer}>
                <TextInput
                    onChangeText={(text) => searchFilterFunction(text)}
                    style={Styles.searchBar}
                    placeholder='Search'
                    placeholderTextColor={Styles.fontColor.color} // Lighter placeholder text color
                />
            </View>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={_onRefresh} />}
            >{
                    filteredDataSource.map((item: Exercise, i) => {

                        var exerciseDate = getFirebaseTimeStamp(item.exe_date.seconds, item.exe_date.nanoseconds);

                        return (
                            <TouchableOpacity key={i} onPress={() => router.push({ pathname: '/shared/exerciseDetails', params: { exerciseId: item.id, title: item.exe_name } })}>
                                <Card containerStyle={Styles.card}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={Styles.cardTitle}>
                                                {item.exe_name}
                                            </Text>
                                            <Text style={{ ...Styles.fontColor, marginLeft: 10 }}>
                                                <MaterialCommunityIcons style={{ ...Styles.icon, paddingRight: 10 }} name='weight-kilogram' size={16} />
                                                {' ' + item.exe_max_weight + '  '}
                                                <MaterialCommunityIcons style={Styles.icon} name='calendar-range' size={16} />
                                                {' ' + (item.exe_date !== null ? exerciseDate.toDateString() : "Never")}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => removeExercise(item.id)} style={Styles.trashIcon}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={20} style={Styles.icon} />
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        )
                    })
                }</ScrollView>


            <TouchableOpacity style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
            }}>
                <Button onPress={() => router.push('/shared/addExercise')}
                    title='+' titleStyle={{ fontSize: 24 }} buttonStyle={{ width: 60, height: 60, borderRadius: 30, borderColor: '#1c7bc7', backgroundColor: Styles.green.backgroundColor }} />
            </TouchableOpacity>

        </View>
    )
}