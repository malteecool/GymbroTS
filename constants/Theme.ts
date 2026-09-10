import { StyleSheet, TextStyle } from 'react-native';

/**
 * Raw palette. Nothing outside this file should reference these directly -
 * components consume the semantic tokens on `Theme.colors` instead, so a
 * palette tweak only has to happen in one place.
 */
const palette = {
    ink900: '#121111',
    ink800: '#1C1A1A',
    ink700: '#232121',
    ink600: '#2E2B2B',
    ink500: '#3A3A3A',
    bone: '#E5E3D4',
    olive: '#CDCD55',
    pine: '#0C7C59',
    rust: '#E74C3C',
    white: '#FFFFFF',
    black: '#000000',
} as const;

/** Adds an 8-bit alpha suffix to a 6-digit hex colour. */
const alpha = (hex: string, opacity: number): string =>
    hex + Math.round(Math.min(Math.max(opacity, 0), 1) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();

const colors = {
    // --- Legacy aliases (kept so existing screens keep compiling) ---
    dark: palette.ink900,
    lessDark: palette.ink800,
    yellow: palette.olive,
    green: palette.pine,
    danger: palette.rust,
    accent: palette.olive,
    font: palette.bone,
    secondary: '#A9A89B',
    placeholder: '#7A7A7A',
    border: palette.ink500,
    white: palette.white,
    black: palette.black,

    // --- Surfaces ---
    /** App background, behind every screen. */
    background: palette.ink900,
    /** Default card / input surface sitting on the background. */
    surface: palette.ink800,
    /** A surface that needs to read as raised above `surface`. */
    surfaceRaised: palette.ink700,
    /** An inset well inside a card (inputs, steppers). */
    surfaceSunken: palette.ink900,

    // --- Text ---
    textPrimary: palette.bone,
    textSecondary: alpha(palette.bone, 0.7),
    textMuted: alpha(palette.bone, 0.5),
    textDisabled: alpha(palette.bone, 0.25),
    textOnAccent: palette.ink900,

    // --- Lines ---
    /** Hairline between rows inside a card. */
    divider: palette.ink600,
    /** Hairline between blocks sitting on the app background. */
    dividerSubtle: '#242222',
    /** Visible outline for inputs and secondary buttons. */
    outline: palette.ink500,

    // --- Tints ---
    accentSoft: alpha(palette.olive, 0.15),
    accentFaint: alpha(palette.olive, 0.1),
    successSoft: alpha(palette.pine, 0.15),
    dangerSoft: alpha(palette.rust, 0.15),
    neutralSoft: alpha(palette.bone, 0.1),
    overlay: 'rgba(0, 0, 0, 0.7)',
} as const;

const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
} as const;

const borderRadius = {
    sm: 5,
    md: 10,
    lg: 20,
    xl: 30,
    round: 9999,
} as const;

const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 30,
    xxxl: 35,
} as const;

const fontWeight = {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};

/**
 * Named text roles. Prefer these over picking a fontSize/weight/colour by hand
 * so type stays consistent across screens.
 */
const typography = {
    /** Large screen-level heading (hero cards, modal titles). */
    screenTitle: {
        color: colors.textPrimary,
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
    },
    /** Title of a card in a list. Deliberately modest so lists stay scannable. */
    cardTitle: {
        color: colors.textPrimary,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        letterSpacing: 0.2,
    },
    /** Small uppercase label above a group of rows. */
    sectionLabel: {
        color: colors.textSecondary,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    body: {
        color: colors.textPrimary,
        fontSize: fontSize.md,
    },
    bodyStrong: {
        color: colors.textPrimary,
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
    },
    /** Supporting facts next to a title (dates, durations, counts). */
    meta: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
    },
    caption: {
        color: colors.textMuted,
        fontSize: fontSize.xs,
    },
    /** Figures in tabular layouts - fixed-width digits keep columns aligned. */
    numeric: {
        color: colors.textPrimary,
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        fontVariant: ['tabular-nums'],
    },
} satisfies Record<string, TextStyle>;

const shadows = {
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
} as const;

export const Theme = {
    colors,
    spacing,
    borderRadius,
    fontSize,
    fontWeight,
    typography,
    shadows,
    alpha,
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
        backgroundColor: Theme.colors.background,
    },
    lessDark: {
        backgroundColor: Theme.colors.surface,
    },
    yellow: {
        backgroundColor: Theme.colors.accent,
    },
    green: {
        backgroundColor: Theme.colors.green,
    },
    fontColor: {
        color: Theme.colors.textPrimary,
    },

    // Screen scaffolding
    screen: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    listContent: {
        paddingTop: Theme.spacing.xs,
        paddingBottom: Theme.spacing.xl,
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
        borderBottomColor: Theme.colors.accent,
        borderBottomWidth: 1,
        padding: Theme.spacing.sm,
        paddingLeft: Theme.spacing.md,
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.sm,
    },
    card: {
        borderRadius: Theme.borderRadius.md,
        borderWidth: 0,
        // Explicit edges, not marginHorizontal/Vertical: Yoga gives specific
        // edges precedence, so a shorthand here loses to any longhand a
        // wrapper sets and the gaps between cards drift apart.
        marginTop: Theme.spacing.xs,
        marginBottom: Theme.spacing.xs,
        marginLeft: Theme.spacing.sm,
        marginRight: Theme.spacing.sm,
        padding: Theme.spacing.md,
        overflow: 'hidden',
        backgroundColor: Theme.colors.surface,
        ...Theme.shadows.small,
    },
    setCard: {
        marginHorizontal: Theme.spacing.xs,
        marginVertical: Theme.spacing.xs,
        borderWidth: 1,
        borderRadius: Theme.borderRadius.md,
        overflow: 'hidden',
        paddingHorizontal: 0,
        paddingBottom: 0,
        backgroundColor: Theme.colors.green,
        borderColor: Theme.colors.surface,
    },

    /** Hairline between consecutive rows inside a card. */
    rowDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.divider,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Theme.spacing.sm,
        backgroundColor: Theme.colors.background,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        paddingHorizontal: Theme.spacing.sm,
        position: 'relative',
        backgroundColor: Theme.colors.surface,
    },
    backButton: {
        position: 'absolute',
        left: Theme.spacing.sm,
    },
    headerTitle: {
        ...Theme.typography.cardTitle,
        textAlign: 'center',
    },
    headerButton: {
        padding: Theme.spacing.xs,
    },

    // Text roles
    cardTitle: Theme.typography.cardTitle,
    sectionLabel: Theme.typography.sectionLabel,

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
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.lg,
        paddingVertical: Theme.spacing.sm,
    },

    // Icons
    icon: {
        color: Theme.colors.textPrimary,
    },
    iconDark: {
        color: Theme.colors.surface,
    },

    // Search
    searchContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignContent: 'center',
        backgroundColor: Theme.colors.surface,
        paddingVertical: Theme.spacing.sm,
        paddingHorizontal: Theme.spacing.md,
    },
    searchBar: {
        width: '100%',
        height: 40,
        backgroundColor: Theme.colors.background,
        borderRadius: Theme.borderRadius.lg,
        paddingHorizontal: Theme.spacing.md,
        color: Theme.colors.textPrimary,
        fontSize: Theme.fontSize.lg,
    },

    // Container
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        backgroundColor: Theme.colors.accent,
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
        backgroundColor: Theme.colors.surface,
        opacity: 0.5,
    },
});

export default Styles;
