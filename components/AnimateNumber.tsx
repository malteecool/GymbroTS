import React, { useState, useEffect } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

interface CounterComponentProps {
    targetValue: number;
    style?: StyleProp<TextStyle>;
    duration?: number;
}

const CounterComponent = ({ targetValue, style, duration = 800 }: CounterComponentProps) => {
    const [counter, setCounter] = useState(0);

    useEffect(() => {
        if (targetValue <= 0) {
            setCounter(0);
            return;
        }

        const startTime = Date.now();
        let frameId: number;

        const tick = () => {
            const progress = Math.min((Date.now() - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCounter(Math.round(eased * targetValue));

            if (progress < 1) {
                frameId = requestAnimationFrame(tick);
            }
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [targetValue, duration]);

    return <Text style={style}>{counter}</Text>;
};

export default CounterComponent;
