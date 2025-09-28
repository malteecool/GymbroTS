import { StyleSheet } from "react-native";

export default StyleSheet.create({
    dark: {
        backgroundColor: '#121111'
    },
    lessDark: {
        backgroundColor: '#1c1a1aff'
    },
    yellow: {
        backgroundColor: '#CDCD55'
    },
    green: {
        backgroundColor: '#0C7C59'
    },
    fontColor: {
        color: '#E5E3D4'
    },
    activityIndicator: {
        flex: 1, alignItems: 'center', justifyContent: 'center'
    },
    smallCard: {
        marginHorizontal: 5,
        borderWidth: 0,
        borderBottomColor: '#CDCD55',
        borderBottomWidth: 1,
        padding: 10,
        paddingLeft: 20,
        backgroundColor: '#1c1a1a',
        borderRadius: 5
    },
    card: {
        borderRadius: 0,
        marginLeft: 5,
        marginRight: 5,
        borderWidth: 0,
        marginBottom: 0,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#1c1a1a'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,

        backgroundColor: '#121111',
    },
    cardTitle: {
        //color: '#CDCD55',
        color: '#E5E3D4',
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 10,
        marginBottom: 5,
    },
    setCard: {
        marginLeft: 5,
        marginRight: 5,
        borderWidth: 0,
        marginBottom: 0,
        borderRadius: 10,
        overflow: 'hidden',
        paddingHorizontal: 0,
        paddingBottom: 0,
        borderWidth: 1,
        backgroundColor: '#0C7C59',
        borderColor: '#1c1a1a'
    },
    setTitle: {

    },
    trashIcon: {
        padding: 5,
        //marginBottom: 15,
        //marginRight: 15
    },
    details: {
        padding: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
    detailText: {
        color: '#E5E3D4',
        fontSize: 18,
        paddingVertical: 10
    },
    icon: {
        color: '#E5E3D4',
    },
    iconDark: {
        color: '#1c1a1aff',
    },
    headerTitle: {
        //fontFamily: 'Oswald-Bold',
        fontSize: 30,
        color: '#E5E3D4',
    },
    searchContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignContent: 'center',
        backgroundColor: '#1c1a1a',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    searchBar: {
        width: '100%',
        height: 40,
        backgroundColor: '#121111',
        borderRadius: 20,
        paddingHorizontal: 15,
        color: '#E5E3D4',
        fontSize: 18
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
        backgroundColor: '#CDCD55',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginLeft: 8,
        marginRight: 8,
        paddingBottom: 50,
        paddingTop: 50,
        paddingRight: 140,
        elevation: 5,
    },
    button: {
        flex: 1,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        margin: 5,
    },
    oswaldBold: {
        fontFamily: 'Oswald-Bold',
        fontSize: 35,
    },
    menuContainer: {
        flexDirection: 'column',
        padding: 30,
    },
    menuBackdrop: {
        backgroundColor: '#1c1a1a',
        opacity: 0.5,
    },
    headerContainer: {
        flexDirection: 'row',      // Arrange items in a row
        alignItems: 'center',      // Center items vertically
        justifyContent: 'center',  // Center content horizontally for the title
        height: 50,                // Set header height
        paddingHorizontal: 10,     // Add some padding on the sides
        position: 'relative',
        backgroundColor: '#1c1a1a'
    },
    backButton: {
        position: 'absolute',      // Position the back button absolutely
        left: 10,                  // Align the button to the left

    },
    headerTitle: {
        fontSize: 20,
        textAlign: 'center',
        color: '#E5E3D4'
    },
});