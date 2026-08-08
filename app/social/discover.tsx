import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/Theme';
import { PublicProfile } from '../../interfaces/User.Interface';
import { searchUsers, followUser, unfollowUser } from '../../services/SocialService.Service';
import { useDebounce } from '../../hooks/useDebounce';

export default function DiscoverScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const runSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            setSearched(false);
            return;
        }
        try {
            setLoading(true);
            const data = await searchUsers(q.trim());
            setResults(data);
            setSearched(true);
        } catch (e) {
            console.error('Search error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useDebounce(() => { runSearch(query); }, 400, [query]);

    const handleFollowToggle = async (profile: PublicProfile) => {
        try {
            if (profile.isFollowedByMe) {
                await unfollowUser(profile.id);
            } else {
                await followUser(profile.id);
            }
            setResults(prev =>
                prev.map(p => p.id === profile.id
                    ? { ...p, isFollowedByMe: !p.isFollowedByMe }
                    : p
                )
            );
        } catch (e) {
            console.error('Follow toggle error:', e);
        }
    };

    const renderItem = ({ item }: { item: PublicProfile }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: item.id } })}
            activeOpacity={0.8}
        >
            <View style={styles.avatar}>
                <MaterialCommunityIcons name="account" size={28} color={Theme.colors.dark} />
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
            </View>
            <TouchableOpacity
                style={[styles.followBtn, item.isFollowedByMe && styles.followingBtn]}
                onPress={() => handleFollowToggle(item)}
                activeOpacity={0.8}
            >
                <Text style={[styles.followBtnText, item.isFollowedByMe && styles.followingBtnText]}>
                    {item.isFollowedByMe ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color={Theme.colors.placeholder} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name..."
                    placeholderTextColor={Theme.colors.placeholder}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={Theme.colors.placeholder} />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Theme.colors.font} />
                </View>
            ) : searched && results.length === 0 ? (
                <View style={styles.centered}>
                    <MaterialCommunityIcons name="account-search-outline" size={56} color={Theme.colors.secondary} />
                    <Text style={styles.emptyText}>No users found for "{query}"</Text>
                </View>
            ) : !searched ? (
                <View style={styles.centered}>
                    <MaterialCommunityIcons name="account-search-outline" size={56} color={Theme.colors.secondary} />
                    <Text style={styles.emptyText}>Search for gym bros to follow</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.dark,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.lg,
        margin: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
    },
    searchIcon: {
        marginRight: Theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        height: 36,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.md,
    },
    emptyText: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.md,
        textAlign: 'center',
    },
    list: {
        paddingHorizontal: Theme.spacing.md,
        paddingBottom: Theme.spacing.xl,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.lessDark,
        borderRadius: Theme.borderRadius.md,
        padding: Theme.spacing.md,
        marginBottom: Theme.spacing.sm,
        ...Theme.shadows.small,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Theme.colors.yellow,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Theme.spacing.md,
    },
    userInfo: {
        flex: 1,
        marginRight: Theme.spacing.sm,
    },
    userName: {
        color: Theme.colors.font,
        fontSize: Theme.fontSize.md,
        fontWeight: Theme.fontWeight.semibold,
    },
    userBio: {
        color: Theme.colors.secondary,
        fontSize: Theme.fontSize.sm,
        marginTop: 2,
    },
    followBtn: {
        backgroundColor: Theme.colors.yellow,
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.md,
        borderRadius: Theme.borderRadius.lg,
    },
    followingBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    followBtnText: {
        color: Theme.colors.dark,
        fontSize: Theme.fontSize.sm,
        fontWeight: Theme.fontWeight.semibold,
    },
    followingBtnText: {
        color: Theme.colors.secondary,
    },
});
