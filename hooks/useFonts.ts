import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

export function useFonts() {
    const [fontsLoading, setFontsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadFonts = async () => {
            try {
                await Font.loadAsync({
                    'Oswald-Bold': require('../assets/fonts/Oswald-Bold.ttf'),
                });
                setFontsLoading(false);
            } catch (err) {
                console.error('Error loading fonts:', err);
                setError(err instanceof Error ? err : new Error('Font loading failed'));
                setFontsLoading(false);
            }
        };

        loadFonts();
    }, []);

    return { fontsLoading, error };
}
