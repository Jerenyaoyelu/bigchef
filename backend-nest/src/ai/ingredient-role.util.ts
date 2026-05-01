export type IngredientPersistRole = "main" | "secondary" | "seasoning";

/** 模型返回的 role 归一化 */
export function normalizeRoleFromModel(role: unknown): IngredientPersistRole | undefined {
  if (typeof role !== "string") return undefined;
  const r = role.trim().toLowerCase();
  if (r === "main" || r === "secondary" || r === "seasoning") return r;
  return undefined;
}

/**
 * 常见液态/粉末调料与干香料（名称子串匹配）。
 * 刻意不含「淀粉/生粉/蛋清」等上浆料，归为辅料。
 */
const SEASONING_SUBSTRINGS = [
  "盐",
  "糖",
  "冰糖",
  "白糖",
  "红糖",
  "砂糖",
  "生抽",
  "老抽",
  "酱油",
  "味极鲜",
  "蚝油",
  "鲍汁",
  "料酒",
  "黄酒",
  "米酒",
  "花雕",
  "醋",
  "陈醋",
  "白醋",
  "米醋",
  "香醋",
  "鸡精",
  "味精",
  "鲜精",
  "胡椒粉",
  "花椒粉",
  "五香粉",
  "十三香",
  "孜然粉",
  "花椒",
  "八角",
  "桂皮",
  "香叶",
  "草果",
  "白芷",
  "干辣椒",
  "辣椒面",
  "豆瓣酱",
  "甜面酱",
  "黄豆酱",
  "辣椒酱",
  "番茄酱",
  "沙茶酱",
  "豆豉",
  "老干妈",
  "火锅底料",
  "香油",
  "麻油",
  "花椒油",
  "辣椒油",
  "芥末",
  "鱼露",
  "蒸鱼豉油",
  "苏打",
  "食用碱",
];

export function looksLikeSeasoningByName(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  // 「盐渍黄瓜」等含盐字但不是食盐调料
  if (/盐渍|腌渍|盐湖|盐场|盐酸/.test(n)) {
    return SEASONING_SUBSTRINGS.filter((k) => k !== "盐").some((k) => n.includes(k));
  }
  return SEASONING_SUBSTRINGS.some((k) => n.includes(k));
}

/**
 * 写入 DishIngredient.role：优先模型 role，其次按名称识别调料，再按位置兜底。
 */
export function resolvePersistIngredientRole(
  ing: { name: string; role?: unknown },
  index: number,
): IngredientPersistRole {
  const fromModel = normalizeRoleFromModel(ing.role);
  if (fromModel) return fromModel;
  if (looksLikeSeasoningByName(ing.name)) return "seasoning";
  if (index === 0) return "main";
  return "secondary";
}
