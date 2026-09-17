import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabaseConfig';

const BUCKET = 'creator-content';

/**
 * Paid creator assets — the private counterpart to ImageUploadService.
 *
 * `user-content` is a public bucket: its URLs need no auth and never expire,
 * which is right for avatars and wrong for anything behind a paywall, where the
 * URL would *be* the content. This bucket is private, and reads are gated by
 * the same has_creator_access() that gates workout contents
 * (migration/rls-step6-creator-assets.sql).
 *
 * Nothing here enforces the paywall. The database does, when it decides whether
 * to sign a URL. These functions just fail cleanly when it says no.
 */

/**
 * How long a signed URL stays valid.
 *
 * Deliberately short. A signed URL keeps working until it expires no matter
 * what happens to the subscription behind it — cancel, refund, chargeback — so
 * this number is the worst-case revocation lag. Mint them on demand at the
 * point of playback; never cache one and never persist it.
 */
export const ASSET_URL_TTL_SECONDS = 120;

/**
 * creator/{creatorId}/{workoutId}/{filename}
 *
 * The shape is load-bearing, not cosmetic. storage.foldername() returns only
 * folder segments, so creatorId has to be its own segment to land at [2] where
 * every policy on this bucket looks for it. Baking the id into the filename
 * silently breaks the gate — the policies stop matching and reads fail closed.
 */
export function creatorAssetPath(creatorId: string, workoutId: string, filename: string): string {
    return `creator/${creatorId}/${workoutId}/${filename}`;
}

/**
 * Uploads an asset into the creator's own folder. The bucket accepts jpeg, png,
 * webp, mp4, quicktime and pdf, up to 500 MB.
 *
 * Reads the file into memory as base64, matching ImageUploadService. That is
 * fine for images and PDFs and NOT fine for a large video — a few hundred MB of
 * base64 will exhaust memory on a phone long before the bucket's limit bites.
 * Video needs a resumable (TUS) upload; this function is not that, and will
 * fall over if you hand it one.
 */
export async function uploadCreatorAsset(params: {
    creatorId: string;
    workoutId: string;
    filename: string;
    localUri: string;
    contentType: string;
}): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    if (user.id !== params.creatorId) {
        // The storage policy enforces this anyway; failing here keeps the error
        // legible instead of surfacing as a generic RLS violation.
        throw new Error('You can only upload assets to your own creator folder');
    }

    const path = creatorAssetPath(params.creatorId, params.workoutId, params.filename);
    const base64 = await new File(params.localUri).base64();

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, decode(base64), { contentType: params.contentType, upsert: true });

    if (error) throw error;
    return path;
}

/**
 * A short-lived URL for an asset, or null when the viewer has not paid for it.
 *
 * getPublicUrl() does not work here and must not be reached for: a private
 * bucket has no public route, so the call would return a URL that 404s. Signing
 * is what runs the entitlement check.
 *
 * A refusal is deliberately indistinguishable from a missing file — storage
 * answers "Object not found" either way, so an unsubscribed viewer cannot use
 * this to enumerate what a creator has published.
 */
export async function getCreatorAssetUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, ASSET_URL_TTL_SECONDS);

    if (error) {
        // Not an exception: "you haven't paid for this" is an expected answer
        // that the caller renders as a paywall, not an error state.
        return null;
    }
    return data?.signedUrl ?? null;
}

/**
 * Assets attached to one workout. Returns an empty list for a viewer without
 * access — the rows are filtered by the same policy, so this doubles as the
 * entitlement check when deciding whether to show a paywall.
 */
export async function listCreatorAssets(creatorId: string, workoutId: string) {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`creator/${creatorId}/${workoutId}`);

    if (error) throw error;
    return data ?? [];
}

/** Removes one of your own assets. The policy refuses anyone else's. */
export async function deleteCreatorAsset(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
}
