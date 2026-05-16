import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchRewards, redeemReward, clearRedeemError, Reward } from '../../store/slices/rewardsSlice';
import { Colors } from '../../constants/Colors';
import { RewardSkeleton } from '../../components/SkeletonLoader';

const CATEGORIES = ['All Rewards', 'Lifestyle', 'Travel'];

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <View style={[styles.stockBadge, { backgroundColor: Colors.error }]}><Text style={styles.stockBadgeText}>SOLD OUT</Text></View>;
  if (stock <= 5) return <View style={[styles.stockBadge, { backgroundColor: '#FF8C00' }]}><Text style={styles.stockBadgeText}>{stock} LEFT</Text></View>;
  return <View style={[styles.stockBadge, { backgroundColor: Colors.success }]}><Text style={styles.stockBadgeText}>IN STOCK</Text></View>;
}

function RewardCard({
  reward,
  canAfford,
  onPress,
}: {
  reward: Reward;
  canAfford: boolean;
  onPress: () => void;
}) {
  const isOutOfStock = reward.stock_remaining === 0;
  const isDisabled = !canAfford || isOutOfStock;

  return (
    <View style={[styles.card, isDisabled && styles.cardDisabled]}>
      {/* Image placeholder */}
      <View style={styles.cardImageWrap}>
        {isDisabled && !isOutOfStock && (
          <View style={styles.insufficientOverlay}>
            <Ionicons name="lock-closed" size={16} color="#FFF" />
            <Text style={styles.insufficientText}>INSUFFICIENT POINTS</Text>
          </View>
        )}
        {reward.image_url ? (
          <Image source={{ uri: reward.image_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="gift-outline" size={48} color={isDisabled ? Colors.disabled : Colors.navy} />
          </View>
        )}
        <View style={styles.stockBadgeWrap}>
          <StockBadge stock={reward.stock_remaining} />
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardName, isDisabled && styles.textDisabled]}>{reward.name}</Text>
        <Text style={[styles.cardDesc, isDisabled && styles.textDisabled]} numberOfLines={2}>
          {reward.description}
        </Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.costLabel}>COST</Text>
            <Text style={[styles.costAmount, isDisabled && styles.textDisabled]}>
              {reward.points_cost.toLocaleString()} pts
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.claimBtn, isDisabled && styles.claimBtnDisabled]}
            onPress={onPress}
            disabled={isDisabled}
          >
            <Text style={[styles.claimBtnText, isDisabled && styles.claimBtnTextDisabled]}>
              {isOutOfStock ? 'Notify Me' : 'Claim Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function RedeemModal({
  reward,
  visible,
  onConfirm,
  onClose,
  isRedeeming,
  redeemError,
  lastRedeemedId,
}: {
  reward: Reward | null;
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isRedeeming: boolean;
  redeemError: string | null;
  lastRedeemedId: string | null;
}) {
  if (!reward) return null;

  const isSuccess = lastRedeemedId === reward.id;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={isRedeeming ? undefined : onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        {isSuccess ? (
          <View style={styles.successState}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Redeemed!</Text>
            <Text style={styles.successBody}>
              You successfully redeemed {reward.name} for{' '}
              {reward.points_cost.toLocaleString()} points.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sheetTitle}>Confirm Redemption</Text>
            <Text style={styles.sheetSubtitle}>Review your redemption details</Text>

            <View style={styles.sheetRewardRow}>
              <View style={styles.sheetIcon}>
                <Ionicons name="gift-outline" size={28} color={Colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetRewardName}>{reward.name}</Text>
                <Text style={styles.sheetRewardDesc} numberOfLines={2}>
                  {reward.description}
                </Text>
              </View>
            </View>

            <View style={styles.sheetDivider} />

            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel}>Points Required</Text>
              <Text style={styles.sheetRowValue}>{reward.points_cost.toLocaleString()} pts</Text>
            </View>
            <View style={styles.sheetRow}>
              <Text style={styles.sheetRowLabel}>Stock Remaining</Text>
              <Text style={styles.sheetRowValue}>{reward.stock_remaining}</Text>
            </View>

            {!!redeemError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{redeemError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, isRedeeming && { opacity: 0.7 }]}
              onPress={onConfirm}
              disabled={isRedeeming}
            >
              {isRedeeming ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Redeem</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isRedeeming}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

export default function RewardsScreen() {
  const dispatch = useAppDispatch();
  const { rewards, isLoading, isRedeeming, redeemError, lastRedeemedId } = useAppSelector(
    (s) => s.rewards
  );
  const { profile } = useAppSelector((s) => s.user);
  const balance = profile?.balance ?? 0;

  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [activeCategory, setActiveCategory] = useState('All Rewards');

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchRewards());
    }, [])
  );

  function handleSelectReward(reward: Reward) {
    dispatch(clearRedeemError());
    setSelectedReward(reward);
  }

  async function handleConfirmRedeem() {
    if (!selectedReward) return;
    await dispatch(redeemReward(selectedReward.id));
  }

  function handleCloseModal() {
    if (isRedeeming) return;
    setSelectedReward(null);
    dispatch(clearRedeemError());
  }

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

      {/* Balance + Tier */}
      <View style={styles.balanceSection}>
        <View>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
        </View>
        <View style={styles.tierBadge}>
          <Ionicons name="star" size={13} color={Colors.gold} />
          <Text style={styles.tierText}>ELITE TIER</Text>
          <View style={styles.tierExpiry}>
            <Text style={styles.tierExpiryText}>EXPIRES IN 12D</Text>
          </View>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text
              style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rewards List */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {Array.from({ length: 3 }).map((_, i) => <RewardSkeleton key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RewardCard
              reward={item}
              canAfford={balance >= item.points_cost}
              onPress={() => handleSelectReward(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => dispatch(fetchRewards())}
              tintColor={Colors.navy}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="gift-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No rewards available</Text>
            </View>
          }
        />
      )}

      <RedeemModal
        reward={selectedReward}
        visible={selectedReward !== null}
        onConfirm={handleConfirmRedeem}
        onClose={handleCloseModal}
        isRedeeming={isRedeeming}
        redeemError={redeemError}
        lastRedeemedId={lastRedeemedId}
      />
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

  balanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  balanceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,197,40,0.15)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  tierText: { fontSize: 11, fontWeight: '700', color: Colors.gold },
  tierExpiry: { backgroundColor: Colors.gold, borderRadius: 100, paddingHorizontal: 6, paddingVertical: 2 },
  tierExpiryText: { fontSize: 9, fontWeight: '700', color: Colors.navy },

  categoryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTab: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.cardWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryTabActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  categoryText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  categoryTextActive: { color: '#FFF', fontWeight: '700' },

  listContent: { padding: 16, backgroundColor: Colors.background, flexGrow: 1 },

  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: { opacity: 0.7 },
  cardImageWrap: { height: 180, backgroundColor: '#F3F4F6', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  insufficientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    gap: 6,
  },
  insufficientText: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  stockBadgeWrap: { position: 'absolute', top: 12, right: 12, zIndex: 2 },
  stockBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stockBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  cardBody: { padding: 16 },
  cardName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  costLabel: { fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 2 },
  costAmount: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  textDisabled: { color: Colors.disabledText },
  claimBtn: { backgroundColor: Colors.navy, borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10 },
  claimBtnDisabled: { backgroundColor: Colors.disabled },
  claimBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  claimBtnTextDisabled: { color: Colors.disabledText },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted },

  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.cardWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 420,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: Colors.navy, marginBottom: 4 },
  sheetSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  sheetRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.cardWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetRewardName: { fontSize: 16, fontWeight: '700', color: Colors.navy, marginBottom: 4 },
  sheetRewardDesc: { fontSize: 12, color: Colors.textSecondary },
  sheetDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sheetRowLabel: { fontSize: 14, color: Colors.textSecondary },
  sheetRowValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: { color: Colors.error, fontSize: 13, flex: 1 },
  confirmBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 100,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },

  successState: { alignItems: 'center', paddingTop: 20, paddingBottom: 10 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: '800', color: Colors.navy, marginBottom: 8 },
  successBody: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  doneBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 100,
    paddingHorizontal: 48,
    paddingVertical: 14,
  },
  doneBtnText: { color: Colors.navy, fontSize: 16, fontWeight: '700' },
});
