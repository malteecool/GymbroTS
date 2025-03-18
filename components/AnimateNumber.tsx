import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

const CounterComponent = (props: { targetValue: number }) => {
    const [counter, setCounter] = useState(0);

    const { targetValue } = props;

    useEffect(() => {
        const incrementCounter = () => {
            setCounter(prevCounter => prevCounter + 1);
        };

        const intervalDuration = 1000 / Math.sqrt(counter + 100);

        if (counter < targetValue) {
            const timerId = setInterval(incrementCounter, intervalDuration);
            return () => clearInterval(timerId);
        }
    }, [counter]);

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignContent: 'center',
            marginTop: -20
        }}>
            <Text style={{
                fontSize: 60,
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#0C7C59',
            }}>{counter}</Text>
        </View>
    );
};

export default CounterComponent;