import { StyleSheet } from 'react-native';

export const Theme = {
    colors: {
        dark: '#121111',
        lessDark: '#1c1a1aff',
        yellow: '#CDCD55',
        green: '#0C7C59',
        danger: '#E74C3C',
        accent: '#CDCD55',
        font: '#E5E3D4',
        secondary: '#A9A89B',
        placeholder: '#7a7a7a',
        border: '#3A3A3A',
        white: '#FFFFFF',
        black: '#000000',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 5,
        md: 10,
        lg: 20,
        xl: 30,
        round: 9999,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 24,
        xxl: 30,
        xxxl: 35,
    },
    fontWeight: {
        normal: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
        },
    },
    lineHeight: {
        sm: 16,
        md: 20,
        lg: 24,
        xl: 28,
        xxl: 32,
    },
} as const;

export const Styles = StyleSheet.create({
    // Backgrounds
    dark: {
        backgroundColor: Theme.colors.dark,
    },
    lessDark: {
        backgroundColor: Theme.colors.lessDark,
    },
    yellow: {
        backgroundColor: Theme.colors.yellow,
    },
    green: {
        backgroundColor: Theme.colors.green,
    },
    fontColor: {
        color: Theme.colors.font,
    },
    
    // Activity Indicator
    activityIndicator: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    // Cards
    smallCard: {
        marginHorizontal: Theme.spacing.xs,
        borderWidth: 0,
        borderBottomColor: Theme.colors.yellow,
        borderBottomWidth: 1,
        padding: Theme.spacing.sm,
        paddingLeft: Theme.spacing.md,
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.sm,
    },
    card: {
        borderRadius: Theme.borderRadius.md,
        marginLeft: Theme.spacing.xs,
        marginRight: Theme.spacing.xs,
        borderWidth: 0,
        marginBottom: 0,
        overflow: 'hidden',
        backgroundColor: Theme.colors.lessDark,
        ...Theme.shadows.small,
    },
    setCard: {
        marginLeft: Theme.spacing.xs,
        marginRight: Theme.spacing.xs,
        borderWidth: 1,
        marginBottom: 0,
        borderRadius: Theme.borderRadius.md,
        overflow: 'hidden',
        paddingHorizontal: 0,
        paddingBottom: 0,
        backgroundColor: Theme.colors.green,
        borderColor: Theme.colors.lessDark,
    },
    
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Theme.spacing.sm,
        backgroundColor: Theme.colors.dark,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        paddingHorizontal: Theme.spacing.sm,
        position: 'relative',
        backgroundColor: Theme.colors.lessDark,
    },
    backButton: {
        position: 'absolute',
        left: Theme.spacing.sm,
    },
    headerTitle: {
        fontSize: Theme.fontSize.lg,
        textAlign: 'center',
        color: Theme.colors.font,
        fontWeight: Theme.fontWeight.semibold,
    },
    cardTitle: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.xl,
        fontWeight: Theme.fontWeight.bold,
        marginLeft: Theme.spacing.sm,
        marginBottom: Theme.spacing.xs,
    },
    
    // Set Title
    setTitle: {
        // Add styles as needed
    },
    
    // Trash Icon
    trashIcon: {
        padding: Theme.spacing.xs,
    },
    
    // Details
    details: {
        padding: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
    detailText: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
        paddingVertical: Theme.spacing.sm,
    },
    
    // Icons
    icon: {
        color: Theme.colors.font,
    },
    iconDark: {
        color: Theme.colors.lessDark,
    },
    
    // Search
    searchContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignContent: 'center',
        backgroundColor: Theme.colors.lessDark,
        paddingVertical: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
    },
    searchBar: {
        width: '100%',
        height: 40,
        backgroundColor: Theme.colors.dark,
        borderRadius: Theme.borderRadius.lg,
        paddingHorizontal: Theme.spacing.md,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.lg,
    },
    
    // Container
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        backgroundColor: Theme.colors.yellow,
        borderBottomLeftRadius: Theme.borderRadius.xl,
        borderBottomRightRadius: Theme.borderRadius.xl,
        marginLeft: Theme.spacing.sm,
        marginRight: Theme.spacing.sm,
        paddingBottom: 50,
        paddingTop: 50,
        paddingRight: 140,
        ...Theme.shadows.medium,
    },
    
    // Button
    button: {
        flex: 1,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: Theme.colors.white,
        fontSize: Theme.fontSize.md,
    },
    
    // Profile Image
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        margin: Theme.spacing.xs,
    },
    
    // Font
    oswaldBold: {
        fontFamily: 'Oswald-Bold',
        fontSize: Theme.fontSize.xxxl,
    },
    
    // Menu
    menuContainer: {
        flexDirection: 'column',
        padding: Theme.spacing.xl,
    },
    menuBackdrop: {
        backgroundColor: Theme.colors.lessDark,
        opacity: 0.5,
    },
});

export default Styles;
