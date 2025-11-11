# GymbroTS - Workout Tracking App

A modern React Native/Expo app for tracking gym workouts, exercises, and training splits.

## Installation

### Requires Node.js
https://nodejs.org/en

## Run the development build

The application is developed with Expo and uses native code. To run the development build use the command below:

```bash
# Clone the repository
git clone <repository-url>
cd GymbroTS

# Install dependencies
npm install

# Run on Android (needed for native build)
npx expo run:android
```

### Development Commands

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run lint` - Run linter

## How to build

### 1. In /GymbroTS:

We use Expo Router as navigation, hence we need to provide a different entry file.

```bash
npx react-native bundle --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle
```

### 2. In /GymbroTS/android

```bash
gradlew clean
gradlew assembleRelease
```

APK will be available in `GymbroTS\android\app\build\outputs\apk\release`

## Tech Stack

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type-safe JavaScript
- **Expo Router** - File-based routing
- **Firebase** - Backend and authentication
- **React Native Elements** - UI components

## Project Structure

```
GymbroTS/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation screens
│   ├── exercise/          # Exercise-related screens
│   └── workout/           # Workout-related screens
├── components/            # Reusable components
│   ├── Profile/           # Profile components
│   └── ui/                # UI components
├── constants/             # Constants and theme
├── hooks/                 # Custom React hooks
├── interfaces/            # TypeScript interfaces
├── services/              # API and service layer
└── assets/                # Images and fonts
```

## Features

- 📊 Track workouts and exercises
- 📈 View workout statistics and trends
- 🏋️ Manage exercise sets and weights
- 📅 Create and manage workout splits
- 🔐 Google authentication
- 💾 Offline data persistence

## Recent Refactoring

The codebase has been recently refactored with the following improvements:

- ✅ Converted all services to TypeScript
- ✅ Implemented modern theme system
- ✅ Extracted authentication logic into custom hooks
- ✅ Improved component structure and reusability
- ✅ Enhanced error handling and loading states
- ✅ Modernized UI components with better UX
- ✅ Improved TypeScript usage across the codebase