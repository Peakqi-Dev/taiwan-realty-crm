"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLIENT_STATUSES,
  CLIENT_TYPES,
  CURRENT_USER,
  TAIPEI_DISTRICTS,
} from "@/lib/constants";
import { useClientStore } from "@/hooks/use-clients";
import type { Client, ClientStatus, ClientType } from "@/lib/types";

interface ClientFormProps {
  initial?: Client;
  mode: "create" | "edit";
}

export function ClientForm({ initial, mode }: ClientFormProps) {
  const router = useRouter();
  const add = useClientStore((s) => s.add);
  const update = useClientStore((s) => s.update);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    lineId: initial?.lineId ?? "",
    type: (initial?.type ?? "買方") as ClientType,
    status: (initial?.status ?? "新客戶") as ClientStatus,
    budgetMin: initial?.budgetMin?.toString() ?? "",
    budgetMax: initial?.budgetMax?.toString() ?? "",
    preferredDistricts: initial?.preferredDistricts ?? [],
    requirements: initial?.requirements ?? "",
  });

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDistrict = (district: string) => {
    setForm((prev) => ({
      ...prev,
      preferredDistricts: prev.preferredDistricts.includes(district)
        ? prev.preferredDistricts.filter((d) => d !== district)
        : [...prev.preferredDistricts, district],
    }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      lineId: form.lineId.trim() || undefined,
      type: form.type,
      status: form.status,
      budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      preferredDistricts: form.preferredDistricts,
      requirements: form.requirements.trim(),
      assignedTo: initial?.assignedTo ?? CURRENT_USER.id,
    };

    if (mode === "create") {
      const created = add(payload);
      toast.success("客戶已新增");
      router.push(`/clients/${created.id}`);
    } else if (initial) {
      update(initial.id, payload);
      toast.success("客戶已更新");
      router.push(`/clients/${initial.id}`);
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">客戶姓名 *</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="例：王俊傑"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">電話 *</Label>
          <Input
            id="phone"
            required
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="0912-345-678"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lineId">LINE ID</Label>
          <Input
            id="lineId"
            value={form.lineId}
            onChange={(e) => setField("lineId", e.target.value)}
            placeholder="選填"
          />
        </div>

        <div className="space-y-1.5">
          <Label>客戶類型 *</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setField("type", v as ClientType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>狀態 *</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setField("status", v as ClientStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budgetMin">預算下限(萬元)</Label>
          <Input
            id="budgetMin"
            type="number"
            min={0}
            value={form.budgetMin}
            onChange={(e) => setField("budgetMin", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budgetMax">預算上限(萬元)</Label>
          <Input
            id="budgetMax"
            type="number"
            min={0}
            value={form.budgetMax}
            onChange={(e) => setField("budgetMax", e.target.value)}
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label>偏好行政區</Label>
          <div className="flex flex-wrap gap-2">
            {TAIPEI_DISTRICTS.map((d) => {
              const active = form.preferredDistricts.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDistrict(d)}
                  className={
                    "rounded-full border px-3 py-1 text-xs transition-colors " +
                    (active
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="requirements">需求備註</Label>
          <Textarea
            id="requirements"
            rows={4}
            value={form.requirements}
            onChange={(e) => setField("requirements", e.target.value)}
            placeholder="例：首購、雙北捷運站 5 分鐘內、2 房以上"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "儲存中..." : mode === "create" ? "新增客戶" : "更新客戶"}
        </Button>
      </div>
    </form>
  );
}
