# Expo Example

This example uses Expo + Nitro (new architecture). It requires **prebuild** and a dev client.

## Run

```bash
cd expo-example
npm install
npx expo install react-native expo-image-picker expo-media-library
npx expo prebuild --clean
npx expo run:android
# or
npx expo run:ios
```

## Notes

- Image picking uses `expo-image-picker`.
- Saving uses `expo-media-library`.
- The Nitro module requires native builds (Expo Go is not supported).
