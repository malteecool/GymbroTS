# Installation

## Requires node
https://nodejs.org/en

## Run the development build
The application is developed with Expo and uses native code. To run the development build use the command below: 
clone

Cd gymbro

npm install

npx expo run:android (needed for native build)

### npx expo run:android

# how to build: 
## 1. in /gymbro:
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle

## 2. in /gymbro/android 
gradlew clean (?)

gradlew assembleRelease

APK will be available in Gymbro\android\app\build\outputs\apk\release
