import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFamilySpaceStore } from "../../../store/familySpaceStore";
import { useSessionStore } from "../../../store/sessionStore";
import { useUserFoodStore } from "../../../store/userFoodStore";

type FavoriteDish = {
  dishId: string;
  dishName: string;
};

type RecentDish = {
  dishId: string;
  dishName: string;
  viewedAt: string;
  difficulty?: number;
};

type ProfileFlow = "overview" | "phoneLogin" | "migrating" | "migrationResult";

type ProfileSectionProps = {
  favorites: FavoriteDish[];
  recentViews: RecentDish[];
  onGoRecommend: () => void;
  onOpenDishInDishTab: (dishId: string) => void;
  onOpenDishDetail: (dishId: string) => void;
  onToggleFavorite: (dish: FavoriteDish) => Promise<void>;
  onClearRecentViews: () => Promise<void>;
  onOpenFamilySpace: () => void;
  onOpenGathering: () => void;
};

export function ProfileSection({
  favorites,
  recentViews,
  onGoRecommend,
  onOpenDishInDishTab,
  onOpenDishDetail,
  onToggleFavorite,
  onClearRecentViews,
  onOpenFamilySpace,
  onOpenGathering,
}: ProfileSectionProps) {
  const setAuthUserId = useSessionStore((s) => s.setAuthUserId);
  const hydrateFromServer = useUserFoodStore((s) => s.hydrateFromServer);
  const familyJoined = useFamilySpaceStore((s) => s.joined);
  const familySpaceTitle = useFamilySpaceStore((s) => s.spaceTitle);
  const familyMemberCount = useFamilySpaceStore((s) => s.memberCount);
  const familyPlannedDays = useFamilySpaceStore((s) => s.plannedDaysThisWeek);
  const familyRelation = useFamilySpaceStore((s) => s.relation);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileFlow, setProfileFlow] = useState<ProfileFlow>("overview");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sendCooldown, setSendCooldown] = useState(0);
  const [loginFormError, setLoginFormError] = useState("");

  useEffect(() => {
    if (!sendCooldown) return;
    const timer = setInterval(() => {
      setSendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sendCooldown]);

  useEffect(() => {
    if (profileFlow !== "migrating") return;
    const timer = setTimeout(() => {
      setProfileFlow("migrationResult");
    }, 1800);
    return () => clearTimeout(timer);
  }, [profileFlow]);

  useEffect(() => {
    if (profileFlow !== "migrationResult") return;
    const timer = setTimeout(() => {
      setShowLoginToast(false);
      setProfileFlow("overview");
    }, 1800);
    return () => clearTimeout(timer);
  }, [profileFlow]);

  const sendCodeDisabled = useMemo(() => !/^1\d{10}$/.test(phone) || !!sendCooldown, [phone, sendCooldown]);
  const loginDisabled = useMemo(() => !/^1\d{10}$/.test(phone) || code.length !== 6, [phone, code.length]);

  function startPhoneLogin() {
    setShowLoginPrompt(false);
    setProfileFlow("phoneLogin");
    setLoginFormError("");
  }

  function onSendCode() {
    if (sendCodeDisabled) return;
    setSendCooldown(60);
    setLoginFormError("");
  }

  function onSubmitPhoneLogin() {
    if (!/^1\d{10}$/.test(phone)) {
      setLoginFormError("请输入正确的11位手机号");
      return;
    }
    if (code !== "123456") {
      setLoginFormError("验证码错误，请输入测试验证码 123456");
      return;
    }
    setLoginFormError("");
    setAuthUserId(`user_${phone}`);
    void hydrateFromServer();
    setIsLoggedIn(true);
    setShowLoginToast(true);
    setProfileFlow("migrating");
  }

  function onLogout() {
    setAuthUserId(null);
    void hydrateFromServer();
    setIsLoggedIn(false);
    setPhone("");
    setCode("");
    setSendCooldown(0);
    setProfileFlow("overview");
  }

  function showLoginPromptForAction() {
    if (isLoggedIn) return;
    setShowLoginPrompt(true);
  }

  return (
    <>
      {profileFlow === "overview" && (
        <View style={styles.profilePage}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileTitle}>我的</Text>
            <Text style={styles.profileSubtitle}>管理你的收藏和浏览历史</Text>
          </View>

          {!isLoggedIn ? (
            <View style={styles.guestCard}>
              <View style={styles.guestUserRow}>
                <View style={styles.guestAvatar}>
                  <Text style={styles.guestAvatarText}>◌</Text>
                </View>
                <View style={styles.guestMeta}>
                  <Text style={styles.guestModeText}>游客模式</Text>
                  <Text style={styles.guestHintText}>登录后同步你的数据</Text>
                </View>
              </View>
              <Pressable style={styles.loginButtonInGuestCard} onPress={() => setShowLoginPrompt(true)}>
                <Text style={styles.loginButtonInGuestCardText}>📱 手机号登录</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.userCard}>
              <View style={styles.userCardLeft}>
                <View style={styles.guestAvatar}>
                  <Text style={styles.guestAvatarText}>◌</Text>
                </View>
                <View>
                  <Text style={styles.userPhoneText}>{phone || "19548859619"}</Text>
                  <Text style={styles.userStateText}>已登录</Text>
                </View>
              </View>
              <Pressable style={styles.logoutButton} onPress={onLogout}>
                <Text style={styles.logoutButtonText}>⇢</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.entryRows}>
            {familyJoined ? (
              <Pressable style={styles.familyJoinedCard} onPress={onOpenFamilySpace}>
                <View style={styles.familyJoinedTop}>
                  <View style={styles.entryLeft}>
                    <View
                      style={[
                        styles.entryIconWrap,
                        familyRelation === "roommates" ? styles.entryIconGathering : styles.entryIconFamily,
                      ]}
                    >
                      <Text style={styles.entryIconEmoji}>{familyRelation === "roommates" ? "🏠" : "❤️"}</Text>
                    </View>
                    <View style={styles.entryTexts}>
                      <Text style={styles.entryTitle}>{familySpaceTitle}</Text>
                      <Text style={styles.entryMemberLine}>{familyMemberCount}位成员</Text>
                    </View>
                  </View>
                  <Text style={styles.entryChevron}>›</Text>
                </View>
                <View style={styles.familyJoinedFooter}>
                  <Text style={styles.footerCalIcon}>📅</Text>
                  <Text style={styles.footerPlanText}>本周已规划 {familyPlannedDays}/7 天</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable style={styles.entryCard} onPress={onOpenFamilySpace}>
                <View style={styles.entryLeft}>
                  <View style={[styles.entryIconWrap, styles.entryIconFamily]}>
                    <Text style={styles.entryIconEmoji}>❤️</Text>
                  </View>
                  <View style={styles.entryTexts}>
                    <Text style={styles.entryTitle}>家庭空间</Text>
                    <Text style={styles.entrySubtitle}>一起规划菜单，共享采购清单</Text>
                  </View>
                </View>
                <Text style={styles.entryChevron}>›</Text>
              </Pressable>
            )}
            <Pressable style={styles.entryCard} onPress={onOpenGathering}>
              <View style={styles.entryLeft}>
                <View style={[styles.entryIconWrap, styles.entryIconGathering]}>
                  <Text style={styles.entryIconEmoji}>👥</Text>
                </View>
                <View style={styles.entryTexts}>
                  <Text style={styles.entryTitle}>临时聚餐</Text>
                  <Text style={styles.entrySubtitle}>多人报菜，AI生成聚餐菜单</Text>
                </View>
              </View>
              <Text style={styles.entryChevron}>›</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statsCard, styles.statsCardFavorite]}>
              <Text style={styles.statsIcon}>♡</Text>
              <Text style={styles.statsNumber}>{favorites.length}</Text>
              <Text style={styles.statsLabel}>收藏菜谱</Text>
            </View>
            <View style={[styles.statsCard, styles.statsCardHistory]}>
              <Text style={styles.statsIcon}>🕒</Text>
              <Text style={styles.statsNumber}>{recentViews.length}</Text>
              <Text style={styles.statsLabel}>浏览历史</Text>
            </View>
          </View>

          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>我的收藏</Text>
            {!favorites.length ? (
              <View style={styles.favoriteEmptyWrap}>
                <View style={styles.favoriteEmptyIconWrap}>
                  <Text style={styles.favoriteEmptyIcon}>♡</Text>
                </View>
                <Text style={styles.favoriteEmptyTitle}>还没有收藏</Text>
                <Text style={styles.favoriteEmptyDesc}>去推荐页或查菜页收藏喜欢的菜谱吧</Text>
                <Pressable style={styles.goRecommendButton} onPress={onGoRecommend}>
                  <Text style={styles.goRecommendText}>去推荐页</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.favoritesList}>
                {favorites.map((item) => (
                  <Pressable key={item.dishId} style={styles.favoriteCard} onPress={() => onOpenDishInDishTab(item.dishId)}>
                    <Text style={styles.favoriteName}>{item.dishName}</Text>
                    <Pressable
                      style={styles.favoriteRemove}
                      onPress={() => {
                        if (!isLoggedIn) {
                          showLoginPromptForAction();
                          return;
                        }
                        void onToggleFavorite(item);
                      }}
                    >
                      <Text style={styles.favoriteRemoveText}>移除</Text>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.sectionWrap}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>浏览历史</Text>
              {!!recentViews.length && (
                <Pressable
                  onPress={() => {
                    if (!isLoggedIn) {
                      showLoginPromptForAction();
                      return;
                    }
                    void onClearRecentViews();
                  }}
                >
                  <Text style={styles.clearText}>清空历史</Text>
                </Pressable>
              )}
            </View>
            {!recentViews.length && <Text style={styles.emptyHistoryText}>暂无浏览记录</Text>}
            {!!recentViews.length && (
              <View style={styles.historyList}>
                {recentViews.map((item) => (
                  <Pressable
                    key={`${item.dishId}-${item.viewedAt}`}
                    style={styles.historyCard}
                    onPress={() => onOpenDishDetail(item.dishId)}
                  >
                    <View style={styles.historyMain}>
                      <Text style={styles.historyDish}>{item.dishName}</Text>
                      <Text style={styles.historyTime}>◷ {formatRelativeMinutes(item.viewedAt)}</Text>
                    </View>
                    <View style={styles.historyTag}>
                      <Text style={styles.historyTagText}>{difficultyLabel(item.difficulty)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Text style={styles.tipIcon}>🍳</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>烹饪小贴士</Text>
              <Text style={styles.tipDesc}>收藏你喜欢的菜谱，随时查看详细步骤，让做饭变得更简单！</Text>
            </View>
          </View>
        </View>
      )}

      {profileFlow === "phoneLogin" && (
        <View style={styles.phoneLoginPage}>
          <View style={styles.phoneLoginHead}>
            <Pressable style={styles.backButton} onPress={() => setProfileFlow("overview")}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
            <Text style={styles.phoneLoginTitle}>手机号登录</Text>
          </View>
          <View style={styles.phoneLoginIconWrap}>
            <Text style={styles.phoneLoginIcon}>📱</Text>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>手机号</Text>
            <TextInput
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/[^\d]/g, "").slice(0, 11));
                setLoginFormError("");
              }}
              keyboardType="number-pad"
              placeholder="请输入11位手机号"
              placeholderTextColor="rgba(26,26,26,0.45)"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>验证码</Text>
            <View style={styles.codeRow}>
              <TextInput
                value={code}
                onChangeText={(text) => {
                  setCode(text.replace(/[^\d]/g, "").slice(0, 6));
                  setLoginFormError("");
                }}
                keyboardType="number-pad"
                placeholder="6位验证码"
                placeholderTextColor="rgba(26,26,26,0.45)"
                style={[styles.input, styles.codeInput]}
              />
              <Pressable style={[styles.sendCodeButton, sendCodeDisabled && styles.sendCodeButtonDisabled]} onPress={onSendCode}>
                <Text style={styles.sendCodeButtonText}>{sendCooldown ? `${sendCooldown}s` : "发送验证码"}</Text>
              </Pressable>
            </View>
          </View>

          {!!loginFormError && <Text style={styles.loginFormError}>{loginFormError}</Text>}

          <Pressable style={[styles.submitLoginButton, loginDisabled && styles.submitLoginButtonDisabled]} onPress={onSubmitPhoneLogin}>
            <Text style={styles.submitLoginText}>登录</Text>
          </Pressable>

          <View style={styles.loginAgreementBox}>
            <Text style={styles.loginAgreementText}>登录即表示同意《用户协议》和《隐私政策》</Text>
            <Text style={styles.loginAgreementCode}>测试验证码：123456</Text>
          </View>
        </View>
      )}

      {profileFlow === "migrating" && (
        <View style={styles.migrationScreen}>
          {showLoginToast && (
            <View style={styles.successToast}>
              <Text style={styles.successToastIcon}>✔</Text>
              <Text style={styles.successToastText}>登录成功</Text>
            </View>
          )}
          <View style={styles.migrationCard}>
            <ActivityIndicator size="large" color="#ff6b35" />
            <Text style={styles.migrationTitle}>正在同步数据</Text>
            <Text style={styles.migrationDesc}>正在将你的收藏和浏览历史同步到账号</Text>
            <Text style={styles.migrationHint}>请勿关闭页面...</Text>
          </View>
        </View>
      )}

      {profileFlow === "migrationResult" && (
        <View style={styles.migrationScreen}>
          {showLoginToast && (
            <View style={styles.successToast}>
              <Text style={styles.successToastIcon}>✔</Text>
              <Text style={styles.successToastText}>登录成功</Text>
            </View>
          )}
          <View style={styles.migrationCard}>
            <View style={styles.successCircle}>
              <Text style={styles.successCircleText}>✓</Text>
            </View>
            <Text style={styles.migrationTitle}>数据同步成功</Text>
            <View style={styles.migrationResultRow}>
              <Text style={styles.migrationResultLabel}>收藏菜谱</Text>
              <Text style={styles.migrationResultValue}>{favorites.length} 条</Text>
            </View>
            <View style={styles.migrationResultRow}>
              <Text style={styles.migrationResultLabel}>浏览历史</Text>
              <Text style={styles.migrationResultValue}>{recentViews.length} 条</Text>
            </View>
            <Text style={styles.migrationHint}>即将跳转...</Text>
          </View>
        </View>
      )}

      <Modal visible={showLoginPrompt} transparent animationType="fade" onRequestClose={() => setShowLoginPrompt(false)}>
        <View style={styles.modalMask}>
          <View style={styles.loginPromptModal}>
            <View style={styles.modalTopIconWrap}>
              <Text style={styles.modalTopIcon}>📱</Text>
            </View>
            <Text style={styles.loginPromptTitle}>登录后使用更多功能</Text>
            <Text style={styles.loginPromptDesc}>登录后可跨设备同步你的收藏和浏览历史，随时随地查看你喜欢的菜谱</Text>

            <View style={styles.modalBenefitCard}>
              <View style={styles.modalBenefitIcon}>
                <Text style={styles.modalBenefitIconText}>☁</Text>
              </View>
              <View>
                <Text style={styles.modalBenefitTitle}>跨设备同步</Text>
                <Text style={styles.modalBenefitDesc}>手机、平板无缝切换</Text>
              </View>
            </View>
            <View style={styles.modalBenefitCard}>
              <View style={[styles.modalBenefitIcon, styles.modalBenefitIconAlt]}>
                <Text style={[styles.modalBenefitIconText, styles.modalBenefitIconTextAlt]}>♡</Text>
              </View>
              <View>
                <Text style={styles.modalBenefitTitle}>永久保存收藏</Text>
                <Text style={styles.modalBenefitDesc}>不用担心数据丢失</Text>
              </View>
            </View>

            <Pressable style={styles.modalPrimaryButton} onPress={startPhoneLogin}>
              <Text style={styles.modalPrimaryButtonText}>手机号登录</Text>
            </Pressable>
            <Pressable style={styles.modalGhostButton} onPress={() => setShowLoginPrompt(false)}>
              <Text style={styles.modalGhostButtonText}>先逛逛</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatRelativeMinutes(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minute = Math.max(1, Math.floor(diff / 60000));
  if (minute < 60) return `${minute}分钟前`;
  const hour = Math.floor(minute / 60);
  if (hour < 24) return `${hour}小时前`;
  const day = Math.floor(hour / 24);
  return `${day}天前`;
}

function difficultyLabel(level?: number) {
  if (!level || level <= 1) return "简单";
  if (level <= 3) return "中等";
  return "较难";
}

const styles = StyleSheet.create({
  profilePage: { gap: 10 },
  guestCard: {
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  guestUserRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  guestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  guestAvatarText: { color: "#fff", fontSize: 20, fontWeight: "600" },
  guestMeta: { gap: 2 },
  guestModeText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  guestHintText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  loginButtonInGuestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  loginButtonInGuestCardText: { color: "#ff6b35", fontSize: 16, fontWeight: "600" },
  userCard: {
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  userPhoneText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  userStateText: { color: "rgba(255,255,255,0.82)", fontSize: 14, marginTop: 2 },
  logoutButton: { width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  logoutButtonText: { color: "#fff", fontSize: 20 },
  profileHeader: { gap: 5, marginBottom: 2 },
  profileTitle: { fontSize: 24, color: "#1a1a1a", fontWeight: "600" },
  profileSubtitle: { fontSize: 16, color: "#757575" },
  entryRows: { gap: 12 },
  familyJoinedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  familyJoinedTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entryMemberLine: {
    fontSize: 12,
    fontWeight: "600",
    color: "#757575",
  },
  familyJoinedFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerCalIcon: { fontSize: 14 },
  footerPlanText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#757575",
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 82,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  entryLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  entryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  entryIconFamily: { backgroundColor: "#ffe2e2" },
  entryIconGathering: { backgroundColor: "#ffedd4" },
  entryIconEmoji: { fontSize: 22 },
  entryTexts: { flex: 1, gap: 4 },
  entryTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  entrySubtitle: { fontSize: 14, color: "#757575" },
  entryChevron: { fontSize: 22, color: "#c4c4c4", fontWeight: "300" },
  statsRow: { flexDirection: "row", gap: 10 },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 128,
    justifyContent: "space-between",
  },
  statsCardFavorite: { backgroundColor: "#ff6b35" },
  statsCardHistory: { backgroundColor: "#4ecdc4" },
  statsIcon: { fontSize: 28, color: "#fff" },
  statsNumber: { fontSize: 26, color: "#fff", marginTop: 2 },
  statsLabel: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  sectionWrap: { marginTop: 8, gap: 10 },
  sectionTitle: { fontSize: 18, color: "#1a1a1a", fontWeight: "600" },
  favoriteEmptyWrap: { alignItems: "center", paddingVertical: 14, gap: 10 },
  favoriteEmptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteEmptyIcon: { fontSize: 27, color: "#757575" },
  favoriteEmptyTitle: { fontSize: 18, color: "#1a1a1a", fontWeight: "600" },
  favoriteEmptyDesc: { fontSize: 14, color: "#757575" },
  goRecommendButton: {
    backgroundColor: "#ff6b35",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  goRecommendText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  favoritesList: { gap: 10 },
  favoriteCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  favoriteName: { fontSize: 16, color: "#1a1a1a", fontWeight: "500", flex: 1 },
  favoriteRemove: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  favoriteRemoveText: { color: "#757575", fontSize: 12 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clearText: { color: "#ff6b6b", fontSize: 14, fontWeight: "500" },
  emptyHistoryText: { color: "#9ca3af", fontSize: 13 },
  historyList: { gap: 10 },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  historyMain: { gap: 4, flex: 1 },
  historyDish: { color: "#1a1a1a", fontSize: 16, fontWeight: "500" },
  historyTime: { color: "#757575", fontSize: 12 },
  historyTag: { backgroundColor: "#f5f5f5", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  historyTagText: { color: "#757575", fontSize: 12 },
  tipCard: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,184,77,0.25)",
    backgroundColor: "#fff3e0",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  tipIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#ff6b35",
    alignItems: "center",
    justifyContent: "center",
  },
  tipIcon: { fontSize: 20, color: "#fff" },
  tipContent: { flex: 1, gap: 3 },
  tipTitle: { color: "#ff6b35", fontSize: 15, fontWeight: "600" },
  tipDesc: { color: "rgba(255,107,53,0.9)", fontSize: 14, lineHeight: 22 },
  modalMask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  loginPromptModal: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 14,
  },
  modalTopIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTopIcon: { fontSize: 30 },
  loginPromptTitle: { alignSelf: "center", color: "#1a1a1a", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  loginPromptDesc: { color: "#757575", fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 16 },
  modalBenefitCard: {
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  modalBenefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,107,53,0.12)",
  },
  modalBenefitIconAlt: { backgroundColor: "rgba(78,205,196,0.16)" },
  modalBenefitIconText: { color: "#ff6b35", fontSize: 18 },
  modalBenefitIconTextAlt: { color: "#4ecdc4" },
  modalBenefitTitle: { color: "#1a1a1a", fontSize: 14, fontWeight: "500" },
  modalBenefitDesc: { color: "#757575", fontSize: 12, marginTop: 1 },
  modalPrimaryButton: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff6b35",
    shadowColor: "#ff6b35",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  modalPrimaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalGhostButton: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  modalGhostButtonText: { color: "#757575", fontSize: 14, fontWeight: "600" },
  phoneLoginPage: { paddingTop: 4, gap: 14 },
  phoneLoginHead: { height: 40, flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backButtonText: { fontSize: 24, color: "#1a1a1a" },
  phoneLoginTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  phoneLoginIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 4,
  },
  phoneLoginIcon: { fontSize: 36 },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: "#757575", fontSize: 14, fontWeight: "600", marginLeft: 4 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    backgroundColor: "#fff",
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1a1a1a",
  },
  codeRow: { flexDirection: "row", gap: 10 },
  codeInput: { flex: 1 },
  sendCodeButton: {
    width: 128,
    borderRadius: 16,
    backgroundColor: "#4ecdc4",
    alignItems: "center",
    justifyContent: "center",
  },
  sendCodeButtonDisabled: { opacity: 0.5 },
  sendCodeButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  loginFormError: { color: "#e11d48", fontSize: 12, marginTop: -4, marginBottom: -2 },
  submitLoginButton: {
    marginTop: 8,
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff6b35",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  submitLoginButtonDisabled: { opacity: 0.5 },
  submitLoginText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loginAgreementBox: {
    marginTop: 10,
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  loginAgreementText: { fontSize: 12, color: "#757575" },
  loginAgreementCode: { fontSize: 12, color: "#ff6b35", fontWeight: "600", marginTop: 2 },
  migrationScreen: {
    minHeight: 620,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
  },
  successToast: {
    position: "absolute",
    top: 4,
    left: 10,
    right: 10,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bffcd9",
    backgroundColor: "#ecfdf3",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  successToastIcon: { color: "#008a2e", fontSize: 14, fontWeight: "700" },
  successToastText: { color: "#008a2e", fontSize: 14, fontWeight: "600" },
  migrationCard: {
    width: 304,
    backgroundColor: "#fff",
    borderRadius: 24,
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: 12,
  },
  migrationTitle: { color: "#1a1a1a", fontSize: 20, fontWeight: "700", marginTop: 4 },
  migrationDesc: { color: "#757575", fontSize: 14, textAlign: "center" },
  migrationHint: { color: "#757575", fontSize: 12, marginTop: 4 },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  successCircleText: { color: "#00b14a", fontSize: 36, fontWeight: "700" },
  migrationResultRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  migrationResultLabel: { color: "#757575", fontSize: 14 },
  migrationResultValue: { color: "#ff6b35", fontSize: 14, fontWeight: "600" },
});
