import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { track } from "../analytics/tracker";
import { useGatheringStore } from "../store/gatheringStore";

type TemporaryGatheringPageProps = {
  onBack: () => void;
  /** 聚餐进行中：跳转采购清单（叠在当前聚餐流程之上） */
  onOpenShoppingList?: () => void;
};

type FlowStep = "create" | "success" | "room";

export function TemporaryGatheringPage({ onBack, onOpenShoppingList }: TemporaryGatheringPageProps) {
  const [step, setStep] = useState<FlowStep>("create");
  const resetStore = useGatheringStore((s) => s.reset);

  useEffect(() => {
    return () => {
      resetStore();
    };
  }, [resetStore]);

  function handleBack() {
    onBack();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {step === "create" ? (
        <CreateGatheringStep
          onBack={handleBack}
          onCreated={() => {
            setStep("success");
          }}
        />
      ) : null}
      {step === "success" ? (
        <GatheringSuccessStep
          onBack={handleBack}
          onEnterRoom={() => {
            track("gathering_enter_room", {});
            setStep("room");
          }}
        />
      ) : null}
      {step === "room" ? (
        <GatheringRoomStep onBack={handleBack} onOpenShoppingList={onOpenShoppingList} />
      ) : null}
    </SafeAreaView>
  );
}

function CreateGatheringStep({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const beginGathering = useGatheringStore((s) => s.beginGathering);
  const [title, setTitle] = useState("");
  const [headcountStr, setHeadcountStr] = useState("6");

  function resolvedHeadcount(): number {
    const t = headcountStr.trim();
    if (t === "") return 6;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n)) return 6;
    return Math.min(99, Math.max(1, n));
  }

  const canSubmit = title.trim().length > 0;

  async function submit() {
    if (!canSubmit) return;
    const headcount = resolvedHeadcount();
    track("gathering_create_submit", { titleLen: title.trim().length, headcount });
    await beginGathering(title.trim(), headcount);
    onCreated();
  }

  return (
    <>
      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          创建聚餐
        </Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.createScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIconSquare}>
          <Ionicons name="person-add-outline" size={32} color="#ea580c" />
        </View>

        <Text style={styles.fieldLabel}>聚餐标题</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="例如：周末家庭聚餐"
          placeholderTextColor="rgba(26,26,26,0.5)"
        />

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>预计人数</Text>
        <TextInput
          style={styles.input}
          value={headcountStr}
          onChangeText={(t) => setHeadcountStr(t.replace(/[^\d]/g, "").slice(0, 2))}
          placeholder="6"
          placeholderTextColor="rgba(26,26,26,0.5)"
          keyboardType="number-pad"
        />

        <Pressable style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]} onPress={submit} disabled={!canSubmit}>
          <Text style={styles.primaryBtnText}>创建聚餐</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function GatheringSuccessStep({
  onBack,
  onEnterRoom,
}: {
  onBack: () => void;
  onEnterRoom: () => void;
}) {
  const joinUrl = useGatheringStore((s) => s.joinUrl);
  const title = useGatheringStore((s) => s.title);
  const [toastVisible, setToastVisible] = useState(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setToastVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);

  async function copyJoinLink() {
    await Clipboard.setStringAsync(joinUrl);
    track("gathering_join_link_copy", {});
    setCopyToast("链接已复制，可发给好友备用");
    setTimeout(() => setCopyToast(null), 2200);
  }

  async function shareGathering() {
    track("gathering_share_tap", {});
    try {
      await Share.share({
        title: "临时聚餐邀请",
        message: `「${title || "临时聚餐"}」邀请你加入，扫码即可一起报菜：${joinUrl}`,
      });
    } catch {
      /* dismissed */
    }
  }

  return (
    <>
      {toastVisible ? (
        <View style={styles.topToast}>
          <Ionicons name="checkmark-circle" size={18} color="#008a2e" />
          <Text style={styles.topToastText}>聚餐创建成功</Text>
        </View>
      ) : null}
      {copyToast ? (
        <View style={styles.copyToastWrap} pointerEvents="none">
          <Text style={styles.copyToastText}>{copyToast}</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          创建聚餐
        </Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.successScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successIconCircle}>
          <Ionicons name="people" size={36} color="#15803d" />
        </View>

        <Text style={styles.successTitle}>聚餐创建成功</Text>
        <Text style={styles.successSubtitle}>扫码加入临时聚餐，好友扫码后即可报想吃的菜</Text>

        <View style={styles.shareCard}>
          <Text style={styles.shareCardLabel}>邀请二维码</Text>
          <View style={styles.qrPeachBox}>
            <View style={styles.qrWhitePad}>
              <QRCode value={joinUrl} size={188} color="#1a1a1a" backgroundColor="#ffffff" />
            </View>
            <Text style={styles.qrHint}>使用手机相机或微信扫一扫加入</Text>
          </View>

          <Pressable style={styles.copyLinkRow} onPress={copyJoinLink}>
            <Text style={styles.copyLinkText} numberOfLines={1}>
              {joinUrl}
            </Text>
            <Ionicons name="copy-outline" size={22} color="#6b7280" />
          </Pressable>
          <Text style={styles.copyLinkCaption}>无法扫码时，可复制链接发给好友</Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={shareGathering}>
          <Ionicons name="share-social-outline" size={22} color="#fff" />
          <Text style={styles.primaryBtnText}>分享给朋友</Text>
        </Pressable>

        <Pressable onPress={onEnterRoom} style={styles.textLinkBtn}>
          <Text style={styles.textLink}>进入聚餐页面</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function SectionHeading({
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <View style={styles.sectionHeadingRow}>
      <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.sectionHeadingTextCol}>
        <Text style={styles.sectionHeadingTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionHeadingSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const QUICK_DRINK_CHIPS: { label: string; qty: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "啤酒", qty: "1箱", icon: "beer-outline" },
  { label: "红酒", qty: "2瓶", icon: "wine-outline" },
  { label: "软饮", qty: "1套", icon: "water-outline" },
  { label: "白酒", qty: "1瓶", icon: "flask-outline" },
];

function GatheringRoomStep({
  onBack,
  onOpenShoppingList,
}: {
  onBack: () => void;
  onOpenShoppingList?: () => void;
}) {
  const title = useGatheringStore((s) => s.title);
  const headcount = useGatheringStore((s) => s.headcount);
  const joinUrl = useGatheringStore((s) => s.joinUrl);
  const wishes = useGatheringStore((s) => s.wishes);
  const drinks = useGatheringStore((s) => s.drinks);
  const addWish = useGatheringStore((s) => s.addWish);
  const addDrink = useGatheringStore((s) => s.addDrink);
  const removeDrink = useGatheringStore((s) => s.removeDrink);
  const [nickname, setNickname] = useState("");
  const [dish, setDish] = useState("");
  const [drinkName, setDrinkName] = useState("");
  const [drinkQty, setDrinkQty] = useState("");
  const [miniToast, setMiniToast] = useState<string | null>(null);

  async function submitWish() {
    const d = dish.trim();
    if (!d) return;
    await addWish(nickname, d);
    track("gathering_wish_add", { hasNickname: nickname.trim().length > 0 });
    setDish("");
    setMiniToast("已记录一道菜");
    setTimeout(() => setMiniToast(null), 1800);
  }

  function submitDrink() {
    const n = drinkName.trim();
    if (!n) return;
    addDrink(n, drinkQty.trim() || undefined);
    track("gathering_drink_add", { hasQty: drinkQty.trim().length > 0 });
    setDrinkName("");
    setDrinkQty("");
    setMiniToast("已记录酒水");
    setTimeout(() => setMiniToast(null), 1800);
  }

  function openShopping() {
    track("gathering_open_shopping_list", {});
    onOpenShoppingList?.();
  }

  return (
    <>
      {miniToast ? (
        <View style={styles.miniToastWrap} pointerEvents="none">
          <View style={styles.miniToast}>
            <Ionicons name="checkmark-circle" size={18} color="#008a2e" />
            <Text style={styles.miniToastText}>{miniToast}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          聚餐进行中
        </Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.roomScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.roomHeroCard}>
          <View style={styles.roomHeroTop}>
            <View style={styles.roomHeroIconWrap}>
              <Ionicons name="calendar-outline" size={22} color="#ea580c" />
            </View>
            <View style={styles.roomHeroTopText}>
              <Text style={styles.roomHeroLabel}>当前聚餐</Text>
              <Text style={styles.roomHeroTitle} numberOfLines={2}>
                {title || "临时聚餐"}
              </Text>
            </View>
          </View>
          <View style={styles.roomHeroStats}>
            <View style={styles.roomHeroStat}>
              <Ionicons name="people-outline" size={16} color="#6b7280" />
              <Text style={styles.roomHeroStatText}>预计 {headcount} 人</Text>
            </View>
            <View style={styles.roomHeroDot} />
            <View style={styles.roomHeroStat}>
              <Ionicons name="restaurant-outline" size={16} color="#6b7280" />
              <Text style={styles.roomHeroStatText}>{wishes.length} 道菜</Text>
            </View>
            <View style={styles.roomHeroDot} />
            <View style={styles.roomHeroStat}>
              <Ionicons name="wine-outline" size={16} color="#6b7280" />
              <Text style={styles.roomHeroStatText}>{drinks.length} 项酒水</Text>
            </View>
          </View>
        </View>

        <View style={styles.roomTip}>
          <Ionicons name="bulb-outline" size={18} color="#d97706" style={styles.roomTipIcon} />
          <Text style={styles.roomTipText}>
            好友扫描邀请二维码加入本桌后即可报菜；你也可以先帮大家记下意向。
          </Text>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeading
            title="大家想吃的"
            subtitle="报菜意向，开饭前可随时补充"
            icon="restaurant"
            iconColor="#ea580c"
            iconBg="#ffedd4"
          />
          {wishes.length === 0 ? (
            <View style={styles.emptyWish}>
              <Ionicons name="fast-food-outline" size={36} color="#d1d5db" />
              <Text style={styles.emptyWishText}>还没有报菜，快来添加第一道吧</Text>
            </View>
          ) : (
            <View style={styles.wishList}>
              {wishes.map((w) => (
                <View key={w.id} style={styles.wishRow}>
                  <View style={styles.wishIconBox}>
                    <Ionicons name="nutrition-outline" size={20} color="#ff6b35" />
                  </View>
                  <View style={styles.wishLeft}>
                    <Text style={styles.wishDish}>{w.dishName}</Text>
                    <View style={styles.wishFromRow}>
                      <Ionicons name="person-outline" size={14} color="#9ca3af" />
                      <Text style={styles.wishFrom}>{w.participantLabel}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeading
            title="酒水"
            subtitle="单独记账，采购时不易漏"
            icon="wine"
            iconColor="#7c3aed"
            iconBg="#ede9fe"
          />
          <View style={styles.drinkChipRow}>
            {QUICK_DRINK_CHIPS.map((c) => (
              <Pressable
                key={c.label + c.qty}
                style={styles.drinkChip}
                onPress={() => {
                  addDrink(c.label, c.qty);
                  track("gathering_drink_quick", { label: c.label });
                  setMiniToast(`已添加 ${c.label}`);
                  setTimeout(() => setMiniToast(null), 1600);
                }}
              >
                <Ionicons name={c.icon} size={16} color="#6d28d9" />
                <Text style={styles.drinkChipText}>
                  {c.label}
                  <Text style={styles.drinkChipQty}> · {c.qty}</Text>
                </Text>
              </Pressable>
            ))}
          </View>
          {drinks.length === 0 ? (
            <View style={styles.emptyDrink}>
              <Ionicons name="wine-outline" size={32} color="#d1d5db" />
              <Text style={styles.emptyDrinkText}>暂无酒水记录，点选上方快捷标签或手动添加</Text>
            </View>
          ) : (
            <View style={styles.drinkList}>
              {drinks.map((d) => (
                <View key={d.id} style={styles.drinkRow}>
                  <View style={styles.drinkIconBox}>
                    <Ionicons name="cafe-outline" size={18} color="#7c3aed" />
                  </View>
                  <View style={styles.drinkTextCol}>
                    <Text style={styles.drinkLabel}>{d.label}</Text>
                    <Text style={styles.drinkQty}>{d.qtyLabel}</Text>
                  </View>
                  <Pressable
                    style={styles.drinkRemove}
                    onPress={() => removeDrink(d.id)}
                    hitSlop={8}
                    accessibilityLabel="删除"
                  >
                    <Ionicons name="trash-outline" size={20} color="#9ca3af" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.fieldLabel}>手动添加酒水</Text>
          <View style={styles.drinkFormRow}>
            <TextInput
              style={[styles.input, styles.drinkInputHalf]}
              value={drinkName}
              onChangeText={setDrinkName}
              placeholder="名称，如干红"
              placeholderTextColor="rgba(26,26,26,0.5)"
            />
            <TextInput
              style={[styles.input, styles.drinkInputHalf]}
              value={drinkQty}
              onChangeText={setDrinkQty}
              placeholder="数量"
              placeholderTextColor="rgba(26,26,26,0.5)"
            />
          </View>
          <Pressable
            style={[styles.outlineAccentBtn, !drinkName.trim() && styles.primaryBtnDisabled]}
            onPress={submitDrink}
            disabled={!drinkName.trim()}
          >
            <Ionicons name="add-circle-outline" size={22} color="#7c3aed" />
            <Text style={styles.outlineAccentBtnText}>添加到酒水单</Text>
          </Pressable>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeading
            title="添加想吃的菜"
            subtitle="填写昵称方便辨认是谁想吃"
            icon="add-circle"
            iconColor="#059669"
            iconBg="#d1fae5"
          />
          <Text style={styles.fieldLabel}>怎么称呼（可选）</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="例如：小张"
            placeholderTextColor="rgba(26,26,26,0.5)"
          />
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>菜名</Text>
          <TextInput
            style={styles.input}
            value={dish}
            onChangeText={setDish}
            placeholder="例如：糖醋排骨"
            placeholderTextColor="rgba(26,26,26,0.5)"
            onSubmitEditing={submitWish}
          />
          <Pressable
            style={[styles.secondaryAccentBtn, !dish.trim() && styles.primaryBtnDisabled]}
            onPress={submitWish}
            disabled={!dish.trim()}
          >
            <Ionicons name="restaurant-outline" size={20} color="#fff" />
            <Text style={styles.secondaryAccentBtnText}>添加到聚餐单</Text>
          </Pressable>
          {onOpenShoppingList ? (
            <Pressable style={styles.shoppingListOutlineBtn} onPress={openShopping}>
              <Ionicons name="cart-outline" size={20} color="#ff6b35" />
              <Text style={styles.shoppingListOutlineBtnText}>生成采购清单</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.footerQrHint}>
          <View style={styles.footerQrTitleRow}>
            <Ionicons name="qr-code-outline" size={18} color="#1a1a1a" />
            <Text style={styles.footerQrTitle}>邀请更多好友</Text>
          </View>
          <Text style={styles.footerQrCap}>同一餐桌二维码 · 扫码加入继续报菜</Text>
          <View style={styles.footerQrBox}>
            <QRCode value={joinUrl} size={120} color="#1a1a1a" backgroundColor="#ffffff" />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(250,250,250,0.95)",
  },
  headerIconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: "600", color: "#1a1a1a", textAlign: "center" },
  scroll: { flex: 1 },
  createScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heroIconSquare: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#ffedd4",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#757575",
    marginBottom: 8,
    paddingLeft: 4,
  },
  fieldLabelSpaced: { marginTop: 16 },
  input: {
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
    minHeight: 50,
  },
  primaryBtn: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#ff6b35",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  topToast: {
    position: "absolute",
    top: 8,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf3",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  topToastText: { fontSize: 13, fontWeight: "600", color: "#008a2e" },

  copyToastWrap: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 21,
    alignItems: "center",
  },
  copyToastText: {
    fontSize: 13,
    color: "#1a1a1a",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },

  successScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    alignItems: "center",
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  shareCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 20,
  },
  shareCardLabel: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    marginBottom: 12,
  },
  qrPeachBox: {
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  qrWhitePad: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
  },
  qrHint: {
    fontSize: 13,
    color: "#757575",
    textAlign: "center",
  },
  copyLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff3e0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  copyLinkText: { flex: 1, fontSize: 13, color: "#1a1a1a" },
  copyLinkCaption: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
  textLinkBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  textLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#757575",
  },

  miniToastWrap: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: "center",
  },
  miniToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf3",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  miniToastText: { fontSize: 13, fontWeight: "600", color: "#008a2e" },

  roomScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  roomHeroCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 18,
    marginBottom: 12,
  },
  roomHeroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  roomHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ffedd4",
    alignItems: "center",
    justifyContent: "center",
  },
  roomHeroTopText: { flex: 1 },
  roomHeroLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginBottom: 4 },
  roomHeroTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  roomHeroStats: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  roomHeroStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  roomHeroStatText: { fontSize: 13, color: "#6b7280" },
  roomHeroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#d1d5db" },
  roomTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251,191,36,0.35)",
  },
  roomTipIcon: { marginTop: 1 },
  roomTipText: { flex: 1, fontSize: 13, color: "#78350f", lineHeight: 18 },
  shoppingListOutlineBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "rgba(255,107,53,0.4)",
    borderRadius: 16,
    paddingVertical: 14,
  },
  shoppingListOutlineBtnText: { fontSize: 16, fontWeight: "600", color: "#ff6b35" },
  sectionBlock: { marginBottom: 20 },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadingTextCol: { flex: 1 },
  sectionHeadingTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  sectionHeadingSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  emptyWish: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyWishText: { fontSize: 14, color: "#9ca3af", textAlign: "center" },
  wishList: { gap: 10 },
  wishRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  wishIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  wishLeft: { flex: 1 },
  wishDish: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  wishFromRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  wishFrom: { fontSize: 13, color: "#9ca3af" },
  drinkChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  drinkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f3ff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(124,58,237,0.2)",
  },
  drinkChipText: { fontSize: 13, fontWeight: "500", color: "#5b21b6" },
  drinkChipQty: { fontWeight: "400", color: "#7c3aed" },
  emptyDrink: {
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  emptyDrinkText: { fontSize: 13, color: "#9ca3af", textAlign: "center", lineHeight: 18 },
  drinkList: { gap: 8, marginBottom: 12 },
  drinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(124,58,237,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  drinkIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  drinkTextCol: { flex: 1 },
  drinkLabel: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  drinkQty: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  drinkRemove: { padding: 4 },
  drinkFormRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  drinkInputHalf: { flex: 1, minWidth: 0 },
  outlineAccentBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.45)",
    borderRadius: 16,
    paddingVertical: 14,
  },
  outlineAccentBtnText: { color: "#6d28d9", fontSize: 16, fontWeight: "600" },
  secondaryAccentBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ff6b35",
    borderRadius: 16,
    paddingVertical: 14,
  },
  secondaryAccentBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  footerQrHint: {
    marginTop: 12,
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  footerQrTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  footerQrTitle: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  footerQrCap: { fontSize: 12, color: "#9ca3af", marginBottom: 12, textAlign: "center" },
  footerQrBox: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
});
