import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthContext } from '../../providers/AuthProvider';
import { Theme } from '../../constants/Theme';

export default function LoginScreen() {
    const { 
        isLoading, 
        error, 
        signInWithMagicLink, 
        signInWithGoogle 
    } = useAuthContext();
    
    const [email, setEmail] = useState('');
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    const handleMagicLinkSignIn = async () => {
        const result = await signInWithMagicLink(email);
        if (!result.error) {
            setMagicLinkSent(true);
            setEmail('');
        }
    };

    const handleGoogleSignIn = async () => {
        await signInWithGoogle();
    };

    if (magicLinkSent) {
        return (
            <View style={styles.container}>
                <StatusBar
                    backgroundColor="transparent"
                    barStyle="light-content"
                    translucent={true}
                />
                <View style={styles.successContainer}>
                    <MaterialCommunityIcons 
                        name="email-check-outline" 
                        size={80} 
                        color={Theme.colors.accent} 
                        style={styles.successIcon}
                    />
                    <Text style={styles.successTitle}>Check your email!</Text>
                    <Text style={styles.successMessage}>
                        We've sent a magic link to verify your email address. Click the link to sign in.
                    </Text>
                </View>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => setMagicLinkSent(false)}
                >
                    <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar
                backgroundColor="transparent"
                barStyle="light-content"
                translucent={true}
            />
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.headerSection}>
                    <MaterialCommunityIcons 
                        size={120} 
                        name='dumbbell' 
                        color={Theme.colors.accent} 
                    />
                    <Text style={styles.title}>Gymbro</Text>
                    <Text style={styles.subtitle}>Track your workouts</Text>
                </View>

                {/* Auth Options */}
                <View style={styles.authSection}>
                    {/* Magic Link Section */}
                    <View style={styles.methodContainer}>
                        <Text style={styles.methodLabel}>Sign in with Email</Text>
                        <TextInput
                            style={[
                                styles.input,
                                !isLoading && styles.inputActive,
                            ]}
                            placeholder="Enter your email"
                            placeholderTextColor={Theme.colors.placeholder}
                            value={email}
                            onChangeText={setEmail}
                            editable={!isLoading}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            onPress={handleMagicLinkSignIn}
                            disabled={isLoading || !email}
                            style={[
                                styles.button,
                                styles.magicLinkButton,
                                (isLoading || !email) && styles.buttonDisabled,
                            ]}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Theme.colors.font} />
                            ) : (
                                <>
                                    <MaterialCommunityIcons 
                                        name="email-send" 
                                        size={20} 
                                        color={Theme.colors.dark}
                                        style={styles.buttonIcon}
                                    />
                                    <Text style={styles.magicLinkButtonText}>
                                        Send Magic Link
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google OAuth Section */}
                    <View style={styles.methodContainer}>
                        <TouchableOpacity
                            onPress={handleGoogleSignIn}
                            disabled={isLoading}
                            style={[
                                styles.button,
                                styles.googleButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Theme.colors.font} />
                            ) : (
                                <>
                                    <MaterialCommunityIcons 
                                        name="google" 
                                        size={20} 
                                        color={Theme.colors.font}
                                        style={styles.buttonIcon}
                                    />
                                    <Text style={styles.googleButtonText}>
                                        Sign in with Google
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Error Display */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <MaterialCommunityIcons 
                                name="alert-circle" 
                                size={20} 
                                color={Theme.colors.danger}
                                style={styles.errorIcon}
                            />
                            <Text style={styles.errorText}>
                                {error.message}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Footer Info */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Your workouts, your progress, in one place.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingVertical: Theme.spacing.xl,
        paddingHorizontal: Theme.spacing.lg,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: Theme.spacing.xl,
        marginTop: Theme.spacing.lg,
    },
    title: {
        fontSize: Theme.fontSize.xxxl,
        fontWeight: Theme.fontWeight.bold,
        color: Theme.colors.font,
        marginTop: Theme.spacing.md,
    },
    subtitle: {
        fontSize: Theme.fontSize.md,
        color: Theme.colors.secondary,
        marginTop: Theme.spacing.xs,
    },
    authSection: {
        marginVertical: Theme.spacing.xl,
    },
    methodContainer: {
        marginBottom: Theme.spacing.lg,
    },
    methodLabel: {
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
        color: Theme.colors.font,
        marginBottom: Theme.spacing.md,
    },
    input: {
        backgroundColor: Theme.colors.lessDark,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        marginBottom: Theme.spacing.md,
    },
    inputActive: {
        borderColor: Theme.colors.dark,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.lg,
        borderRadius: Theme.borderRadius.md,
        ...Theme.shadows.medium,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonIcon: {
        marginRight: Theme.spacing.sm,
    },
    magicLinkButton: {
        backgroundColor: Theme.colors.dark,
    },
    magicLinkButtonText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    googleButton: {
        backgroundColor: Theme.colors.lessDark,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    googleButtonText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Theme.spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Theme.colors.border,
    },
    dividerText: {
        marginHorizontal: Theme.spacing.md,
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
    },
    errorContainer: {
        backgroundColor: `${Theme.colors.danger}20`,
        borderLeftWidth: 4,
        borderLeftColor: Theme.colors.danger,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginTop: Theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorIcon: {
        marginRight: Theme.spacing.sm,
    },
    errorText: {
        color: Theme.colors.danger,
        fontSize: Theme.fontSize.sm,
        flex: 1,
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.lg,
    },
    successIcon: {
        marginBottom: Theme.spacing.lg,
    },
    successTitle: {
        fontSize: Theme.fontSize.xxl,
        fontWeight: Theme.fontWeight.bold,
        color: Theme.colors.font,
        marginBottom: Theme.spacing.sm,
    },
    successMessage: {
        fontSize: Theme.fontSize.md,
        color: Theme.colors.secondary,
        textAlign: 'center',
        lineHeight: Theme.lineHeight.lg,
    },
    backButton: {
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.lg,
        alignSelf: 'center',
    },
    backButtonText: {
        color: Theme.colors.accent,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    footer: {
        alignItems: 'center',
        marginTop: Theme.spacing.xl,
    },
    footerText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
