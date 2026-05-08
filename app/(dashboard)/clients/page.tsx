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
import { ClientCard } from "@/components/clients/client-card";
import { CLIENT_STATUSES } from "@/lib/constants";
import { useClients } from "@/hooks/use-clients";
import type { ClientStatus } from "@/lib/types";

export default function ClientsPage() {
  const clients = useClients();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ClientStatus>("all");

  const filtered = useMemo(() => {
    const q = query.trim();
    return clients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return c.name.includes(q) || c.phone.includes(q) || (c.lineId ?? "").includes(q);
    });
  }, [clients, query, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">客戶清單</h2>
          <p className="text-sm text-slate-500">共 {clients.length} 筆客戶</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="mr-1 h-4 w-4" />
            新增客戶
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋姓名、電話或 LINE ID..."
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
            {CLIENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          找不到符合條件的客戶
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  );
}
