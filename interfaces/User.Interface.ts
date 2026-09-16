export interface User {
    id: string;
    name: string;
    /** Unique, lowercase, 3-20 chars of [a-z0-9_]. Assigned at signup. */
    handle: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
    isPublic?: boolean;
}

export interface PublicProfile {
    id: string;
    name: string;
    handle: string;
    bio?: string;
    avatarUrl?: string;
    followerCount: number;
    followingCount: number;
    workoutCount: number;
    isFollowedByMe: boolean;
}