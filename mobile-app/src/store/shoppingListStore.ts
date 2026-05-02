import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PurchaseMode = "single" | "twoStage";

export type ShoppingPhase = 1 | 2;

/** 食材分类（采购清单展示用） */
export type ShoppingCategory =
  | "vegetable"
  | "meat_egg"
  | "seafood"
  | "staple"
  | "seasoning"
  | "other";

export const SHOPPING_CATEGORY_ORDER: ShoppingCategory[] = [
  "vegetable",
  "meat_egg",
  "seafood",
  "staple",
  "seasoning",
  "other",
];

export const SHOPPING_CATEGORY_LABEL: Record<ShoppingCategory, string> = {
  vegetable: "蔬菜豆制品",
  meat_egg: "肉禽蛋奶",
  seafood: "水产",
  staple: "米面主食",
  seasoning: "调味品干货",
  other: "其它",
};

export type ShoppingItem = {
  id: string;
  label: string;
  checked: boolean;
  /** 两阶段采购时分组：第 1 次 / 第 2 次 */
  phase: ShoppingPhase;
  /** 食材类别；旧数据可能缺失，按「其它」处理 */
  category?: ShoppingCategory;
};

const DEFAULT_ITEMS: ShoppingItem[] = [
  { id: "1", label: "西红柿 500g", checked: false, phase: 1, category: "vegetable" },
  { id: "2", label: "鸡蛋 10个", checked: false, phase: 1, category: "meat_egg" },
  { id: "3", label: "鸡胸肉 300g", checked: false, phase: 1, category: "meat_egg" },
  { id: "4", label: "五花肉 400g", checked: false, phase: 1, category: "meat_egg" },
  { id: "5", label: "鲈鱼 1条", checked: false, phase: 1, category: "seafood" },
  { id: "6", label: "豆腐 1盒", checked: false, phase: 2, category: "staple" },
  { id: "7", label: "排骨 500g", checked: false, phase: 2, category: "meat_egg" },
  { id: "8", label: "西兰花 1颗", checked: false, phase: 2, category: "vegetable" },
  { id: "9", label: "大蒜 1头", checked: false, phase: 2, category: "seasoning" },
  { id: "10", label: "生抽 1瓶", checked: false, phase: 2, category: "seasoning" },
];

function sortForDisplay(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? -1 : 1;
    return Number(a.id) - Number(b.id);
  });
}

export function getItemCategory(item: ShoppingItem): ShoppingCategory {
  return item.category ?? "other";
}

/** 按分类拆分并排序：仅包含有食材的分类 */
export function groupItemsByCategorySorted(items: ShoppingItem[]): { category: ShoppingCategory; items: ShoppingItem[] }[] {
  const buckets = new Map<ShoppingCategory, ShoppingItem[]>();
  for (const c of SHOPPING_CATEGORY_ORDER) buckets.set(c, []);
  for (const it of items) {
    const c = getItemCategory(it);
    buckets.get(c)?.push(it);
  }
  return SHOPPING_CATEGORY_ORDER.map((category) => ({
    category,
    items: sortForDisplay(buckets.get(category) ?? []),
  })).filter((g) => g.items.length > 0);
}

type ShoppingListState = {
  purchaseMode: PurchaseMode;
  items: ShoppingItem[];
  setPurchaseMode: (mode: PurchaseMode) => void;
  toggleChecked: (id: string) => void;
  markAtHome: (id: string) => void;
};

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set) => ({
      purchaseMode: "single",
      items: DEFAULT_ITEMS.map((i) => ({ ...i })),
      setPurchaseMode: (mode) => set({ purchaseMode: mode }),
      toggleChecked: (id) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
        })),
      markAtHome: (id) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, checked: true } : it)),
        })),
    }),
    {
      name: "bigchef-shopping-list",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ purchaseMode: s.purchaseMode, items: s.items }),
    },
  ),
);

export function selectPendingCount(items: ShoppingItem[]): number {
  return items.filter((i) => !i.checked).length;
}

export { sortForDisplay, DEFAULT_ITEMS };
