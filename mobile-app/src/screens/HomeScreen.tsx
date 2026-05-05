import { StatusBar } from "expo-status-bar";
import { ReactNode, useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, StyleProp, ViewStyle, Text, View } from "react-native";
import { track } from "../analytics/tracker";
import { CommunitySection } from "../features/community/components/CommunitySection";
import { DishSection } from "../features/dish/components/DishSection";
import { ProfileSection } from "../features/profile/components/ProfileSection";
import { RecommendSection } from "../features/recommend/components/RecommendSection";
import { DishDetailPrefetch } from "../types/api";
import { CreateFamilyPage } from "./CreateFamilyPage";
import { FamilyCreatedSuccessPage } from "./FamilyCreatedSuccessPage";
import { CreatePostPage } from "./CreatePostPage";
import { FamilyDetailPage } from "./FamilyDetailPage";
import { FrequentDishesPage } from "./FrequentDishesPage";
import { FamilyHomePage } from "./FamilyHomePage";
import { RecipeDetailPage } from "./RecipeDetailPage";
import { TemporaryGatheringPage } from "./TemporaryGatheringPage";
import { ShoppingListPage } from "./ShoppingListPage";
import { WishlistPoolPage } from "./WishlistPoolPage";
import { JoinFamilyPage } from "./JoinFamilyPage";
import { WeekMenuPage } from "./WeekMenuPage";
import { useFamilySpaceStore } from "../store/familySpaceStore";
import { useShoppingListStore } from "../store/shoppingListStore";
import { useWeekMenuStore } from "../store/weekMenuStore";
import { useSessionStore } from "../store/sessionStore";
import { useUserFoodStore } from "../store/userFoodStore";

type TabKey = "recommend" | "dish" | "community" | "profile";

/**
 * 需要登录的功能调用此函数；未登录返回 false 并跳转到登录页。
 * 已登录返回 true。
 */
function requireLogin(
  setActiveTab: (tab: TabKey) => void,
  setForceLogin: (v: boolean) => void,
): boolean {
  const { accessToken } = useSessionStore.getState();
  if (accessToken) return true;
  setActiveTab("profile");
  setForceLogin(true);
  return false;
}

function TabLayer({
  visible,
  scrollable = true,
  contentContainerStyle,
  children,
}: {
  visible: boolean;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          opacity: visible ? 1 : 0,
          zIndex: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        },
      ]}
      collapsable={false}
    >
      {scrollable ? (
        <ScrollView style={styles.scroll} contentContainerStyle={contentContainerStyle ?? styles.content}>
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("recommend");
  const [errorMessage, setErrorMessage] = useState("");
  const [focusDishId, setFocusDishId] = useState<string | null>(null);
  const [detailDishId, setDetailDishId] = useState<string | null>(null);
  const [detailPrefetch, setDetailPrefetch] = useState<DishDetailPrefetch | null>(null);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [familyFlow, setFamilyFlow] = useState<"closed" | "landing" | "create" | "join" | "success">("closed");
  const [familyInviteCode, setFamilyInviteCode] = useState("");
  const [gatheringOpen, setGatheringOpen] = useState(false);
  const [familyDetailOpen, setFamilyDetailOpen] = useState(false);
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  /** 从临时聚餐点「生成采购清单」进入：采购页只显示单次模式 */
  const [shoppingListFromGathering, setShoppingListFromGathering] = useState(false);
  const [frequentDishesOpen, setFrequentDishesOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  /** 强制 ProfileSection 进入登录页 */
  const [forceLogin, setForceLogin] = useState(false);
  const favorites = useUserFoodStore((s) => s.favorites) ?? [];
  const recentViews = useUserFoodStore((s) => s.recentViews) ?? [];
  const toggleFavorite = useUserFoodStore((s) => s.toggleFavorite);
  const addRecentView = useUserFoodStore((s) => s.addRecentView);
  const clearRecentViews = useUserFoodStore((s) => s.clearRecentViews);
  const hydrateFromServer = useUserFoodStore((s) => s.hydrateFromServer);
  const favoriteDishIds = favorites.map((item) => item.dishId);

  function openDishFromRecommend(dish: DishDetailPrefetch) {
    setDetailPrefetch(dish);
    setDetailDishId(dish.dishId);
  }

  function closeDishDetail() {
    setDetailDishId(null);
    setDetailPrefetch(null);
  }

  function closeFamilyFlowToProfile() {
    setFamilyFlow("closed");
    setFamilyInviteCode("");
    setActiveTab("profile");
  }

  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.main}>
        {!!errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.error}>{errorMessage}</Text>
          </View>
        )}
        <View style={styles.tabStack}>
          <TabLayer visible={activeTab === "recommend"}>
            <RecommendSection
              onError={setErrorMessage}
              favoriteDishIds={favoriteDishIds}
              onToggleFavorite={toggleFavorite}
              onOpenDish={openDishFromRecommend}
              onRequireLogin={() => {
                if (!requireLogin(setActiveTab, setForceLogin)) return false;
                return true;
              }}
            />
          </TabLayer>
          <TabLayer visible={activeTab === "dish"}>
            <DishSection
              onError={setErrorMessage}
              favoriteDishIds={favoriteDishIds}
              onToggleFavorite={toggleFavorite}
              onOpenDish={addRecentView}
              focusDishId={focusDishId}
              onRequireLogin={() => {
                if (!requireLogin(setActiveTab, setForceLogin)) return false;
                return true;
              }}
            />
          </TabLayer>
          <TabLayer visible={activeTab === "community"} scrollable={false}>
            <CommunitySection
              onError={setErrorMessage}
              onComposePress={() => {
                setErrorMessage("");
                if (!requireLogin(setActiveTab, setForceLogin)) return;
                setCreatePostOpen(true);
              }}
              onRequireLogin={() => {
                if (!requireLogin(setActiveTab, setForceLogin)) return false;
                return true;
              }}
            />
          </TabLayer>
          <TabLayer visible={activeTab === "profile"}>
            <ProfileSection
              favorites={favorites}
              recentViews={recentViews}
              onGoRecommend={() => setActiveTab("recommend")}
              onOpenDishInDishTab={(dishId) => {
                setFocusDishId(dishId);
                setActiveTab("dish");
              }}
              onOpenDishDetail={(dishId) => {
                setDetailPrefetch(null);
                setDetailDishId(dishId);
              }}
              onToggleFavorite={toggleFavorite}
              onClearRecentViews={clearRecentViews}
              onOpenFamilySpace={() => {
                setErrorMessage("");
                if (!requireLogin(setActiveTab, setForceLogin)) return;
                if (useFamilySpaceStore.getState().joined) {
                  setFamilyDetailOpen(true);
                } else {
                  setFamilyFlow("landing");
                }
              }}
              onOpenGathering={() => {
                setErrorMessage("");
                if (!requireLogin(setActiveTab, setForceLogin)) return;
                setGatheringOpen(true);
              }}
              forceLogin={forceLogin}
              onLoginHandled={() => setForceLogin(false)}
            />
          </TabLayer>
        </View>
        {!detailDishId &&
        !createPostOpen &&
        familyFlow === "closed" &&
        !gatheringOpen &&
        !familyDetailOpen &&
        !weekMenuOpen &&
        !shoppingListOpen &&
        !frequentDishesOpen &&
        !wishlistOpen ? (
          <View style={styles.bottomTabBar}>
            <TabButton label="推荐" icon="🍳" active={activeTab === "recommend"} onPress={() => setActiveTab("recommend")} />
            <TabButton label="查菜" icon="🔍" active={activeTab === "dish"} onPress={() => setActiveTab("dish")} />
            <TabButton label="社区" icon="👥" active={activeTab === "community"} onPress={() => setActiveTab("community")} />
            <TabButton label="我的" icon="👤" active={activeTab === "profile"} onPress={() => setActiveTab("profile")} />
          </View>
        ) : null}
        {detailDishId ? (
          <View style={styles.detailOverlay}>
            <RecipeDetailPage
              dishId={detailDishId}
              listPreview={detailPrefetch?.dishId === detailDishId ? detailPrefetch : null}
              favoriteDishIds={favoriteDishIds}
              onToggleFavorite={toggleFavorite}
              onOpenDish={addRecentView}
              onBack={closeDishDetail}
            />
          </View>
        ) : null}
        {createPostOpen ? (
          <View style={[styles.detailOverlay, styles.composeOverlay]}>
            <CreatePostPage onBack={() => setCreatePostOpen(false)} />
          </View>
        ) : null}
        {familyFlow === "landing" ? (
          <View style={[styles.detailOverlay, styles.familyLandingOverlay]}>
            <FamilyHomePage
              onBack={() => setFamilyFlow("closed")}
              onCreateFamily={() => setFamilyFlow("create")}
              onJoinFamily={() => setFamilyFlow("join")}
            />
          </View>
        ) : null}
        {familyFlow === "join" ? (
          <View style={[styles.detailOverlay, styles.familyJoinOverlay]}>
            <JoinFamilyPage
              onBack={() => setFamilyFlow("landing")}
              onJoined={(familyId) => {
                track("family_join_success", {});
                useWeekMenuStore.getState().reset();
                useFamilySpaceStore.getState().setJoined({
                  familyId: familyId || undefined,
                  spaceTitle: "情侣空间",
                  memberCount: 2,
                  plannedDaysThisWeek: 0,
                  familyDisplayName: "我们的家庭",
                  relation: "couple",
                });
                closeFamilyFlowToProfile();
              }}
            />
          </View>
        ) : null}
        {familyFlow === "create" ? (
          <View style={[styles.detailOverlay, styles.familyCreateOverlay]}>
            <CreateFamilyPage
              onBack={() => setFamilyFlow("landing")}
              onCreated={(result) => {
                setFamilyInviteCode(result.inviteCode);
                useWeekMenuStore.getState().reset();
                useFamilySpaceStore.getState().setJoined({
                  familyId: result.familyId || undefined,
                  spaceTitle: result.relation === "couple" ? "情侣空间" : "合租空间",
                  memberCount: 1,
                  plannedDaysThisWeek: 0,
                  familyDisplayName: result.familyName,
                  relation: result.relation,
                });
                setFamilyFlow("success");
              }}
            />
          </View>
        ) : null}
        {familyFlow === "success" ? (
          <View style={[styles.detailOverlay, styles.familySuccessOverlay]}>
            <FamilyCreatedSuccessPage
              inviteCode={familyInviteCode}
              onBack={closeFamilyFlowToProfile}
              onLaterShare={closeFamilyFlowToProfile}
            />
          </View>
        ) : null}
        {gatheringOpen ? (
          <View style={[styles.detailOverlay, styles.gatheringOverlay]}>
            <TemporaryGatheringPage
              onBack={() => setGatheringOpen(false)}
              onOpenShoppingList={() => {
                useShoppingListStore.getState().setPurchaseMode("single");
                setShoppingListFromGathering(true);
                setShoppingListOpen(true);
              }}
            />
          </View>
        ) : null}
        {familyDetailOpen ? (
          <View style={[styles.detailOverlay, styles.familyDetailOverlay]}>
            <FamilyDetailPage
              onBack={() => {
                setWeekMenuOpen(false);
                setShoppingListOpen(false);
                setShoppingListFromGathering(false);
                setFrequentDishesOpen(false);
                setWishlistOpen(false);
                setFamilyDetailOpen(false);
              }}
              onOpenWeekMenu={() => setWeekMenuOpen(true)}
              onOpenShoppingList={() => {
                setShoppingListFromGathering(false);
                setShoppingListOpen(true);
              }}
              onOpenFrequentDishes={() => setFrequentDishesOpen(true)}
              onOpenWishlist={() => setWishlistOpen(true)}
            />
          </View>
        ) : null}
        {weekMenuOpen ? (
          <View style={[styles.detailOverlay, styles.weekMenuOverlay]}>
            <WeekMenuPage onBack={() => setWeekMenuOpen(false)} />
          </View>
        ) : null}
        {shoppingListOpen ? (
          <View style={[styles.detailOverlay, styles.shoppingListOverlay]}>
            <ShoppingListPage
              onBack={() => {
                setShoppingListOpen(false);
                setShoppingListFromGathering(false);
              }}
              gatheringSingleList={shoppingListFromGathering}
            />
          </View>
        ) : null}
        {frequentDishesOpen ? (
          <View style={[styles.detailOverlay, styles.frequentDishesOverlay]}>
            <FrequentDishesPage onBack={() => setFrequentDishesOpen(false)} />
          </View>
        ) : null}
        {wishlistOpen ? (
          <View style={[styles.detailOverlay, styles.wishlistOverlay]}>
            <WishlistPoolPage onBack={() => setWishlistOpen(false)} />
          </View>
        ) : null}
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

type TabButtonProps = {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({ label, icon, active, onPress }: TabButtonProps) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
        <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      </View>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  main: { flex: 1, position: "relative" },
  errorBanner: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  tabStack: { flex: 1, position: "relative" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: "#fff",
    elevation: 24,
  },
  composeOverlay: {
    zIndex: 1001,
    backgroundColor: "#fafafa",
  },
  familyLandingOverlay: {
    zIndex: 1002,
    backgroundColor: "#fafafa",
  },
  familyCreateOverlay: {
    zIndex: 1003,
    backgroundColor: "#fafafa",
  },
  familyJoinOverlay: {
    zIndex: 1003,
    backgroundColor: "#fafafa",
  },
  familySuccessOverlay: {
    zIndex: 1004,
    backgroundColor: "#fafafa",
  },
  gatheringOverlay: {
    zIndex: 1002,
    backgroundColor: "#fafafa",
  },
  familyDetailOverlay: {
    zIndex: 1005,
    backgroundColor: "#fafafa",
  },
  weekMenuOverlay: {
    zIndex: 1006,
    backgroundColor: "#fafafa",
  },
  shoppingListOverlay: {
    zIndex: 1007,
    backgroundColor: "#fafafa",
  },
  frequentDishesOverlay: {
    zIndex: 1008,
    backgroundColor: "#fafafa",
  },
  wishlistOverlay: {
    zIndex: 1009,
    backgroundColor: "#fafafa",
  },
  bottomTabBar: {
    height: 66,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  tabIconWrap: {
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  tabIconWrapActive: { backgroundColor: "rgba(255,107,53,0.1)" },
  tabIcon: { fontSize: 20, opacity: 0.55 },
  tabIconActive: { opacity: 1 },
  tabText: { fontSize: 12, color: "#757575" },
  tabTextActive: { color: "#ff6b35" },
  error: {
    color: "#b91c1c",
    fontSize: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
