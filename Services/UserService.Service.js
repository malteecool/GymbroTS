import { db } from "../firebaseConfig";
import { collection, addDoc, query, getDocs, where } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

function getClientId() {
    if (Platform.OS === 'ios') {
        return process.env.EXPO_PUBLIC_REACT_APP_TOKEN;
    } else if (Platform.OS === 'android') {
        return process.env.EXPO_PUBLIC_REACT_APP_TOKEN;
    } else {
        console.log('Invalid platform - not handled');
    }
    return null;
}

async function userExist(id) {
    const collectionRef = collection(db, 'User');
    const q = query(collectionRef, where("usr_token", "==", id));
    const docSnap = await getDocs(q);

    //return first user found.
    const docData = docSnap.docs[0].data();
    return docData;
}

export async function getUserData(auth) {
    let userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${auth.accessToken}` }
    });
    const responseJson = await userInfoResponse.json();
    return responseJson;
};

export async function getStordUserData() {
    const user = await AsyncStorage.getItem('user');
    return JSON.parse(user);
}

export async function setStordUserData(userData) {
    await AsyncStorage.setItem('user', userData);
}

async function addUser(userData) {
    try {
        const dbRef = collection(db, 'User');
        const res = await addDoc(dbRef, {
            usr_name: userData.name,
            usr_token: userData.id
        });
    } catch (error) {
        console.log(error);
    }
    finally {
        return await userExist(userData.id);
    }

}

async function logout() {
    console.log('removing auth');
    await AsyncStorage.removeItem('auth');
};


/*module.exports = {
    getClientId: getClientId,
    userExist: userExist,
    getUserData: getUserData,
    addUser: addUser,
    logout: logout,
}*/