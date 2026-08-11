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

### Acceptance Criteria
- [x] User can comment on any visible post
- [x] Post author sees a notification for new likes and comments
- [x] New follower triggers a follow notification
- [x] Notification badge shows unread count
- [x] Notifications link back to the relevant post or profile

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

## Phase 5 — Progress Milestones & Gamification

Automatic celebration of achievements that give users reasons to keep logging.

### Goals
- System detects and celebrates personal records and milestones
- Milestone posts can be auto-shared to feed
- Streak tracking visible on profile

### Milestones to Detect
| Trigger | Message |
|---|---|
| New max weight on exercise | "New PR: 100kg Bench Press" |
| New max reps on exercise | "New PR: 20 reps Pull-up" |
| 10th / 50th / 100th workout | "100th workout completed" |
| 7 / 30 / 90-day streak | "30-day streak" |
| First time completing a full split week | "First full week completed" |

### Database Changes
```sql
CREATE TABLE milestone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_user(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  exercise_id UUID REFERENCES exercise(id) ON DELETE SET NULL,
  value NUMERIC,
  achieved_at TIMESTAMPTZ DEFAULT now()
);
```

### Implementation Notes
- PR detection: compare new set weight/reps against `exercise.exe_max_weight` / `exe_max_reps` at save time in `ExerciseService`
- Workout count milestones: check total in `StatsService` after each completion
- Streak: computed from split completion history

### Acceptance Criteria
- [ ] New PRs are detected when logging sets
- [ ] A celebration animation plays on PR
- [ ] Milestone posts appear on the user's profile timeline
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
workout           ← is_public, copied_from, copy_count
follows           (new)
post              (new)
reaction          (new)
comment           (new)
notification      (new)
milestone         (new)
```

---

## Implementation Order

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5
Profiles     Feed         Comments    Templates    Milestones
& Follows    & Likes      & Notifs    Sharing      & Gamification
```

Each phase is independently shippable. Phase 1 and 2 together form the "social MVP" worth getting in front of users for feedback before building further.
