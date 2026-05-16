import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchProfile, fetchTransactions } from '../../store/slices/userSlice';
import { logout } from '../../store/slices/authSlice';
import { clearUser } from '../../store/slices/userSlice';
import { Colors } from '../../constants/Colors';
import { TransactionSkeleton } from '../../components/SkeletonLoader';

function useCountUp(target: number, duration = 1400) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animRef.setValue(0);
    const listener = animRef.addListener(({ value }) => setDisplay(Math.round(value)));
    Animated.timing(animRef, { toValue: target, duration, useNativeDriver: false }).start(() =>
      animRef.removeListener(listener)
    );
    return () => animRef.removeListener(listener);
  }, [target]);

  return display;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTransactionIcon(delta: number, reason: string): string {
  if (delta < 0) return 'arrow-up-outline';
  const r = reason.toLowerCase();
  if (r.includes('travel') || r.includes('airways') || r.includes('rides')) return 'airplane-outline';
  if (r.includes('dining') || r.includes('bistro') || r.includes('restaurant')) return 'restaurant-outline';
  if (r.includes('referral') || r.includes('bonus')) return 'gift-outline';
  if (r.includes('interest') || r.includes('savings')) return 'trending-up-outline';
  return 'bag-handle-outline';
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { profile, transactions, isLoadingProfile, isRefreshing } = useAppSelector((s) => s.user);
  const { user: authUser } = useAppSelector((s) => s.auth);

  const balance = profile?.balance ?? 0;
  const animatedBalance = useCountUp(balance);
  const recentTransactions = transactions.slice(0, 5);

  useFocusEffect(
    useCallback(() => {
      if (!profile) {
        dispatch(fetchProfile());
        dispatch(fetchTransactions({ page: 1 }));
      }
    }, [profile])
  );

  function handleRefresh() {
    dispatch(fetchProfile());
    dispatch(fetchTransactions({ page: 1 }));
  }

  async function handleLogout() {
    await dispatch(logout());
    dispatch(clearUser());
    router.replace('/(auth)/login');
  }

  const displayName = profile?.name ?? authUser?.name ?? 'Vault Member';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.gold}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={18} color={Colors.navy} />
            </View>
            <View>
              <Text style={styles.headerWelcome}>WELCOME BACK</Text>
              <Text style={styles.headerTitle}>The Vault</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.bellBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>CURRENT ASSETS</Text>
          <Text style={styles.balanceAmount}>
            {animatedBalance.toLocaleString()}
          </Text>
          <Text style={styles.balanceSub}>Vault Points Available</Text>

          <View style={styles.balanceActions}>
            <View style={styles.pointIcons}>
              <View style={[styles.pointBadge, { backgroundColor: '#FFF' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.navy }}>S</Text>
              </View>
              <View style={[styles.pointBadge, { backgroundColor: Colors.gold, marginLeft: -8 }]}>
                <Ionicons name="star" size={12} color={Colors.navy} />
              </View>
            </View>
            <TouchableOpacity
              style={styles.redeemBtn}
              onPress={() => router.push('/(tabs)/rewards')}
            >
              <Text style={styles.redeemBtnText}>Redeem Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="paper-plane-outline" size={22} color={Colors.navy} />
            <Text style={styles.actionTitle}>Transfer{'\n'}Points</Text>
            <Text style={styles.actionSub}>Send to partners</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="flash-outline" size={22} color={Colors.navy} />
            <Text style={styles.actionTitle}>Boost{'\n'}Earnings</Text>
            <Text style={styles.actionSub}>Active multipliers</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Log */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activity Log</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={styles.viewAll}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {isLoadingProfile && !profile
            ? Array.from({ length: 5 }).map((_, i) => <TransactionSkeleton key={i} />)
            : recentTransactions.map((tx) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txIcon}>
                    <Ionicons
                      name={getTransactionIcon(tx.delta, tx.reason) as any}
                      size={18}
                      color={Colors.navy}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txReason} numberOfLines={1}>
                      {tx.reason}
                    </Text>
                    <Text style={styles.txDate}>
                      {formatDate(tx.created_at)} •{' '}
                      {tx.delta > 0 ? 'Earned Points' : 'Redemption'}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.delta > 0 ? Colors.success : Colors.error }]}>
                    {tx.delta > 0 ? '+' : ''}
                    {tx.delta.toLocaleString()}
                  </Text>
                </View>
              ))}
        </View>

        {/* Promo Card */}
        <View style={styles.promoCard}>
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>PLATINUM EXCLUSIVE</Text>
          </View>
          <Text style={styles.promoTitle}>Unlock the Safari{'\n'}Collection.</Text>
          <Text style={styles.promoBody}>
            Use 5,000 points to access curated travel experiences across Sub-Saharan Africa.
          </Text>
          <TouchableOpacity
            style={styles.promoLink}
            onPress={() => router.push('/(tabs)/rewards')}
          >
            <Text style={styles.promoLinkText}>Explore Collection</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.navy },
  scroll: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWelcome: { fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  bellBtn: { padding: 4 },

  balanceCard: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  balanceLabel: { fontSize: 11, color: Colors.gold, letterSpacing: 1.5, marginBottom: 8 },
  balanceAmount: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
    marginBottom: 4,
  },
  balanceSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
  balanceActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pointIcons: { flexDirection: 'row' },
  pointBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.navy,
  },
  redeemBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  redeemBtnText: { color: Colors.navy, fontWeight: '700', fontSize: 14 },

  actions: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.cardWhite,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginTop: 10, marginBottom: 2 },
  actionSub: { fontSize: 12, color: Colors.textSecondary },

  section: {
    backgroundColor: Colors.cardWhite,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  viewAll: { fontSize: 12, fontWeight: '600', color: Colors.navy, letterSpacing: 0.5 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: { flex: 1 },
  txReason: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  txDate: { fontSize: 12, color: Colors.textSecondary },
  txAmount: { fontSize: 14, fontWeight: '700' },

  promoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
  },
  promoBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  promoBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.navy, letterSpacing: 0.5 },
  promoTitle: { fontSize: 22, fontWeight: '800', color: Colors.navy, marginBottom: 8 },
  promoBody: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  promoLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  promoLinkText: { fontSize: 14, fontWeight: '700', color: Colors.navy },
});
