"use client";

import { create } from "zustand";
import type { Client, Interaction } from "@/lib/types";
import { mockClients, mockInteractions } from "@/lib/mock-data";

type NewClient = Omit<Client, "id" | "createdAt" | "lastContactAt"> & {
  lastContactAt?: Date;
};

interface ClientState {
  clients: Client[];
  interactions: Interaction[];
  isLoading: boolean;
  getById: (id: string) => Client | undefined;
  interactionsFor: (clientId: string) => Interaction[];
  add: (input: NewClient) => Client;
  update: (id: string, patch: Partial<NewClient>) => void;
  remove: (id: string) => void;
  addInteraction: (interaction: Omit<Interaction, "id" | "createdAt">) => Interaction;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: mockClients,
  interactions: mockInteractions,
  isLoading: false,
  getById: (id) => get().clients.find((c) => c.id === id),
  interactionsFor: (clientId) =>
    get()
      .interactions.filter((i) => i.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  add: (input) => {
    const client: Client = {
      ...input,
      id: `c-${Date.now()}`,
      createdAt: new Date(),
      lastContactAt: input.lastContactAt ?? new Date(),
    };
    set((s) => ({ clients: [client, ...s.clients] }));
    return client;
  },
  update: (id, patch) =>
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  remove: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
  addInteraction: (input) => {
    const interaction: Interaction = {
      ...input,
      id: `i-${Date.now()}`,
      createdAt: new Date(),
    };
    set((s) => ({
      interactions: [interaction, ...s.interactions],
      clients: s.clients.map((c) =>
        c.id === input.clientId ? { ...c, lastContactAt: interaction.createdAt } : c,
      ),
    }));
    return interaction;
  },
}));

export const useClients = () => useClientStore((s) => s.clients);
export const useClient = (id: string) =>
  useClientStore((s) => s.clients.find((c) => c.id === id));
