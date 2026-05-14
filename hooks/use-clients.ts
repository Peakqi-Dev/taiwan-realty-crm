"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { Client, ClientStatus, ClientType } from "@/lib/types";
import { createClient as createSupabase } from "@/lib/supabase/client";

interface ClientRow {
  id: string;
  name: string;
  phone: string;
  line_id: string | null;
  type: ClientType;
  status: ClientStatus;
  budget_min: number | null;
  budget_max: number | null;
  preferred_districts: string[];
  requirements: string;
  assigned_to: string;
  last_contact_at: string;
  created_at: string;
}

export function rowToClient(r: ClientRow): Client {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    lineId: r.line_id ?? undefined,
    type: r.type,
    status: r.status,
    budgetMin: r.budget_min ?? undefined,
    budgetMax: r.budget_max ?? undefined,
    preferredDistricts: r.preferred_districts,
    requirements: r.requirements,
    assignedTo: r.assigned_to,
    lastContactAt: new Date(r.last_contact_at),
    createdAt: new Date(r.created_at),
  };
}

interface ClientState {
  clients: Client[];
  isLoading: boolean;
  initialized: boolean;
  loadAll: () => Promise<void>;
  refresh: () => Promise<void>;
  setOne: (client: Client) => void;
  removeOne: (id: string) => void;
  getById: (id: string) => Client | undefined;
  bumpLastContact: (clientId: string, at: Date) => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  isLoading: false,
  initialized: false,
  loadAll: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[useClients] loadAll failed:", error.message);
      set({ isLoading: false });
      return;
    }
    set({
      clients: (data as ClientRow[]).map(rowToClient),
      isLoading: false,
      initialized: true,
    });
  },
  refresh: async () => {
    set({ initialized: false });
    await get().loadAll();
  },
  setOne: (client) =>
    set((s) => {
      const idx = s.clients.findIndex((c) => c.id === client.id);
      if (idx === -1) return { clients: [client, ...s.clients] };
      const next = s.clients.slice();
      next[idx] = client;
      return { clients: next };
    }),
  removeOne: (id) =>
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
  getById: (id) => get().clients.find((c) => c.id === id),
  bumpLastContact: (clientId, at) =>
    set((s) => ({
      clients: s.clients.map((c) =>
        c.id === clientId ? { ...c, lastContactAt: at } : c,
      ),
    })),
}));

export function useClients() {
  const clients = useClientStore((s) => s.clients);
  const initialized = useClientStore((s) => s.initialized);
  const loadAll = useClientStore((s) => s.loadAll);
  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);
  return clients;
}

export function useClient(id: string) {
  const clients = useClients();
  return clients.find((c) => c.id === id);
}
