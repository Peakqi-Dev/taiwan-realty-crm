"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
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
  TAIPEI_DISTRICTS,
} from "@/lib/constants";
import { useClientStore } from "@/hooks/use-clients";
import {
  createClientAction,
  updateClientAction,
  type ClientActionState,
} from "@/app/(dashboard)/clients/actions";
import type { Client, ClientStatus, ClientType } from "@/lib/types";

interface ClientFormProps {
  initial?: Client;
  mode: "create" | "edit";
}

function SubmitButton({ mode }: { mode: ClientFormProps["mode"] }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "儲存中..." : mode === "create" ? "新增客戶" : "更新客戶"}
    </Button>
  );
}

export function ClientForm({ initial, mode }: ClientFormProps) {
  const router = useRouter();
  const refresh = useClientStore((s) => s.refresh);

  const action =
    mode === "create"
      ? createClientAction
      : updateClientAction.bind(null, initial!.id);

  const [state, formAction] = useFormState<ClientActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result?.error) refresh();
      return result ?? {};
    },
    {},
  );

  const [type, setType] = useState<ClientType>(initial?.type ?? "買方");
  const [status, setStatus] = useState<ClientStatus>(
    initial?.status ?? "新客戶",
  );
  const [preferredDistricts, setPreferredDistricts] = useState<string[]>(
    initial?.preferredDistricts ?? [],
  );

  const toggleDistrict = (district: string) =>
    setPreferredDistricts((prev) =>
      prev.includes(district)
        ? prev.filter((d) => d !== district)
        : [...prev, district],
    );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="status" value={status} />
      {preferredDistricts.map((d) => (
        <input key={d} type="hidden" name="preferredDistricts" value={d} />
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">客戶姓名 *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="例：王俊傑"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">電話 *</Label>
          <Input
            id="phone"
            name="phone"
            required
            defaultValue={initial?.phone ?? ""}
            placeholder="0912-345-678"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lineId">LINE ID</Label>
          <Input
            id="lineId"
            name="lineId"
            defaultValue={initial?.lineId ?? ""}
            placeholder="選填"
          />
        </div>

        <div className="space-y-1.5">
          <Label>客戶類型 *</Label>
          <Select value={type} onValueChange={(v) => setType(v as ClientType)}>
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
            value={status}
            onValueChange={(v) => setStatus(v as ClientStatus)}
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
            name="budgetMin"
            type="number"
            min={0}
            defaultValue={initial?.budgetMin?.toString() ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budgetMax">預算上限(萬元)</Label>
          <Input
            id="budgetMax"
            name="budgetMax"
            type="number"
            min={0}
            defaultValue={initial?.budgetMax?.toString() ?? ""}
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label>偏好行政區</Label>
          <div className="flex flex-wrap gap-2">
            {TAIPEI_DISTRICTS.map((d) => {
              const active = preferredDistricts.includes(d);
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
            name="requirements"
            rows={4}
            defaultValue={initial?.requirements ?? ""}
            placeholder="例：首購、雙北捷運站 5 分鐘內、2 房以上"
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
