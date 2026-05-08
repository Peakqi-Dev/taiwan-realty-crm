"use client";

import { create } from "zustand";
import type { Property } from "@/lib/types";
import { mockProperties } from "@/lib/mock-data";

type NewProperty = Omit<Property, "id" | "createdAt" | "updatedAt">;

interface PropertyState {
  properties: Property[];
  isLoading: boolean;
  getById: (id: string) => Property | undefined;
  add: (input: NewProperty) => Property;
  update: (id: string, patch: Partial<NewProperty>) => void;
  remove: (id: string) => void;
}

export const usePropertyStore = create<PropertyState>((set, get) => ({
  properties: mockProperties,
  isLoading: false,
  getById: (id) => get().properties.find((p) => p.id === id),
  add: (input) => {
    const property: Property = {
      ...input,
      id: `p-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((s) => ({ properties: [property, ...s.properties] }));
    return property;
  },
  update: (id, patch) =>
    set((s) => ({
      properties: s.properties.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date() } : p,
      ),
    })),
  remove: (id) =>
    set((s) => ({ properties: s.properties.filter((p) => p.id !== id) })),
}));

export const useProperties = () => usePropertyStore((s) => s.properties);
export const useProperty = (id: string) =>
  usePropertyStore((s) => s.properties.find((p) => p.id === id));
