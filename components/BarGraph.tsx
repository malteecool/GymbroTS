import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BarGraph = (props: { data: number[], labels: string[] }) => {

    const { data, labels } = props;

    const renderBars = () => {
        return data.map((item: number, index: number) => (
            <View key={index} style={styles.barContainer}>
                <Text style={styles.label}>{labels && labels[index]}</Text>
                <View style={[styles.bar, { height: item * 20 }]}>
                    <Text style={styles.barText}>{item}</Text>
                </View>
            </View>
        ));
    };

    return (
        <View style={styles.container}>
            <View style={styles.chart}>
                {
                    renderBars()
                }
            </View>
        </View>

    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flex: 1,
        marginLeft: 10,
        marginRight: 10
    },
    chart: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'column-reverse',
    },
    bar: {
        backgroundColor: '#0C7C59',
        marginHorizontal: 2,
        width: 50,
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexDirection: 'column-reverse',
    },
    barText: {
        color: 'white',
        marginBottom: 5,
        fontWeight: 'bold'
    },
    label: {
        marginTop: 3,
        marginBottom: 5,
        color: '#CDCD55',
        fontWeight: 'bold',
    },
});


export default BarGraph;