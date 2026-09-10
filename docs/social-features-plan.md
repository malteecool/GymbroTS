# GymbroTS Social Features Plan

A phased roadmap for evolving GymbroTS from a personal workout tracker into a social fitness platform. Each phase builds on the previous one and can ship independently.

---

## Phase 1 — Social Foundation (Follow System + Public Profiles) ✅

The minimum viable social layer. Without this, nothing else works.

### Goals
- Users can follow and be followed
- Profiles can be made public or kept private
- Public profiles show key stats and recent activity

### Database Changes
```sql
-- migration/supabase-migration.sql updated — safe to re-run against existing data
ALTER TABLE APP_USER ADD COLUMN IF NOT EXISTS BIO TEXT;
ALTER TABLE APP_USER ADD COLUMN IF NOT EXISTS AVATAR_URL TEXT;
ALTER TABLE APP_USER ADD COLUMN IF NOT EXISTS IS_PUBLIC BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
```

### New Screens
- ✅ `app/(tabs)/social.tsx` — Social tab with empty-feed state and "Find People" button
- ✅ `app/profile/[userId].tsx` — public profile view with follow/unfollow, stats, link to followers
- ✅ `app/social/followers.tsx` — tabbed followers/following list with inline follow actions
- ✅ `app/social/discover.tsx` — debounced user search with inline follow actions
- ✅ `app/(tabs)/_layout.tsx` — search button in the Social header. Discover was
  originally reachable only from the empty-feed state, so it disappeared as soon
  as the user followed anyone

### Service Changes
- ✅ `services/SocialService.Service.ts` — `followUser`, `unfollowUser`, `isFollowing`, `getFollowers`, `getFollowing`, `searchUsers`, `getPublicProfile`
- ✅ `services/UserService.Service.ts` — added `updateProfile`, `toggleVisibility`

### Other Changes
- ✅ `interfaces/User.Interface.ts` — extended `User` with `bio`, `avatarUrl`, `isPublic`; added `PublicProfile` type
- ✅ `services/mappers/UserMapper.ts` — all new fields handled in `toDomainFromRow`, `toSupabase`, `toSupabaseUpdate`
- ✅ `hooks/useDebounce.ts` — new debounce hook used by discover screen
- ✅ `app/(tabs)/_layout.tsx` — Social tab registered with `account-group` icon
- ✅ `app/(tabs)/index.tsx` — Edit Profile modal (name + bio) and public/private toggle switch added to own profile
- ✅ `app/_layout.tsx` — Stack screens registered for all new routes

### Acceptance Criteria
- [x] User can toggle their profile between public and private
- [x] User can follow/unfollow another public user
- [x] Visiting a public profile shows name, bio, follower count, workout count
- [x] Search finds users by name

---

## Phase 2 — Workout Posts & Feed ✅

The core engagement loop: complete workout → post appears in followers' feeds.

### Goals
- Completing a workout generates a post automatically (opt-in)
- Users see a chronological feed of posts from people they follow
- Posts can be liked

### Database Changes
```sql
-- migration/supabase-migration.sql updated — safe to re-run
CREATE TABLE IF NOT EXISTS post (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
  workout_id UUID REFERENCES WORKOUT(ID) ON DELETE SET NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('workout_complete', 'pr_broken', 'milestone')),
  caption TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, user_id)
);
```

### New Screens
- ✅ `app/(tabs)/social.tsx` — live paginated feed with pull-to-refresh, infinite scroll, empty state
- ✅ `app/social/post/[postId].tsx` — single post detail view with like + delete

### New Components
- ✅ `components/Social/PostCard.tsx` — workout card with author, activity label, caption, like button, delete option for own posts
- ✅ `components/Social/WorkoutSharePrompt.tsx` — bottom sheet modal triggered after marking a split day complete

### Service Changes
- ✅ `interfaces/Post.Interface.ts` — Post type and PostType union
- ✅ `services/PostService.Service.ts` — `createPost`, `getFeed`, `getFeedForUser`, `getPostById`, `likePost`, `unlikePost`, `deletePost`
- ✅ `app/(tabs)/splitTab.tsx` — `WorkoutSharePrompt` shown when marking a day as complete
- ✅ `app/_layout.tsx` — `social/post/[postId]` stack screen registered

### Acceptance Criteria
- [x] After completing a workout, user is prompted to share it
- [x] Shared posts appear in followers' feeds
- [x] Feed shows posts from followed users in chronological order with pagination
- [x] User can like/unlike a post (optimistic update)
- [x] User can delete their own posts

---

## Phase 3 — Comments & Engagement ✅

Allow conversation around posts.

### Goals
- Users can comment on posts
- Post authors get notified of new comments and likes
- Basic in-app notification system

### Database Changes
```sql
-- migration/supabase-migration.sql updated — safe to re-run
-- Comments
CREATE TABLE IF NOT EXISTS comment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES APP_USER(ID) ON DELETE CASCADE,
  post_id UUID REFERENCES post(id) ON DELETE CASCADE,
  notif_type TEXT NOT NULL CHECK (notif_type IN ('like', 'comment', 'follow')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- notification table added to the supabase_realtime publication for badge updates
```

### New Screens / Components
- ✅ `app/social/notifications.tsx` — notification inbox, marks all read on open
- ✅ `components/Social/CommentSection.tsx` — comment list + input on post detail
- ✅ Notification badge on Social tab icon (unread count) + bell button in Social header

### Realtime
- ✅ Subscribe to `notification` table via Supabase Realtime (`hooks/useNotifications.ts`) to push badge updates without polling

### Service Changes
- ✅ `interfaces/Comment.Interface.ts`, `interfaces/Notification.Interface.ts`
- ✅ `services/CommentService.Service.ts` — addComment, deleteComment, getComments
- ✅ `services/NotificationService.Service.ts` — createNotification, getNotifications, getUnreadCount, markRead, markAllRead
- ✅ `services/PostService.Service.ts` — `likePost` now creates a like notification
- ✅ `services/SocialService.Service.ts` — `followUser` now creates a follow notification
- ✅ `providers/NotificationProvider.tsx` / `hooks/useNotifications.ts` — app-wide unread count context
- ✅ `app/(tabs)/_layout.tsx` — badge on Social tab icon, bell button in Social header
- ✅ `app/_layout.tsx` — `social/notifications` stack screen registered, tree wrapped in `NotificationProvider`

### Follow-up (delivered after the initial pass)
- ✅ `interfaces/Post.Interface.ts` — `commentCount` on `Post`, populated by every
  query that builds one via a `comment ( id )` embed. Row embed rather than a
  PostgREST `comment(count)` aggregate, to match the existing `reaction` embed
  and stay independent of the PostgREST version
- ✅ `components/Social/PostCard.tsx` — comment button + count next to the like.
  Previously the count was invisible from the feed and there was no comment
  affordance at all; a `variant` prop makes the card inert on the post detail
  screen, where tapping it used to push a second copy of the same screen
- ✅ `components/Social/CommentSection.tsx` — reports its count to the card above
  it, and emits `postCommentCountChanged` on the app event bus so the feed and
  profile timelines patch that post in place instead of going stale

### Acceptance Criteria
- [x] User can comment on any visible post
- [x] Post author sees a notification for new likes and comments
- [x] New follower triggers a follow notification
- [x] Notification badge shows unread count
- [x] Notifications link back to the relevant post or profile
- [x] Comment count is visible on the post card without opening the post

---

## Phase 4 — Workout Template Sharing (partial) ✅

Delivered narrower than originally sketched: profile-scoped browsing rather than a
global explore feed, plus a "follow" mode beyond the original copy-only design.

### Goals
- ✅ Users can publish individual workouts as public from workout details
- ✅ Visitors to a public profile can browse and copy that user's public workouts
- ✅ A second sharing mode, "follow", keeps the copied workout's exercise *list* in
  sync with the owner's future add/remove edits — while weights/reps/PRs/history
  always stay private per user (exercise rows are never shared, since PR stats live
  on the exercise row itself; see `services/WorkoutService.Service.ts`)
- Not built: a global `/social/explore` discovery feed sorted by popularity across
  all users — out of scope for this pass, still open if wanted later

### Database Changes
```sql
-- migration/supabase-migration.sql updated — safe to re-run
ALTER TABLE workout ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE workout ADD COLUMN IF NOT EXISTS source_workout_id UUID REFERENCES workout(id) ON DELETE SET NULL;
ALTER TABLE workout ADD COLUMN IF NOT EXISTS link_type TEXT CHECK (link_type IN ('copy', 'follow'));
ALTER TABLE workout ADD COLUMN IF NOT EXISTS copy_count INTEGER NOT NULL DEFAULT 0;
```
`source_workout_id` + `link_type` replace the originally-sketched `copied_from`:
NULL for organic workouts, `link_type='copy'` for a one-time independent duplicate
(attribution only), `link_type='follow'` for a workout whose exercise list is
re-synced against the source on open.

### New Screens
- ✅ `app/social/userWorkouts.tsx` — browse a public user's public workouts from
  their profile, with Copy and Follow actions
- Not built: `app/social/explore.tsx` / `app/social/template/[workoutId].tsx` (global
  discovery — see note above)

### Service Changes
- ✅ `services/WorkoutService.Service.ts` — `getPublicWorkouts`, `copyWorkout`,
  `linkWorkout`, `syncLinkedWorkout`, `unlinkWorkout`, `toggleWorkoutVisibility`
- ✅ `app/workout/workoutDetails.tsx` — public/private toggle for the owner; for
  followed workouts, a "Linked from @owner" banner + Unlink action, with sync
  triggered on load
- ✅ `app/profile/[userId].tsx` — Workouts stat is now tappable, routes to
  `social/userWorkouts`

### Acceptance Criteria
- [x] User can mark a workout as public from workout details screen
- [x] Visiting a public profile and tapping "Workouts" lists that user's public workouts
- [x] User can copy a workout — adds a full, independently-editable duplicate to their own list
- [x] User can instead follow a workout — exercise list stays in sync with the owner's edits; logged sets/PRs are always private to the follower
- [ ] Explore page sorted by popularity across all users (not built — no global feed yet)
- [ ] Preview a template's exercises before copying, from a dedicated template screen (currently previewed inline in the browse list instead)

---

## Phase 5 — Progress Milestones & Gamification (partial) ✅

Automatic recognition of achievements that give users reasons to keep logging.

### Goals
- ✅ System detects personal records (weight and reps) and milestones
- ✅ PR and milestone posts reach the feed — **via a prompt, never auto-posted**
  (deliberate: the user decides what their followers see, matching the existing
  `WorkoutSharePrompt` pattern)
- Not built: celebration animation on PR, streak on the public profile

### Milestones Detected
| Trigger | Where detected | Shown as |
|---|---|---|
| New max weight on exercise | `ExerciseService.updatePersonalRecords`, at save time | "New PR! Bench Press — 100 kg" |
| New max reps on exercise | same | "New PR! Pull-up — 20 reps" |
| 10 / 25 / 50 / 100 / 250 / 500 / 1000 workouts | `AchievementService.detectMilestone`, on workout complete | "Milestone reached! 100 workouts" |
| 7 / 14 / 30 / 60 / 90 / 180 / 365 day streak | same | "Milestone reached! 30 day streak" |

Weight and reps records from the same session are announced together as one post.
At most one milestone is offered per workout, so finishing a session never
produces a queue of sheets.

### Database Changes
**None.** `EXE_MAX_REPS` already existed in the schema and was mapped both ways in
`ExerciseMapper` — it was simply never written to. The originally-sketched
`milestone` table was not created:

```sql
-- NOT created — see "already-offered" note below
CREATE TABLE milestone (...);
```

### New Files
- ✅ `interfaces/Achievement.Interface.ts` — `PersonalRecord`, `Milestone`
- ✅ `services/AchievementService.Service.ts` — milestone thresholds, detection,
  already-offered bookkeeping, and the label/caption formatters
- ✅ `components/Social/SharePrompt.tsx` — the generic share sheet, extracted from
  `WorkoutSharePrompt` (which is now a thin config over it)
- ✅ `components/Social/AchievementSharePrompt.tsx` — `PersonalRecordSharePrompt`
  and `MilestoneSharePrompt`

### Service Changes
- ✅ `services/ExerciseService.Service.ts` — `updateExerciseMaxWeight` replaced by
  `updatePersonalRecords`, which checks weight *and* reps and returns what was
  beaten. `addExerciseHistory` now returns `{ success, personalRecords }` rather
  than a bare boolean
- ✅ `app/exercise/addSet.tsx`, `app/workout/workoutDetails.tsx` — PR sheet after
  logging sets. `ActiveExerciseCard` raises `onPersonalRecords` rather than
  rendering the sheet itself: it sits inside a card with `overflow: 'hidden'`, so
  a full-screen overlay mounted from there would be clipped to the card
- ✅ `app/workout/workoutComplete.tsx` — milestone sheet, gated behind the workout
  share and rating prompts so the three never stack

### Implementation Notes
- **PR dedupe is free.** The maxima write is the source of truth: once raised, the
  same session cannot beat it, so a record can never be announced twice.
- **Milestone dedupe is local.** `AsyncStorage` keys
  (`milestoneOffered:<userId>:<kind>:<value>`) record that we asked, so skipping a
  milestone does not bring it back after the next workout. Chosen over the
  `milestone` table to keep the feature free of a schema migration — the cost is
  that a reinstall may re-offer one milestone once. `hasBeenOffered` /
  `markMilestoneOffered` are the two functions to swap if milestone history ever
  needs to be queryable server-side.
- **PR and milestone posts carry no `workoutId`**, so the feed card would render
  only "Set a new PR" with no detail. Both prompts pre-fill an editable caption
  carrying the specifics.

### Acceptance Criteria
- [x] New PRs are detected when logging sets (weight and reps)
- [x] User is asked before a PR or milestone reaches the feed — nothing auto-posts
- [x] Milestone posts appear on the user's profile timeline
- [ ] A celebration animation plays on PR
- [ ] Streak visible on public profile

---

## Cross-Cutting Concerns

### Privacy & Safety (do throughout)
- All social data behind Supabase RLS policies
- Private profiles are invisible to non-followers — no leaking via feed queries
- Users can block others (add `block` table, filter all queries)
- Users can delete all their posts at once (account cleanup)

### Performance
- Paginate all feed and list queries (cursor-based preferred over OFFSET at scale)
- Cache avatar URLs in component state to avoid re-fetching
- Use Supabase Realtime only for notifications; feed can poll on focus

### Schema Additions Summary (all phases)
```
app_user          ← is_public, bio, avatar_url
workout           ← is_public, source_workout_id, link_type, copy_count
follows           (new)
post              (new)
reaction          (new)
comment           (new)
notification      (new)
milestone         (not created — Phase 5 dedupes in AsyncStorage instead)
block             (not created — see Privacy & Safety)
```

---

## Implementation Order

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5  →  Phase 6
Profiles     Feed         Comments    Templates    Milestones   Discovery
& Follows    & Likes      & Notifs    Sharing      & PRs        & Safety
```

Each phase is independently shippable. Phase 1 and 2 together form the "social MVP" worth getting in front of users for feedback before building further.

---

## Phase 6 — Discovery & Safety (in progress)

Phases 1–5 built the loop but not the way in. A new account follows nobody, so
`getFeedForUser` — which queries posts from `[following, self]` — returned an empty
feed with no path out of it except manual search.

### Delivered
- ✅ `services/PostService.Service.ts` — `getExploreFeed`, recent public posts from
  **public profiles**, newest first, excluding the viewer's own. The author's
  `is_public` check matters: unlike the following-feed this list is visible to
  people with no relationship to the author, so `app_user!inner` +
  `.eq('app_user.is_public', true)` keeps private profiles out of it
- ✅ `components/ui/SegmentedTabs.tsx` — extracted from the followers/following
  screen, which now uses it too
- ✅ `app/(tabs)/social.tsx` — Following / Explore tabs. Chosen over a separate
  `explore.tsx` route so the way out of an empty feed is visible on the tab the
  user already lands on; the empty following-feed also links straight into Explore
- Ordered by recency, not popularity: on a small corpus a popularity sort shows
  the same handful of posts indefinitely. Worth revisiting once volume justifies it

### Open items, roughly in priority order
1. **Block / report.** No `block` table exists (see Privacy & Safety below). Close
   to table stakes for shipped user-generated content, and both app stores expect
   report + block for UGC.
2. **Unique handles.** `app_user.name` is not unique and search is
   `ilike '%query%'` against it, so two users with the same name are
   indistinguishable. Needs `handle TEXT UNIQUE`.
3. **Social proof on search results.** `searchUsers` returns hardcoded
   `followerCount: 0` / `workoutCount: 0` stubs, so results show a bare name with
   nothing to judge by. No "people you may know" or mutual-follow hints either.

### Smaller gaps noted but not scheduled
- No standalone posting — a post is only ever a by-product of finishing a workout
  or beating a record. Possibly deliberate; worth an explicit decision.
- Can't see who liked a post, though the `reaction` rows are already there.
- Flat comments: no replies, no comment likes.
- No edit for posts or comments, only delete.
- No push notifications — `expo-notifications` is not a dependency, so the
  realtime badge only updates while the app is open.
- No @mentions, hashtags, or outward share / deep links.
