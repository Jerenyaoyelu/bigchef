import { create } from "zustand";

export type GatheringWish = {
  id: string;
  participantLabel: string;
  dishName: string;
  createdAt: number;
};

export type GatheringDrink = {
  id: string;
  label: string;
  qtyLabel: string;
  createdAt: number;
};

function buildJoinUrl(roomId: string): string {
  return `https://bigchef.app/gathering/${roomId}`;
}

type GatheringState = {
  roomId: string | null;
  joinUrl: string;
  title: string;
  headcount: number;
  wishes: GatheringWish[];
  drinks: GatheringDrink[];
  beginGathering: (title: string, headcount: number) => void;
  addWish: (participantLabel: string, dishName: string) => void;
  addDrink: (label: string, qtyLabel?: string) => void;
  removeDrink: (id: string) => void;
  reset: () => void;
};

export const useGatheringStore = create<GatheringState>((set) => ({
  roomId: null,
  joinUrl: "",
  title: "",
  headcount: 6,
  wishes: [],
  drinks: [],
  beginGathering: (title, headcount) => {
    const roomId = `gathering_${Date.now()}`;
    const n = Number.isFinite(headcount) ? Math.round(headcount) : 6;
    set({
      roomId,
      joinUrl: buildJoinUrl(roomId),
      title: title.trim(),
      headcount: Math.min(99, Math.max(1, n)),
      wishes: [],
      drinks: [],
    });
  },
  addWish: (participantLabel, dishName) => {
    const dish = dishName.trim();
    if (!dish) return;
    const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({
      wishes: [
        {
          id,
          participantLabel: participantLabel.trim() || "好友",
          dishName: dish,
          createdAt: Date.now(),
        },
        ...s.wishes,
      ],
    }));
  },
  addDrink: (label, qtyLabel) => {
    const name = label.trim();
    if (!name) return;
    const id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const qty = (qtyLabel ?? "").trim() || "若干";
    set((s) => ({
      drinks: [{ id, label: name, qtyLabel: qty, createdAt: Date.now() }, ...s.drinks],
    }));
  },
  removeDrink: (id) =>
    set((s) => ({
      drinks: s.drinks.filter((d) => d.id !== id),
    })),
  reset: () =>
    set({
      roomId: null,
      joinUrl: "",
      title: "",
      headcount: 6,
      wishes: [],
      drinks: [],
    }),
}));
