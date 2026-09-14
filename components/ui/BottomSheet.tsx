import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
    View, TouchableOpacity, StyleSheet, Animated, Easing, BackHandler, StyleProp, ViewStyle,
} from 'react-native';
import { Theme } from '../../constants/Theme';

const ENTER_DURATION = 240;
/** Quicker on the way out - a slow dismissal reads as lag, not polish. */
const EXIT_DURATION = 180;

interface BottomSheetProps {
    visible: boolean;
    /** Backdrop tap and the Android back button both route here. */
    onRequestClose: () => void;
    /** false while a write is in flight, so the sheet cannot be dismissed mid-save. */
    dismissible?: boolean;
    /**
     * Fires once the closing slide has finished. Anything that opens a second
     * overlay in place of this one should wait for it, so the two do not cross
     * on screen.
     */
    onClosed?: () => void;
    children: ReactNode;
    /** Extra padding/layout for the content block inside the sheet. */
    contentStyle?: StyleProp<ViewStyle>;
    /**
     * Stacking order against other overlays on the same screen. The shared image
     * picker sits at 1000 above every screen, so anything that opens it must
     * stay below that.
     */
    zIndex?: number;
}

/**
 * A sheet that rises from the bottom over a dimmed backdrop, and slides back
 * down when dismissed.
 *
 * It stays mounted for the length of the exit so the closing animation can
 * actually play - callers flip `visible` and this decides when to stop
 * rendering. Children keep their state for that extra moment, so anything with
 * content to show while closing has to hold on to it (see PostEditSheet).
 *
 * Deliberately not React Native's <Modal>: on Android a standalone Modal can
 * fail to size its native window and render collapsed in the corner. A plain
 * absolute overlay avoids the native window entirely.
 */
export function BottomSheet({
    visible,
    onRequestClose,
    dismissible = true,
    onClosed,
    children,
    contentStyle,
    zIndex = 1000,
}: BottomSheetProps) {
    const [rendered, setRendered] = useState(visible);
    // Travel distance for the slide. Unknown until the sheet has laid out once,
    // and it changes with the content (a photo added to an edit sheet).
    const [sheetHeight, setSheetHeight] = useState(0);
    const progress = useRef(new Animated.Value(0)).current;
    const wasVisible = useRef(visible);

    // Held in a ref so a caller passing an inline arrow does not restart the
    // close animation on every render.
    const onClosedRef = useRef(onClosed);
    useEffect(() => { onClosedRef.current = onClosed; }, [onClosed]);

    useEffect(() => {
        if (visible) {
            wasVisible.current = true;
            setRendered(true);
            return;
        }
        // A sheet that has never been open has nothing to animate away, and
        // must not report a close that did not happen.
        if (!wasVisible.current) return;
        wasVisible.current = false;

        Animated.timing(progress, {
            toValue: 0,
            duration: EXIT_DURATION,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            // Interrupted means it was reopened mid-close, so leave it mounted.
            if (!finished) return;
            setRendered(false);
            onClosedRef.current?.();
        });
    }, [visible, progress]);

    // Held back until the height is known, otherwise the first frame would put
    // the sheet at its resting place and it would appear rather than rise.
    useEffect(() => {
        if (!visible || sheetHeight === 0) return;
        Animated.timing(progress, {
            toValue: 1,
            duration: ENTER_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [visible, sheetHeight, progress]);

    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (dismissible) onRequestClose();
            return true;
        });
        return () => sub.remove();
    }, [visible, dismissible, onRequestClose]);

    if (!rendered) return null;

    const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [sheetHeight, 0],
    });

    return (
        <View
            style={[styles.root, { zIndex, elevation: zIndex }]}
            // Taps during the closing slide would land on a sheet already on its
            // way out, so let them through to the screen instead.
            pointerEvents={visible ? 'box-none' : 'none'}
        >
            <Animated.View style={[styles.backdrop, { opacity: progress }]} />

            <TouchableOpacity
                style={styles.backdropTouch}
                activeOpacity={1}
                onPress={() => { if (dismissible) onRequestClose(); }}
            >
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY }],
                            // Nothing to slide from yet on the very first layout.
                            opacity: sheetHeight === 0 ? 0 : 1,
                        },
                    ]}
                    onLayout={e => setSheetHeight(e.nativeEvent.layout.height)}
                >
                    {/* Swallows taps on the sheet itself so they do not close it. */}
                    <TouchableOpacity style={[styles.content, contentStyle]} activeOpacity={1}>
                        {children}
                    </TouchableOpacity>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Theme.colors.overlay,
    },
    backdropTouch: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Theme.colors.surface,
        borderTopLeftRadius: Theme.borderRadius.xl,
        borderTopRightRadius: Theme.borderRadius.xl,
        // Tall content (a long option list) would otherwise run off the top of
        // the screen, since the sheet is pinned to the bottom. Children that can
        // outgrow this have to scroll - see ActionSheet.
        maxHeight: '90%',
        overflow: 'hidden',
    },
    content: {
        padding: Theme.spacing.lg,
        paddingBottom: Theme.spacing.xl,
        gap: Theme.spacing.sm,
        // Lets the cap above actually bite instead of the content overflowing it.
        flexShrink: 1,
    },
});
