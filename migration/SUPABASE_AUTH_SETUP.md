# Supabase Auth Setup Guide

This guide will help you set up Supabase authentication with Magic Links and Google OAuth.

## Environment Variables

Add these to your `.env` or `.env.local`:

```
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth - Get these from Google Cloud Console
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

## Setup Steps

### 1. Configure Magic Links in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Email** provider
4. Enable "Email Link Sign In" (magic links)
5. Set the redirect URL to: `com.malteiscool.gymbrots://auth/confirm`
6. Customize the email template if desired

### 2. Configure Google OAuth in Supabase

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new OAuth 2.0 credential
3. Add these redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `com.malteiscool.gymbrots://auth/confirm` (for native app)

4. Get your Client IDs and add to `.env`

5. In Supabase dashboard:
   - Go to **Authentication** → **Providers**
   - Enable **Google**
   - Enter your Google Client ID

### 3. Configure Deep Linking for Magic Links (React Native)

Add to `app.json`:

```json
{
  "expo": {
    "scheme": "com.malteiscool.gymbrots",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png"
        }
      ]
    ]
  }
}
```

### 4. Update Your App Component

Wrap your app with `AuthProvider`:

```tsx
import { AuthProvider } from './providers/AuthProvider';

export default function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### 5. Use Auth in Components

```tsx
import { useAuthContext } from '@/providers/AuthProvider';

export function LoginScreen() {
  const { signInWithMagicLink, signInWithGoogle, isLoading } = useAuthContext();

  const handleMagicLinkSignIn = async (email: string) => {
    const result = await signInWithMagicLink(email);
    if (!result.error) {
      // Show message: "Check your email for the magic link"
    }
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };

  return (
    <View>
      <TextInput 
        placeholder="Email" 
        onChangeText={email => setEmail(email)} 
      />
      <Button 
        title="Sign in with Magic Link" 
        onPress={() => handleMagicLinkSignIn(email)}
        disabled={isLoading}
      />
      <Button 
        title="Sign in with Google" 
        onPress={handleGoogleSignIn}
        disabled={isLoading}
      />
    </View>
  );
}
```

## Database User Table

Create an `APP_USER` table in Supabase (or sync your existing users):

```sql
CREATE TABLE APP_USER (
  ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  EMAIL VARCHAR(255) NOT NULL UNIQUE,
  NAME VARCHAR(255),
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create RLS policy
ALTER TABLE APP_USER ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own data
CREATE POLICY "Users can view own profile"
  ON APP_USER FOR SELECT
  USING (auth.uid() = ID);

-- Allow authenticated users to insert their profile
CREATE POLICY "Users can create own profile"
  ON APP_USER FOR INSERT
  WITH CHECK (auth.uid() = ID);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON APP_USER FOR UPDATE
  USING (auth.uid() = ID);
```

## User Service Updates

Update your `UserService` to use Supabase auth:

```typescript
import { supabase } from '../supabaseConfig';

export async function getUserData(userId: string) {
  const { data, error } = await supabase
    .from('APP_USER')
    .select('*')
    .eq('ID', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function setStordUserData(user: User) {
  const { data, error } = await supabase
    .from('APP_USER')
    .upsert({
      ID: user.id,
      EMAIL: user.email,
      NAME: user.name,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

## Testing Magic Links Locally

1. Use Supabase's email testing with `test+` prefix: `test+user@example.com`
2. Check the console logs in Supabase dashboard for the magic link
3. Or use a service like Mailtrap for local email testing

## Troubleshooting

### Magic link not being sent
- Check email templates in Supabase → Authentication → Email Templates
- Verify SMTP configuration
- Check that the user's email is not already registered

### Google OAuth not working
- Verify redirect URIs match exactly in Google Cloud Console
- Check that Google provider is enabled in Supabase
- Clear browser cache and cookies

### Deep linking not working
- Ensure `com.malteiscool.gymbrots` scheme is configured in `app.json`
- Test with EAS: `eas build --platform ios/android`
- For development, use `expo://<your-machine-ip>`

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Expo Auth Session](https://docs.expo.dev/modules/expo-auth-session/)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/oauth2-google)
