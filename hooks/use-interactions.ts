"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { Interaction, InteractionType } from "@/lib/types";
import { createClient as createSupabase } from "@/lib/supabase/client";

interface InteractionRow {
  id: string;
  client_id: string;
  property_id: string | null;
  type: InteractionType;
  note: string;
  created_by: string;
  created_at: string;
}

export function rowToInteraction(r: InteractionRow): Interaction {
  return {
    id: r.id,
    clientId: r.client_id,
    propertyId: r.property_id ?? undefined,
    type: r.type,
    note: r.note,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
  };
}

interface InteractionState {
  interactions: Interaction[];
  isLoading: boolean;
  initialized: boolean;
  loadAll: () => Promise<void>;
  refresh: () => Promise<void>;
  setOne: (interaction: Interaction) => void;
  removeOne: (id: string) => void;
  interactionsFor: (clientId: string) => Interaction[];
}

export const useInteractionStore = create<InteractionState>((set, get) => ({
  interactions: [],
  isLoading: false,
  initialized: false,
  loadAll: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from("interactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[useInteractions] loadAll failed:", error.message);
      set({ isLoading: false });
      return;
    }
    set({
      interactions: (data as InteractionRow[]).map(rowToInteraction),
      isLoading: false,
      initialized: true,
    });
  },
  refresh: async () => {
    set({ initialized: false });
    await get().loadAll();
  },
  setOne: (interaction) =>
    set((s) => {
      const idx = s.interactions.findIndex((i) => i.id === interaction.id);
      if (idx === -1) return { interactions: [interaction, ...s.interactions] };
      const next = s.interactions.slice();
      next[idx] = interaction;
      return { interactions: next };
    }),
  removeOne: (id) =>
    set((s) => ({ interactions: s.interactions.filter((i) => i.id !== id) })),
  interactionsFor: (clientId) =>
    get()
      .interactions.filter((i) => i.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
}));

export function useInteractions() {
  const interactions = useInteractionStore((s) => s.interactions);
  const initialized = useInteractionStore((s) => s.initialized);
  const loadAll = useInteractionStore((s) => s.loadAll);
  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);
  return interactions;
}
