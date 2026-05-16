import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.skeleton, { width: width as any, height, borderRadius, opacity }, style]}
    />
  );
}

export function TransactionSkeleton() {
  return (
    <View style={styles.transactionRow}>
      <SkeletonLoader width={44} height={44} borderRadius={22} />
      <View style={styles.transactionMid}>
        <SkeletonLoader width={140} height={14} borderRadius={4} />
        <SkeletonLoader width={90} height={11} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <SkeletonLoader width={60} height={14} borderRadius={4} />
    </View>
  );
}

export function RewardSkeleton() {
  return (
    <View style={styles.rewardCard}>
      <SkeletonLoader width="100%" height={160} borderRadius={12} />
      <View style={{ padding: 12 }}>
        <SkeletonLoader width={120} height={14} borderRadius={4} />
        <SkeletonLoader width="100%" height={11} borderRadius={4} style={{ marginTop: 6 }} />
        <SkeletonLoader width={80} height={14} borderRadius={4} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: '#E5E7EB' },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  transactionMid: { flex: 1, gap: 4 },
  rewardCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});
