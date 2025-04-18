// src/app/index.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  GestureResponderEvent,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function Page() {
  const insets = useSafeAreaInsets();

  /* ----------------------------------------------------------------- */
  /*               Shared values that drive every animation            */
  /* ----------------------------------------------------------------- */
  const circleScale = useSharedValue(0);
  const circleTop = useSharedValue(0);
  const circleLeft = useSharedValue(0);
  const isPressed = useSharedValue(false);

  const hearts = Array(8)
    .fill(0)
    .map(() => ({
      top: useSharedValue(0),
      left: useSharedValue(0),
      scale: useSharedValue(0),
      opacity: useSharedValue(0),
    }));

  /* ----------------------------------------------------------------- */
  /*                         Animated styles                           */
  /* ----------------------------------------------------------------- */

  const circleStyle = useAnimatedStyle<ViewStyle>(() => ({
    top: circleTop.value,
    left: circleLeft.value,
    opacity: circleScale.value * 0.7,
    transform: [{ scale: circleScale.value }],
  }));

  const heartStyles = hearts.map((heart) =>
    useAnimatedStyle<TextStyle>(() => ({
      top: heart.top.value,
      left: heart.left.value,
      opacity: heart.opacity.value,
      transform: [{ scale: heart.scale.value }],
    }))
  );

  /* ----------------------------------------------------------------- */
  /*                            Animations                             */
  /* ----------------------------------------------------------------- */

  const triggerHaptic = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

  const animateHearts = (x: number, y: number) => {
    hearts.forEach((heart, index) => {
      const angle = (index / hearts.length) * Math.PI * 2;
      const distance = 150;

      /* reset */
      heart.scale.value = 0;
      heart.opacity.value = 0;
      heart.left.value = x - 16;
      heart.top.value = y - 16;

      /* scale & fade */
      heart.scale.value = withSequence(
        withDelay(index * 50, withSpring(1.2)),
        withDelay(300, withTiming(0, { duration: 300 }))
      );
      heart.opacity.value = withSequence(
        withDelay(index * 50, withTiming(1, { duration: 200 })),
        withDelay(300, withTiming(0, { duration: 300 }))
      );

      /* radial move */
      heart.left.value = withSequence(
        withDelay(index * 50, withSpring(x + Math.cos(angle) * distance - 16))
      );
      heart.top.value = withSequence(
        withDelay(index * 50, withSpring(y + Math.sin(angle) * distance - 16))
      );
    });
  };

  /* ----------------------------------------------------------------- */
  /*                     Touch‑event handlers                          */
  /* ----------------------------------------------------------------- */

  /** Convert absolute page coordinates to inside‑container coordinates */
  const toLocal = (e: GestureResponderEvent) => ({
    x: e.nativeEvent.pageX - insets.left,
    y: e.nativeEvent.pageY - insets.top,
  });

  const handlePressIn = (e: GestureResponderEvent) => {
    isPressed.value = true;

    const { x, y } = toLocal(e);
    circleLeft.value = x - 64; //   center 128‑px circle
    circleTop.value = y - 64;

    circleScale.value = 0;
    circleScale.value = withTiming(1, { duration: 800 }, () =>
      runOnJS(triggerHaptic)()
    );
  };

  const handleMove = (e: GestureResponderEvent) => {
    if (!isPressed.value) return;
    const { x, y } = toLocal(e);
    circleLeft.value = x - 64;
    circleTop.value = y - 64;
  };

  const handlePressOut = () => {
    isPressed.value = false;
    circleScale.value = withTiming(0, { duration: 300 });
    runOnJS(animateHearts)(circleLeft.value + 64, circleTop.value + 64);
  };

  /* ----------------------------------------------------------------- */
  /*                               UI                                  */
  /* ----------------------------------------------------------------- */

  return (
    <View
      className="flex flex-1 items-center justify-center"
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        className="w-full h-full items-center justify-center"
        delayLongPress={200}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onTouchMove={handleMove}
      >
        {/* expanding circle */}
        <Animated.View
          className="w-32 h-32 bg-pink-400 rounded-full absolute"
          style={circleStyle}
        />

        <Text className="text-black text-xl mb-4">Press and hold</Text>

        {/* emoji hearts */}
        {hearts.map((_, i) => (
          <Animated.Text
            key={i}
            className="text-3xl absolute"
            style={heartStyles[i]}
          >
            ❤️
          </Animated.Text>
        ))}
      </Pressable>
    </View>
  );
}
