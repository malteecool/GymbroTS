import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from "../interfaces/User.Interface";
import { supabase } from "../supabaseConfig";
import { UserMapper } from "./mappers/UserMapper";

export async function getUserDataById(id: string): Promise<User | null> {
    console.log("getting user data with id:" , id)
    try {
        const { data, error } = await supabase
            .from('app_user')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('1 Error fetching user data by id:', error);
            return null;
        }

        if (!data) {
            return null;
        }

        // Map the database row to domain User object
        const user = UserMapper.toDomain(data);
        return user;
    } catch (error) {
        console.error('2 Error fetching user data by id:', error);
        return null;
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
