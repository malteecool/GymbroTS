import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CustomHeader = (props: { title: string, subtitle: string }) => {

    const {title, subtitle} = props;
  
    return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: 'gray',
  },
});

export default CustomHeader;