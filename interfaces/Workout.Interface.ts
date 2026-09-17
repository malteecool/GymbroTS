import { Exercise } from "./Exercise.Interface";
import { AccessTier } from "./Subscription.Interface";

export type WorkoutLinkType = 'copy' | 'follow';

export interface Workout {
    id: string;
    worCompletedCount: number;
    worEstimateTime: number;
    worLastDone: string;
    worName: string;
    worUserId: string;
    isPublic?: boolean;
    /**
     * Whether the CONTENTS are free or subscriber-only. Independent of
     * `isPublic`, which governs whether the workout is listed at all — a
     * subscriber-only workout is still publicly visible as a listing (name,
     * creator, rating, follower count). That listing is the shop window; the
     * exercise list is what is gated.
     *
     * Absent on rows read before this column existed, hence optional; treat a
     * missing value as 'free', which is also the column default.
     */
    accessTier?: AccessTier;
    sourceWorkoutId?: string | null;
    linkType?: WorkoutLinkType | null;
    copyCount?: number;
    followerCount?: number;
    avgRating?: number | null;
    ratingCount?: number;
    //worExercises?: Exercise[];
}