import { db } from "../firebaseConfig";
import { collection, addDoc, query, getDocs, where, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from "../interfaces/User.Interface";
import * as AuthSession from 'expo-auth-session';

export interface UserDocument {
    usr_name: string;
    usr_token: string;
}

function getClientId(): string | null {
    return process.env.EXPO_PUBLIC_REACT_APP_TOKEN || null;
}

async function userExist(id: string): Promise<UserDocument | undefined> {
    try {
        const collectionRef = collection(db, 'User');
        const q = query(collectionRef, where("usr_token", "==", id));
        const docSnap = await getDocs(q);

        if (docSnap.empty) {
            return undefined;
        }

        // Return first user found
        return docSnap.docs[0].data() as UserDocument;
    } catch (error) {
        console.error('Error checking if user exists:', error);
        return undefined;
    }
}

export async function getUserData(auth: AuthSession.TokenResponse): Promise<User & { error?: { code: number } }> {
    try {
        const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${auth.accessToken}` }
        });
        
        if (!userInfoResponse.ok) {
            return { error: { code: userInfoResponse.status } } as User & { error: { code: number } };
        }
        
        const responseJson = await userInfoResponse.json();
        return responseJson as User;
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
    }
}

export async function getStordUserData(): Promise<User | null> {
    try {
        const user = await AsyncStorage.getItem('user');
        return user ? JSON.parse(user) as User : null;
    } catch (error) {
        console.error('Error getting stored user data:', error);
        return null;
    }
}

export async function setStordUserData(userData: User): Promise<void> {
    try {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
        console.error('Error storing user data:', error);
        throw error;
    }
}

async function addUser(userData: User): Promise<UserDocument | undefined> {
    try {
        const dbRef = collection(db, 'User');
        await addDoc(dbRef, {
            usr_name: userData.name,
            usr_token: userData.id
        });
        return await userExist(userData.id);
    } catch (error) {
        console.error('Error adding user:', error);
        return undefined;
    }
}

export async function logout(): Promise<void> {
    try {
        console.log('Removing auth');
        await AsyncStorage.removeItem('auth');
    } catch (error) {
        console.error('Error logging out:', error);
        throw error;
    }
}

export { getClientId, userExist, addUser };
