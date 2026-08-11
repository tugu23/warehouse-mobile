import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  StyleProp,
} from 'react-native';
import { Colors, BorderRadius, FontSizes, Spacing } from '@/constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const variantContainerStyles: Record<string, ViewStyle> = {
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.secondary },
  outline: { backgroundColor: Colors.transparent, borderWidth: 1, borderColor: Colors.primary },
  destructive: { backgroundColor: Colors.destructive },
  ghost: { backgroundColor: Colors.transparent },
};

const variantTextStyles: Record<string, TextStyle> = {
  primary: { color: Colors.white },
  secondary: { color: Colors.primary },
  outline: { color: Colors.primary },
  destructive: { color: Colors.white },
  ghost: { color: Colors.foreground },
};

const sizeContainerStyles: Record<string, ViewStyle> = {
  sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  md: { paddingVertical: Spacing.md - 4, paddingHorizontal: Spacing.lg },
  lg: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
};

const sizeTextStyles: Record<string, TextStyle> = {
  sm: { fontSize: FontSizes.sm },
  md: { fontSize: FontSizes.md },
  lg: { fontSize: FontSizes.lg },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantContainerStyles[variant],
        sizeContainerStyles[size],
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? Colors.white : Colors.primary}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.text, sizeTextStyles[size], variantTextStyles[variant]]}>
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
