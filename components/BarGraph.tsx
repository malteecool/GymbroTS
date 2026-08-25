import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../constants/Theme';

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
        backgroundColor: Theme.colors.green,
        borderRadius: Theme.borderRadius.sm,
        marginHorizontal: 4,
        width: 36,
        minHeight: 4,
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexDirection: 'column-reverse',
    },
    barText: {
        color: Theme.colors.white,
        marginBottom: 5,
        fontWeight: 'bold',
        fontSize: Theme.fontSize.xs,
    },
    label: {
        marginTop: 3,
        marginBottom: 5,
        color: Theme.colors.yellow,
        fontWeight: 'bold',
        fontSize: Theme.fontSize.xs,
    },
});


export default BarGraph;