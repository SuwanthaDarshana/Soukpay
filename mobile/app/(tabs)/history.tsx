import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchTransactions } from '../../store/slices/userSlice';
import { Transaction } from '../../store/slices/userSlice';
import { Colors } from '../../constants/Colors';
import { TransactionSkeleton } from '../../components/SkeletonLoader';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

function getTransactionIcon(delta: number, reason: string): string {
  if (delta < 0) return 'cart-outline';
  const r = reason.toLowerCase();
  if (r.includes('travel') || r.includes('airways') || r.includes('rides')) return 'airplane-outline';
  if (r.includes('dining') || r.includes('bistro') || r.includes('restaurant') || r.includes('coffee'))
    return 'restaurant-outline';
  if (r.includes('referral') || r.includes('milestone') || r.includes('bonus')) return 'gift-outline';
  if (r.includes('interest') || r.includes('savings')) return 'trending-up-outline';
  if (r.includes('cashback') || r.includes('amazon') || r.includes('shopping')) return 'bag-handle-outline';
  return 'wallet-outline';
}

function TransactionItem({ item }: { item: Transaction }) {
  const isEarned = item.delta > 0;
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: isEarned ? '#F0FDF4' : '#FFF5F5' }]}>
        <Ionicons
          name={getTransactionIcon(item.delta, item.reason) as any}
          size={18}
          color={isEarned ? Colors.success : Colors.error}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txReason} numberOfLines={1}>{item.reason}</Text>
        <Text style={styles.txMeta}>
          {formatDate(item.created_at)} • {isEarned ? 'EARNED' : 'REDEEMED'}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isEarned ? Colors.success : Colors.error }]}>
          {isEarned ? '+' : ''}{item.delta.toLocaleString()}
        </Text>
        <Text style={[styles.txAmountLabel, { color: isEarned ? Colors.success : Colors.error }]}>
          POINTS
        </Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const dispatch = useAppDispatch();
  const { profile, transactions, page, hasMore, isLoadingTransactions, isRefreshing } =
    useAppSelector((s) => s.user);

  useEffect(() => {
    if (transactions.length === 0) {
      dispatch(fetchTransactions({ page: 1 }));
    }
    if (!profile) {
      // profile needed for portfolio value card
    }
  }, []);

  function handleRefresh() {
    dispatch(fetchTransactions({ page: 1 }));
  }

  function handleLoadMore() {
    if (!isLoadingTransactions && hasMore) {
      dispatch(fetchTransactions({ page: page + 1 }));
    }
  }

  function renderFooter() {
    if (!isLoadingTransactions) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={Colors.navy} />
      </View>
    );
  }

  function renderEmpty() {
    if (isRefreshing) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No transactions yet</Text>
      </View>
    );
  }

  const isInitialLoading = isRefreshing && transactions.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={Colors.navy} />
        </View>
        <Text style={styles.headerTitle}>The Vault</Text>
        <TouchableOpacity style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={22} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>

      {/* Portfolio Card */}
      <View style={styles.portfolioCard}>
        <View style={styles.updatingRow}>
          <Ionicons name="refresh-outline" size={12} color="rgba(255,255,255,0.6)" />
          <Text style={styles.updatingText}>UPDATING LEDGER</Text>
        </View>
        <Text style={styles.portfolioLabel}>PORTFOLIO VALUE</Text>
        <View style={styles.portfolioRow}>
          <Text style={styles.portfolioCurrency}>$</Text>
          <Text style={styles.portfolioAmount}>
            {((profile?.balance ?? 0) * 0.01).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
        <View style={styles.growthBadge}>
          <Ionicons name="trending-up" size={13} color={Colors.success} />
          <Text style={styles.growthText}>+12.4%</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search History"
          placeholderTextColor={Colors.textMuted}
        />
        <TouchableOpacity>
          <Ionicons name="options-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      {isInitialLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 8 }).map((_, i) => (
            <TransactionSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionItem item={item} />}
          ListHeaderComponent={
            transactions.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderLeft}>Recent Activity</Text>
                <Text style={styles.listHeaderRight}>
                  {getMonthYear(transactions[0]?.created_at ?? new Date().toISOString())}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.navy}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.navy },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFF' },
  bellBtn: { padding: 4 },

  portfolioCard: {
    backgroundColor: Colors.navyLight,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  updatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  updatingText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  portfolioLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 6 },
  portfolioRow: { flexDirection: 'row', alignItems: 'flex-start' },
  portfolioCurrency: { fontSize: 22, fontWeight: '700', color: '#FFF', marginTop: 6, marginRight: 2 },
  portfolioAmount: { fontSize: 44, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  growthText: { fontSize: 13, fontWeight: '600', color: Colors.success },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  list: { backgroundColor: Colors.background },
  listContent: { flexGrow: 1, backgroundColor: Colors.background, paddingBottom: 24 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listHeaderLeft: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  listHeaderRight: { fontSize: 12, color: Colors.textSecondary },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardWhite,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: { flex: 1 },
  txReason: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 3 },
  txMeta: { fontSize: 11, color: Colors.textSecondary },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txAmountLabel: { fontSize: 10, fontWeight: '600' },

  loadingMore: { paddingVertical: 16, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted },
});
