import {
  MEAL_ORDER,
  WEEKDAY_ORDER,
  type DaySlots,
  type MealKind,
  type WeekdaySlot,
} from "../store/weekMenuStore";

/** 统计本周菜单各菜名出现次数（同一菜填多个格子会计多次，与设计稿「共做 N 次」一致） */
export function dishCountsFromWeekSlots(slots: Record<WeekdaySlot, DaySlots>): Map<string, number> {
  const m = new Map<string, number>();
  for (const day of WEEKDAY_ORDER) {
    for (const meal of MEAL_ORDER) {
      const raw = slots[day][meal]?.trim();
      if (raw) {
        m.set(raw, (m.get(raw) ?? 0) + 1);
      }
    }
  }
  return m;
}

export type RankedDish = {
  name: string;
  count: number;
  rank: number;
};

export function rankedDishesFromSlots(slots: Record<WeekdaySlot, DaySlots>): RankedDish[] {
  const counts = dishCountsFromWeekSlots(slots);
  const entries = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0], "zh-Hans-CN");
  });
  return entries.map(([name, count], idx) => ({
    name,
    count,
    rank: idx + 1,
  }));
}

export function rankAccent(rank: number): string {
  if (rank === 1) return "#ff6900";
  return "#ff8904";
}
