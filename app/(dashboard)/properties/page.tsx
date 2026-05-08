"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyCard } from "@/components/properties/property-card";
import { PROPERTY_STATUSES } from "@/lib/constants";
import { useProperties } from "@/hooks/use-properties";
import type { PropertyStatus } from "@/lib/types";

export default function PropertiesPage() {
  const properties = useProperties();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PropertyStatus>("all");

  const filtered = useMemo(() => {
    const q = query.trim();
    return properties.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.title.includes(q) ||
        p.address.includes(q) ||
        p.district.includes(q)
      );
    });
  }, [properties, query, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">物件清單</h2>
          <p className="text-sm text-slate-500">共 {properties.length} 筆物件</p>
        </div>
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="mr-1 h-4 w-4" />
            新增物件
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋物件名稱、地址或行政區..."
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            {PROPERTY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          找不到符合條件的物件
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
