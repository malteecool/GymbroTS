import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabaseConfig';

const BUCKET = 'user-content';

export type ImageSource = 'camera' | 'library';

export async function pickImage(source: ImageSource, options?: { aspect?: [number, number] }): Promise<string | null> {
    const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
        throw new Error(
            source === 'camera'
                ? 'Camera permission is required to take a photo.'
                : 'Photo library permission is required to choose a photo.'
        );
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: !!options?.aspect,
        aspect: options?.aspect,
        quality: 0.6,
    };

    const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets?.length) {
        return null;
    }

    return result.assets[0].uri;
}

export async function uploadImage(localUri: string, path: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const arrayBuffer = decode(base64);

    console.log(path)
    console.log(localUri)
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // Fixed paths (e.g. the avatar path) get overwritten in place on re-upload, so the
    // URL itself never changes - append a cache-buster or every client (RN's image
    // cache, any CDN) keeps serving the bytes from the previous upload at that URL.
    return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
    // userId must be a real folder segment (not baked into the filename) so the
    // storage.foldername(name))[2] = auth.uid() RLS check on storage.objects matches -
    // storage.foldername() only returns folder segments, not the filename itself.
    return uploadImage(localUri, `avatars/${userId}/avatar.jpg`);
}

export async function uploadPostPhoto(userId: string, localUri: string): Promise<string> {
    return uploadImage(localUri, `posts/${userId}/${Date.now()}.jpg`);
}
