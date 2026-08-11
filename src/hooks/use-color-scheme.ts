import { useColorScheme as useReactNativeColorScheme } from 'react-native';

// Re-export the default React Native color scheme hook
export function useColorScheme() {
  return useReactNativeColorScheme();
}
