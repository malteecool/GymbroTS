import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Bottom inset that keeps a screen's bottom bar clear of the on-screen keyboard.
 *
 * Android needs nothing: `windowSoftInputMode=adjustResize` shrinks the window
 * and a bar at the bottom of a flex layout rides up on its own. The trick is to
 * stay out of its way - a `KeyboardAvoidingView` on top of that resize is what
 * used to leave the composer half under the keyboard.
 *
 * iOS never resizes the window, so there the whole keyboard height is ours.
 */
export function useKeyboardInset(): number {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        if (Platform.OS !== 'ios') return;

        // `willShow` rather than `didShow`, so the bar travels with the keyboard
        // instead of jumping once it has arrived.
        const shown = Keyboard.addListener('keyboardWillShow', e => setInset(e.endCoordinates.height));
        const hidden = Keyboard.addListener('keyboardWillHide', () => setInset(0));

        return () => {
            shown.remove();
            hidden.remove();
        };
    }, []);

    return inset;
}
