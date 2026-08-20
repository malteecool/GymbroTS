import React, { useState } from 'react';
import { View, Dimensions, Text, StyleSheet } from 'react-native';
import Carousel from "react-native-reanimated-carousel";
import CounterComponent from '../AnimateNumber';
import BarGraph from '../BarGraph';

const renderDynamicComponent = (sliderComponent: string, props: any) => {
    switch (sliderComponent) {
        case 'CounterComponent':
            const count = { targetValue: props.item.count };
            return <CounterComponent {...count} />
        case 'BarGraph':
            const barProps = {
                data: props.item.y,
                labels: props.item.x
            };
            return <BarGraph {...barProps} />
        default:
            return null;
    }
}

const StatsSlider = (props: { sliderComponent: string, stats: { title: string, count: number }[] | { title: string, x: number[], y: number[] }[] }) => {

    const { sliderComponent, stats } = props;

    const [activeIndex, setActiveIndex] = useState(0);
    const sliderWidth = Dimensions.get('window').width;

    const _renderItem = ({ item }: { item: { title: string, count: number } | { title: string, x: number[], y: number[] } }) => {

        return (
            <View style={styles.cardContainer}>
                <View style={{
                    flex: 1,
                    margin: 10,
                    backgroundColor: '#1c1a1a'
                }}>
                    <Text style={{
                        fontSize: 20,
                        marginLeft: 10,
                        marginTop: 10,
                        fontWeight: 'bold',
                        color: '#CDCD55'
                    }}>{item.title}</Text>
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignContent: 'center',
                        marginTop: -20
                    }}>
                        {renderDynamicComponent(sliderComponent, { item })}
                    </View>
                </View>
            </View>
        );
    }

    const dotsLength = stats.length > 1 ? stats.length : 3;
    const dotsVisible = stats.length > 1;

    return (
        <View>
            <Carousel
                loop={false}
                width={sliderWidth}
                height={250}
                data={stats}
                renderItem={_renderItem}
                onSnapToItem={(index) => setActiveIndex(index)}
            />
            <View style={styles.paginationContainer}>
                {Array.from({ length: dotsLength }).map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            {
                                opacity: dotsVisible ? (index === activeIndex ? 1 : 0.5) : 0,
                                transform: [{ scale: dotsVisible && index === activeIndex ? 1 : 0.6 }],
                            },
                        ]}
                    />
                ))}
            </View>
        </View>

    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#1c1a1a',
        borderRadius: 30,
        height: 250,
        marginLeft: 8,
        elevation: 2,
        marginBottom: 3,
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
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
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: -10,
        marginBottom: -10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'white',
    },
});


export default StatsSlider;