// src/app/index.tsx
import React from "react";
import {
  View,
  Pressable,
  Text,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
const CIRCLE_DIAMETER = 128;
const CIRCLE_RADIUS = CIRCLE_DIAMETER / 2;
const HEART_COUNT = 8;
const HEART_DISTANCE = 150;

type Heart = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
};

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------
export default function Page() {
  const insets = useSafeAreaInsets();

  /* ────────────────  Circle shared values  ──────────────── */
  const circleX = useSharedValue(0);
  const circleY = useSharedValue(0);
  const circleScale = useSharedValue(0);

  /* ────────────────  Heart shared values  ──────────────── */
  const hearts: Heart[] = Array.from({ length: HEART_COUNT }).map(() => ({
    x: useSharedValue(0),
    y: useSharedValue(0),
    scale: useSharedValue(0),
    opacity: useSharedValue(0),
  }));

  /* ────────────────  Animated styles  ──────────────── */
  const circleStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: circleX.value - CIRCLE_RADIUS,
    top: circleY.value - CIRCLE_RADIUS,
    width: CIRCLE_DIAMETER,
    height: CIRCLE_DIAMETER,
    borderRadius: CIRCLE_RADIUS,
    backgroundColor: "#F472B6", // tailwind pink‑400
    opacity: circleScale.value * 0.7,
    transform: [{ scale: circleScale.value }],
  }));

  const heartStyles = hearts.map((heart) =>
    useAnimatedStyle(() => ({
      position: "absolute" as const,
      left: heart.x.value - 16, // half of emoji ~32 px
      top: heart.y.value - 16,
      transform: [{ scale: heart.scale.value }],
      opacity: heart.opacity.value,
    }))
  );

  /* ────────────────  Haptics helper  ──────────────── */
  const triggerHaptic = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

  /* ────────────────  Heart explosion  ──────────────── */
  const explodeHearts = (cx: number, cy: number) => {
    hearts.forEach((heart, i) => {
      const angle = (i / HEART_COUNT) * Math.PI * 2; // full circle
      const dx = Math.cos(angle) * HEART_DISTANCE;
      const dy = Math.sin(angle) * HEART_DISTANCE;

      // reset start position (centre of circle)
      heart.x.value = cx;
      heart.y.value = cy;
      heart.scale.value = 0;
      heart.opacity.value = 0;

      // animate
      heart.scale.value = withSequence(
        withDelay(i * 50, withSpring(1.2)),
        withDelay(300, withTiming(0, { duration: 300 }))
      );

      heart.opacity.value = withSequence(
        withDelay(i * 50, withTiming(1, { duration: 200 })),
        withDelay(300, withTiming(0, { duration: 300 }))
      );

      heart.x.value = withDelay(i * 50, withSpring(cx + dx));
      heart.y.value = withDelay(i * 50, withSpring(cy + dy));
    });
  };

  /* ────────────────  Touch handlers  ──────────────── */
  const handlePressIn = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;

    circleX.value = locationX;
    circleY.value = locationY;
    circleScale.value = 0;

    circleScale.value = withTiming(1, { duration: 800 }, () =>
      runOnJS(triggerHaptic)()
    );
  };

  const handleMove = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    circleX.value = locationX;
    circleY.value = locationY;
  };

  const handlePressOut = () => {
    const cx = circleX.value;
    const cy = circleY.value;

    circleScale.value = withTiming(0, { duration: 300 });
    runOnJS(explodeHearts)(cx, cy);
  };

  /* ────────────────  Render  ──────────────── */
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <Pressable
        className="w-full h-full items-center justify-center"
        delayLongPress={200}
        onPressIn={handlePressIn}
        onTouchMove={handleMove}
        onPressOut={handlePressOut}
      >
        {/* Expanding circle */}
        <Animated.View style={circleStyle} />

        <Text className="text-black text-xl mb-4">Press and hold</Text>

        {/* Exploding hearts */}
        {hearts.map((_, i) => (
          <Animated.Text key={i} style={heartStyles[i]} className="text-3xl">
            ❤️
          </Animated.Text>
        ))}
      </Pressable>
    </View>
  );
}
