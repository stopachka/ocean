// src/app/index.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
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
import clientDB from "@/clientDB";

/* ------------------------------------------------------------------ */
/*                 1. room + presence type + hooks                    */
/* ------------------------------------------------------------------ */

type TouchPresence = { x: number; y: number; pressed: boolean };

const room = clientDB.room("touch", "main");

/* ------------------------------------------------------------------ */
/*                          Peer circle view                           */
/* ------------------------------------------------------------------ */

function PeerCircle({ peer }: { peer: TouchPresence }) {
  const scale = useSharedValue(peer.pressed ? 1 : 0);

  useEffect(() => {
    scale.value = withTiming(peer.pressed ? 1 : 0, { duration: 800 });
  }, [peer.pressed]);

  const style = useAnimatedStyle<ViewStyle>(() => ({
    position: "absolute",
    top: peer.y - 64,
    left: peer.x - 64,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "rgba(236,72,153,0.7)",
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={style} />;
}

/* ------------------------------------------------------------------ */
/*                              Screen                                */
/* ------------------------------------------------------------------ */

export default function Page() {
  const insets = useSafeAreaInsets();

  /* publish presence with useSyncPresence */
  const [myPresence, setMyPresence] = useState<TouchPresence>({
    x: 0,
    y: 0,
    pressed: false,
  });
  clientDB.rooms.useSyncPresence(room, myPresence);

  /* read peers with usePresence */
  const { peers } = clientDB.rooms.usePresence(room, {
    user: false,
  });

  /* ---------------------------------------------------------------- */
  /*               Animated values for *my* circle                    */
  /* ---------------------------------------------------------------- */
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

  const circleStyle = useAnimatedStyle<ViewStyle>(() => ({
    top: circleTop.value,
    left: circleLeft.value,
    opacity: circleScale.value * 0.7,
    transform: [{ scale: circleScale.value }],
  }));

  const heartStyles = hearts.map((h) =>
    useAnimatedStyle<TextStyle>(() => ({
      top: h.top.value,
      left: h.left.value,
      opacity: h.opacity.value,
      transform: [{ scale: h.scale.value }],
    }))
  );

  /* ---------------------------------------------------------------- */
  /*                          Animations                              */
  /* ---------------------------------------------------------------- */
  const vibrate = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  const RADIUS_HIT = 80;

  const explodeHearts = (x: number, y: number) => {
    hearts.forEach((h, idx) => {
      const angle = (idx / hearts.length) * Math.PI * 2;
      const dist = 150;

      h.scale.value = 0;
      h.opacity.value = 0;
      h.left.value = x - 16;
      h.top.value = y - 16;

      h.scale.value = withSequence(
        withDelay(idx * 50, withSpring(1.2)),
        withDelay(300, withTiming(0, { duration: 300 }))
      );
      h.opacity.value = withSequence(
        withDelay(idx * 50, withTiming(1, { duration: 200 })),
        withDelay(300, withTiming(0, { duration: 300 }))
      );

      h.left.value = withSequence(
        withDelay(idx * 50, withSpring(x + Math.cos(angle) * dist - 16))
      );
      h.top.value = withSequence(
        withDelay(idx * 50, withSpring(y + Math.sin(angle) * dist - 16))
      );
    });
  };

  /* ---------------------------------------------------------------- */
  /*                       Touch event handlers                       */
  /* ---------------------------------------------------------------- */
  const toLocal = (e: GestureResponderEvent) => ({
    x: e.nativeEvent.pageX - insets.left,
    y: e.nativeEvent.pageY - insets.top,
  });

  const hitPeersRef = useRef<Set<string>>(new Set());

  const handlePressIn = (e: GestureResponderEvent) => {
    isPressed.value = true;
    const { x, y } = toLocal(e);

    circleLeft.value = x - 64;
    circleTop.value = y - 64;
    circleScale.value = 0;
    circleScale.value = withTiming(1, { duration: 800 });

    hitPeersRef.current.clear();
    setMyPresence({ x, y, pressed: true });
  };

  const handleMove = (e: GestureResponderEvent) => {
    if (!isPressed.value) return;

    const { x, y } = toLocal(e);
    circleLeft.value = x - 64;
    circleTop.value = y - 64;
    setMyPresence({ x, y, pressed: true });

    // collision detection while **I** move
    Object.entries(peers).forEach(([peerId, peer]) => {
      if (!peer.pressed) return;
      const dx = peer.x - x;
      const dy = peer.y - y;
      const d2 = dx * dx + dy * dy;

      if (d2 < RADIUS_HIT * RADIUS_HIT && !hitPeersRef.current.has(peerId)) {
        hitPeersRef.current.add(peerId);
        runOnJS(vibrate)();
        runOnJS(explodeHearts)(x, y);
      } else if (d2 >= RADIUS_HIT * RADIUS_HIT) {
        hitPeersRef.current.delete(peerId);
      }
    });
  };

  const handlePressOut = () => {
    isPressed.value = false;
    circleScale.value = withTiming(0, { duration: 300 });
    setMyPresence((prev) => ({ ...prev, pressed: false }));
  };

  /* ---------------------------------------------------------------- */
  /*      NEW: collision detection when **peers** move over me        */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!myPresence.pressed) return;

    Object.entries(peers).forEach(([peerId, peer]) => {
      if (!peer.pressed) return;
      const dx = peer.x - myPresence.x;
      const dy = peer.y - myPresence.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < RADIUS_HIT * RADIUS_HIT && !hitPeersRef.current.has(peerId)) {
        hitPeersRef.current.add(peerId);
        vibrate();
        explodeHearts(myPresence.x, myPresence.y);
      } else if (d2 >= RADIUS_HIT * RADIUS_HIT) {
        hitPeersRef.current.delete(peerId);
      }
    });
  }, [peers, myPresence]); // <‑‑ runs whenever anyone’s position changes

  /* ---------------------------------------------------------------- */
  /*                        Clean‑up on unmount                       */
  /* ---------------------------------------------------------------- */
  useEffect(
    () => () => setMyPresence((prev) => ({ ...prev, pressed: false })),
    []
  );

  /* ---------------------------------------------------------------- */
  /*                               UI                                 */
  /* ---------------------------------------------------------------- */
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
        className="h-full w-full items-center justify-center"
        delayLongPress={200}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onTouchMove={handleMove}
      >
        {/* my expanding circle */}
        <Animated.View
          className="absolute h-32 w-32 rounded-full bg-pink-400"
          style={circleStyle}
        />

        {/* peer circles */}
        {Object.entries(peers).map(([id, peer]) =>
          peer.pressed ? (
            <PeerCircle key={id} peer={peer as TouchPresence} />
          ) : null
        )}

        <Text className="mb-4 text-xl text-black">Press and hold</Text>

        {/* emoji hearts */}
        {hearts.map((_, i) => (
          <Animated.Text
            key={i}
            className="absolute text-3xl"
            style={heartStyles[i]}
          >
            ❤️
          </Animated.Text>
        ))}
      </Pressable>
    </View>
  );
}
