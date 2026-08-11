# Supabase Auth Quick Reference

## Setup

```tsx
// Wrap your app with AuthProvider (usually in root layout)
import { AuthProvider } from './providers/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Your screens */}
    </AuthProvider>
  );
}
```

## Basic Usage

### Get Auth State
```tsx
import { useAuthContext } from '@/providers/AuthProvider';

export function MyComponent() {
  const { user, session, userInfo, isLoading, error } = useAuthContext();
  
  if (isLoading) return <Text>Loading...</Text>;
  if (!user) return <Text>Not logged in</Text>;
  
  return <Text>Welcome {user.email}!</Text>;
}
```

### Sign In

```tsx
const { signInWithMagicLink, signInWithGoogle } = useAuthContext();

// Magic Link Sign In
const handleMagicLink = async (email: string) => {
  const { error } = await signInWithMagicLink(email);
  if (!error) {
    // Show: "Check your email for magic link"
  }
};

// Google Sign In
const handleGoogle = async () => {
  await signInWithGoogle();
};
```

### Sign Out

```tsx
const { signOut } = useAuthContext();

await signOut();
```

## Available Auth Methods

```tsx
interface AuthContextType {
  // State
  session: Session | null;              // Current auth session
  user: SupabaseUser | null;            // Supabase auth user
  userInfo: User | null;                // Your app user data
  isLoading: boolean;                   // Loading state
  error: Error | null;                  // Error state
  authMethod: { type: 'magic-link' | 'google' } | null;

  // Methods
  signInWithMagicLink(email: string): Promise<{ error: Error | null }>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  verifyMagicLink(token: string): Promise<{ error: Error | null }>;
}
```

## Common Patterns

### Protected Screen
```tsx
export function ProtectedScreen() {
  const { user, isLoading } = useAuthContext();

  if (isLoading) return <LoadingScreen />;
  
  if (!user) {
    return <LoginScreen />;
  }

  return <MainContent />;
}
```

### Check Authentication Status
```tsx
const { session, user } = useAuthContext();

const isAuthenticated = !!user && !!session;
```

### Access User Info
```tsx
const { userInfo } = useAuthContext();

return <Text>{userInfo?.name} ({userInfo?.email})</Text>;
```

### Handle Auth Errors
```tsx
const { error } = useAuthContext();

if (error) {
  return <ErrorBanner message={error.message} />;
}
```

## Using AuthService Directly

For non-component code or advanced usage:

```tsx
import { AuthService } from '@/services/AuthService.Service';

// Get current user
const user = await AuthService.getUser();

// Get current session
const session = await AuthService.getSession();

// Update user profile
await AuthService.updateUserProfile({
  email: 'newemail@example.com'
});

// Send password reset
await AuthService.sendPasswordReset('user@email.com');

// Listen to auth changes
const unsubscribe = AuthService.onAuthStateChange((user, session) => {
  console.log('Auth state changed:', user, session);
});

// Clean up listener
unsubscribe?.subscription.unsubscribe();
```

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=key_xxxxx

EXPO_PUBLIC_GOOGLE_CLIENT_ID=id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=id.apps.googleusercontent.com
```

## User Data

Your app's user data is stored in the `APP_USER` table and automatically fetched after login:

```tsx
const { userInfo } = useAuthContext();
// userInfo = { id, email, name }
```

## Magic Link vs Google OAuth

### Magic Link (Email)
✓ No password needed
✓ User-friendly
✓ Works on all devices
✗ Requires email access
✗ Slower verification

### Google OAuth
✓ Fast signin
✓ Already have Google account
✓ Profile data pre-filled
✗ Requires Google account
✗ Privacy considerations

## Debugging

```tsx
// Log auth state
const { session, user, userInfo } = useAuthContext();
console.log('Session:', session);
console.log('Auth User:', user);
console.log('App User:', userInfo);
```

## See Also

- [SUPABASE_AUTH_SETUP.md](./SUPABASE_AUTH_SETUP.md) - Full setup guide
- [AUTH_MIGRATION_SUMMARY.md](./AUTH_MIGRATION_SUMMARY.md) - Migration details
- [AuthService.Service.ts](./services/AuthService.Service.ts) - Service implementation
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
