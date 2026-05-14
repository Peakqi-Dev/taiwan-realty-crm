"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { Property, PropertyStatus, PropertyType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface PropertyRow {
  id: string;
  title: string;
  address: string;
  district: string;
  price: number;
  type: PropertyType;
  rooms: number;
  bathrooms: number;
  area: number;
  floor: string;
  total_floors: number;
  status: PropertyStatus;
  commission_deadline: string;
  description: string;
  images: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export function rowToProperty(r: PropertyRow): Property {
  return {
    id: r.id,
    title: r.title,
    address: r.address,
    district: r.district,
    price: r.price,
    type: r.type,
    rooms: r.rooms,
    bathrooms: r.bathrooms,
    area: r.area,
    floor: r.floor,
    totalFloors: r.total_floors,
    status: r.status,
    commissionDeadline: new Date(r.commission_deadline),
    description: r.description,
    images: r.images,
    ownerId: r.owner_id,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

interface PropertyState {
  properties: Property[];
  isLoading: boolean;
  initialized: boolean;
  loadAll: () => Promise<void>;
  refresh: () => Promise<void>;
  setOne: (property: Property) => void;
  removeOne: (id: string) => void;
  getById: (id: string) => Property | undefined;
}

export const usePropertyStore = create<PropertyState>((set, get) => ({
  properties: [],
  isLoading: false,
  initialized: false,
  loadAll: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[useProperties] loadAll failed:", error.message);
      set({ isLoading: false });
      return;
    }
    set({
      properties: (data as PropertyRow[]).map(rowToProperty),
      isLoading: false,
      initialized: true,
    });
  },
  refresh: async () => {
    set({ initialized: false });
    await get().loadAll();
  },
  setOne: (property) =>
    set((s) => {
      const idx = s.properties.findIndex((p) => p.id === property.id);
      if (idx === -1) return { properties: [property, ...s.properties] };
      const next = s.properties.slice();
      next[idx] = property;
      return { properties: next };
    }),
  removeOne: (id) =>
    set((s) => ({ properties: s.properties.filter((p) => p.id !== id) })),
  getById: (id) => get().properties.find((p) => p.id === id),
}));

export function useProperties() {
  const properties = usePropertyStore((s) => s.properties);
  const initialized = usePropertyStore((s) => s.initialized);
  const loadAll = usePropertyStore((s) => s.loadAll);
  useEffect(() => {
    if (!initialized) loadAll();
  }, [initialized, loadAll]);
  return properties;
}

export function useProperty(id: string) {
  const properties = useProperties();
  return properties.find((p) => p.id === id);
}
