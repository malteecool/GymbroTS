export interface User {
    id: string;
    name: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
    isPublic?: boolean;
}

export interface PublicProfile {
    id: string;
    name: string;
    bio?: string;
    avatarUrl?: string;
    followerCount: number;
    followingCount: number;
    workoutCount: number;
    isFollowedByMe: boolean;
}