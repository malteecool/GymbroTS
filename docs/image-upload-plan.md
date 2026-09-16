# Image Upload Plan — Profile Pictures & Post Photos

Adds image support in two places:
1. **Profile picture** — set from gallery or camera, shown wherever a user's avatar
   appears (own profile, public profile, post cards).
2. **Post photo** — an optional photo attached when sharing a workout to the social
   feed via `WorkoutSharePrompt`, shown on the resulting post.

Both need the same underlying plumbing (pick image → upload to Supabase Storage →
save the resulting URL), so that plumbing is built once and reused.

Status legend: `[ ]` not started, `[~]` in progress, `[x]` done.

## Status: Working end-to-end on device — avatar upload and post photo attach both verified

All application code is written and type-checks/lints cleanly. The Supabase MCP
connector was authorized partway through device testing, so the schema/Storage
changes were applied directly and verified against the live database (see the
RETURNING/SELECT-policy finding above) rather than needing to be handed to the user
to run manually.

1. **Migration** — applied to the live Supabase database via MCP, including a policy
   fix (`"Public read access to user content"`) discovered during testing that wasn't
   in the original plan — see the SELECT-policy note above.
2. **Dev client rebuild** — `expo-image-picker` is a native module and its
   permission strings come from the new `app.json` plugin config, so a JS reload is
   not enough. Run `expo run:android` / `expo run:ios` (or a new EAS dev build)
   before testing on device/emulator.

---

## Current State (reference)

- **No image library is installed.** `package.json` has no `expo-image-picker`,
  `expo-camera`, `expo-file-system`, or `expo-image`. Everything below is new.
- **Supabase Storage is not used anywhere in this codebase** (`grep` for
  `supabase.storage` / `storage.buckets` returns nothing). Buckets and storage RLS
  policies need to be created from scratch.
- **Avatars are half-wired already:**
  - `interfaces/User.Interface.ts` — `User` and `PublicProfile` both already have
    `avatarUrl?: string`.
  - `migration/supabase-migration.sql` (line 16) — `app_user.avatar_url TEXT` column
    already exists.
  - `services/UserService.Service.ts` `updateProfile()` (lines 53-71) already writes
    `avatar_url` and refreshes the `AsyncStorage` cache — it just needs a real URL
    passed in.
  - `services/PostService.Service.ts` already selects/returns `authorAvatarUrl` on
    every `Post` (`rowToPost`, `app_user.avatar_url` join).
  - **But nothing renders it.** `components/Profile/ProfileDetailsHeader.tsx` and
    `app/(tabs)/profile.tsx` have no avatar UI at all. `components/Social/PostCard.tsx`
    (lines 56-58) renders a static placeholder circle with a generic account icon —
    `post.authorAvatarUrl` is fetched but unused.
- **Post images don't exist yet at any layer** — no `post.image_url` column, no field
  on the `Post` interface, no UI in `WorkoutSharePrompt.tsx`.
- **Share flow today**: `components/Social/WorkoutSharePrompt.tsx` is a bottom-sheet
  `Modal` with a caption `TextInput` and Skip/Share buttons, calling
  `createPost({ workoutId, postType, caption })` in `services/PostService.Service.ts`
  (lines 24-51). `components/Workout/RatingPrompt.tsx` is a sibling modal with the
  identical shape — good precedent for how a "photo step" should look and feel.
- **Native build implication**: `expo-image-picker` (camera + gallery) needs native
  modules. This project already runs on `expo-dev-client` (`expo run:android` /
  `expo run:ios` in `package.json` scripts, `expo-dev-client` installed), so adding it
  is viable, but it means **a new dev client build is required** after installing —
  a JS-only reload will not pick up the native module or the permission strings.

---

## Key Decisions (proposed defaults — flag if you want something different)

1. **Library**: `expo-image-picker` for both gallery (`launchImageLibraryAsync`) and
   camera (`launchCameraAsync`) — one library covers both entry points, matches the
   Expo SDK 52 already in use, and needs no extra native config beyond permission
   strings.
2. **Picking UI**: a small custom action-sheet-style modal ("Take Photo" / "Choose
   from Library" / "Cancel") rather than `ActionSheetIOS` (iOS-only) or a third-party
   action-sheet package, so it looks the same on Android and iOS and matches the
   existing modal styling.
3. **Cropping**: use `allowsEditing: true` with `aspect: [1, 1]` for avatars (native
   cropper, no extra library). Post photos are not force-cropped — shown as posted,
   same as most social apps.
4. **Compression**: `quality: 0.6` on the picker result. No extra resize library
   (`expo-image-manipulator`) unless real uploads turn out too large in testing.
5. **Storage layout**: one public Supabase Storage bucket, `user-content`, with two
   prefixes:
   - `avatars/{userId}/avatar.jpg` — fixed filename per user, uploaded with
     `upsert: true`, so a new avatar automatically replaces the old file (no orphan
     cleanup needed). `userId` has to be its own folder segment, not part of the
     filename, since the RLS policy below keys off the 2nd folder segment.
   - `posts/{userId}/{timestamp}.jpg` — one file per shared photo, never overwritten.
   A single bucket keeps the storage policy simple (one policy, two prefixes) instead
   of managing two buckets.
6. **Access control**: bucket is public-read (avatars/post photos are already public
   content once shared). Write access is restricted so a user can only write under
   their own `{userId}/` folder — enforced via a Storage RLS policy comparing
   `storage.foldername(name)` to `auth.uid()`.
7. **Post photo is optional**, one photo per post (not a gallery/carousel) — matches
   the ask ("attach a picture") without over-building.
8. **Deleting a post** does not need to delete its Storage file in this pass (orphaned
   post images are cheap to leave; cleanup can be a later pass if storage cost becomes
   a concern) — explicitly out of scope below.

---

## Phase A — Dependencies, permissions, and Supabase Storage setup

### Goals
- Install and configure the native image-picking capability
- Create the Storage bucket and its access policy
- Get a dev-client rebuild done early, since every later phase depends on it

### Package Changes
- [x] `npx expo install expo-image-picker expo-file-system` — adds camera + gallery
  picking and base64 file reads. Also added `base64-arraybuffer` (plain `npm install`,
  pure JS) for the base64→ArrayBuffer decode Storage upload needs
- [x] `app.json` — added the `expo-image-picker` config plugin with permission
  strings, e.g.:
  ```json
  [
    "expo-image-picker",
    {
      "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to set a profile picture or attach a photo to a post.",
      "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to take a profile picture or a post photo."
    }
  ]
  ```
- [ ] Rebuild the dev client (`expo run:android` / `expo run:ios`, or an EAS dev
  build) — **required once**, before any of this is testable on device/emulator.
  Not yet done.

### Database / Storage Changes
```sql
-- migration/supabase-migration.sql additions — safe to re-run

-- Bucket (public read, since avatars/post photos are shown to anyone who can see
-- the profile/post; writes are restricted below)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-content', 'user-content', true)
ON CONFLICT (id) DO NOTHING;

-- A user may only write inside their own "{userId}/..." folder
CREATE POLICY IF NOT EXISTS "Users can upload their own content"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-content'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can update their own content"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-content'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can delete their own content"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-content'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Also required, even though the bucket is public - see note below
CREATE POLICY IF NOT EXISTS "Public read access to user content"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');
```
Path shape is `avatars/{userId}/avatar.jpg` or `posts/{userId}/{timestamp}.jpg`, so
`(storage.foldername(name))[2]` is the userId in both cases (`[1]` is `avatars`/`posts`).
`storage.foldername()` only returns folder segments, not the filename — an earlier
draft of the avatar path (`avatars/{userId}.jpg`, userId baked into the filename) left
`[2]` NULL and every avatar upload failed RLS ("new row violates row-level security
policy") until this was caught during device testing.

**A second, separate cause of that same error took much longer to isolate**: `public = true`
on the bucket only affects the Storage API's *file-serving* GET endpoint — it does
**not** grant any SELECT policy on the `storage.objects` table itself. `storage-js`'s
`upload()` always runs `INSERT ... ON CONFLICT (...) DO UPDATE ... RETURNING *`
(upsert or not, `RETURNING *` is unconditional), and Postgres RLS requires a row
returned via `RETURNING` to also satisfy a `SELECT` policy — with none defined, every
upload failed at the RETURNING step even though the INSERT's own `WITH CHECK`
correctly passed (confirmed by reproducing the exact query directly against the
database: it fails with `RETURNING`, succeeds without it). The `"Public read access to
user content"` policy above fixes this and is the correct fix anyway, independent of
the RETURNING quirk - these are meant to be publicly readable images.

*(Note: unlike the rest of this project's schema, bucket/policy creation touches
`storage.*` system tables, not app tables. This section has been applied directly to
the live database via the Supabase MCP connector and verified working end-to-end —
this migration file is being kept in sync as the source of truth for other
environments, not the other way around.)*

**Written to `migration/supabase-migration.sql` but not yet applied** — the Supabase
MCP connector isn't authorized in this environment, so this needs to be run manually
against the live database (SQL editor or CLI), same as prior migrations in this file.
One correction versus the draft above: Postgres doesn't support
`CREATE POLICY IF NOT EXISTS`, so the applied SQL uses `DROP POLICY IF EXISTS` +
`CREATE POLICY` instead (still idempotent/safe to re-run).

### Acceptance Criteria
- [ ] Dev client rebuilds successfully with the new plugin
- [ ] A test upload via the Supabase dashboard (or a throwaway script) into
  `user-content/avatars/test.jpg` succeeds and the file is publicly fetchable by URL
- [ ] Uploading as a different (or unauthenticated) user to someone else's folder is
  rejected

---

## Phase B — Shared image picker + upload service

### Goals
- One reusable place for "let the user pick an image (camera or gallery) and upload
  it to Storage", used by both avatar and post-photo flows
- Handles permission requests, picker invocation, and the upload itself

### New Service
- [x] `services/ImageUploadService.Service.ts` (new):
  - `pickImage(options?: { aspect?: [number, number] }): Promise<string | null>` —
    shows the source-picker UI (see Component below), requests the relevant
    permission, launches camera or library, returns a local URI or `null` if
    cancelled
  - `uploadImage(localUri: string, path: string): Promise<string>` — reads the file
    (via `expo-file-system`'s `readAsStringAsync(uri, { encoding: 'base64' })`,
    decoded to an `ArrayBuffer`, since raw `fetch().blob()` uploads to Supabase
    Storage are unreliable on React Native), uploads to the `user-content` bucket at
    `path` with `upsert: true`, and returns the public URL via
    `supabase.storage.from('user-content').getPublicUrl(path)`
  - `uploadAvatar(userId: string, localUri: string): Promise<string>` — thin wrapper:
    `uploadImage(localUri, \`avatars/${userId}.jpg\`)`
  - `uploadPostPhoto(userId: string, localUri: string): Promise<string>` — thin
    wrapper: `uploadImage(localUri, \`posts/${userId}/${Date.now()}.jpg\`)`
- [x] `expo-file-system` (base64 read) + `base64-arraybuffer` package for the
  base64→ArrayBuffer decode

### New Component
- [x] `components/ui/ImagePickerSheet.tsx` (new) — bottom-sheet modal, same visual
  shape as `WorkoutSharePrompt`/`RatingPrompt` (overlay + sheet), two rows: "Take
  Photo" (camera icon) / "Choose from Library" (image icon), plus Cancel. Calls back
  with the chosen source; the actual `launchCameraAsync`/`launchImageLibraryAsync`
  call stays in `ImageUploadService` so this component is just the source-selection UI
- [x] `components/ui/Avatar.tsx` (new) — renders `avatarUrl` via core `Image` in a
  circle, falling back to the existing generic account-icon circle
  (`MaterialCommunityIcons name="account"`) when `avatarUrl` is null/undefined —
  matches the placeholder that used to be drawn inline in `PostCard.tsx`, now
  extracted and made real. Props: `uri?: string | null`, `size: number`

### Acceptance Criteria
- [ ] Tapping an "add photo" affordance anywhere shows the Take Photo / Choose from
  Library sheet
- [ ] Denying a permission shows a clear message instead of silently failing
- [ ] A picked image uploads and the function resolves with a working public URL
- [ ] Cancelling the picker (either source) is a no-op, not an error

---

## Phase C — Profile picture

### Goals
- User can set/change their profile picture from the profile screen
- The avatar shows up everywhere a user is represented: own profile, public profile
  screen, post cards, anywhere else `PublicProfile`/`Post.authorAvatarUrl` is already
  being fetched

### Screen Changes
- [x] `app/(tabs)/profile.tsx` — added a 96px `Avatar` above the Display Name field,
  wrapped in a `TouchableOpacity` that opens `ImagePickerSheet`; picking a source
  immediately calls `uploadAvatar(user.id, uri)` then `updateProfile(user.id, { name,
  bio, avatarUrl })` and saves right away (not gated behind "Save Profile"), to avoid
  a "picked but not saved" state
- [x] `app/(tabs)/profile.tsx` — spinner overlay on the avatar while
  upload/save is in flight, plus a small camera-badge affordance when idle
- [x] `app/profile/[userId].tsx` (public profile screen) — renders `Avatar` using
  `PublicProfile.avatarUrl` (was already fetched, just unused before)
- [x] `components/Social/PostCard.tsx` — replaced the static placeholder circle with
  `<Avatar uri={post.authorAvatarUrl} size={40} />`

### Acceptance Criteria
- [ ] Picking a new avatar (camera or gallery) updates it immediately on the profile
  screen and persists after app restart
- [ ] The new avatar appears on the public profile screen and on post cards for posts
  created after the change
- [ ] A user with no avatar set still sees the existing generic-account placeholder,
  not a broken image

---

## Phase D — Post photo attachment

### Goals
- Optionally attach one photo when sharing a completed workout to the feed
- Photo displays on the resulting post (feed list + post detail screen)

### Database Changes
```sql
-- migration/supabase-migration.sql additions — safe to re-run
ALTER TABLE post ADD COLUMN IF NOT EXISTS image_url TEXT;
```

### Interface / Service Changes
- [x] `interfaces/Post.Interface.ts` — added `imageUrl: string | null`
- [x] `services/PostService.Service.ts`:
  - `rowToPost()` — maps `row.image_url ?? null` to `imageUrl`
  - `createPost(params)` — accepts optional `imageUrl?: string` and inserts it as
    `image_url`

### Screen Changes
- [x] `components/Social/WorkoutSharePrompt.tsx` — added a photo step below the
  caption input: a dashed "Add Photo" placeholder that becomes the picked thumbnail
  (with a remove/× button) once one is chosen, opening `ImagePickerSheet` on tap. On
  `handleShare`, if a photo was picked, `uploadPostPhoto(userId, uri)` runs first
  (using `getStordUserData()` for the current user id), then the resulting `imageUrl`
  is passed into `createPost(...)`. The existing `sharing` state already spans both
  the upload and the post insert since both are awaited inside the same handler
- [x] `components/Social/PostCard.tsx` — renders the photo (if present) between the
  activity row and the caption, full-width, 4:3 aspect ratio
- [x] Post detail screen (`app/social/post/[postId].tsx`) — needed no changes, it
  already renders posts via `<PostCard />` rather than its own copy

### Acceptance Criteria
- [ ] Sharing a workout with no photo behaves exactly as it does today
- [ ] Sharing with a photo uploads it and the post shows the photo in the feed and in
  post detail
- [ ] Removing a picked photo before hitting Share does not upload anything
- [ ] A slow/failed upload doesn't leave the share flow stuck — surfaces an error and
  lets the user retry or share without the photo

---

## Suggested Build Order

```
Phase A  →  Phase B  →  Phase C  →  Phase D
Deps,       Reusable    Profile      Post
Storage,    picker +    picture      photo
dev build   upload svc
```

Phase A is a hard prerequisite for everything else (native rebuild). Phase B is
shared plumbing both features need. C and D are independent of each other after B
lands and could be built in either order or in parallel — C is the smaller/simpler
of the two (no schema change, one field already exists end-to-end).

## Explicitly Out of Scope (for now)
- Multiple photos per post (carousel/gallery) — one optional photo only
- Cropping/editing tools beyond the picker's built-in native crop for avatars
- Deleting the Storage file when a post is deleted (orphaned files left behind;
  revisit if storage cost/clutter becomes an actual problem)
- Image moderation/content scanning
- Client-side EXIF stripping (Supabase Storage doesn't strip it automatically; only
  worth adding if privacy of photo metadata becomes a concern)
- Editing/replacing a photo on an already-shared post
