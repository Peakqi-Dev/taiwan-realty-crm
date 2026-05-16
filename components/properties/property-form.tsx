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
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TAIPEI_DISTRICTS,
} from "@/lib/constants";
import { usePropertyStore } from "@/hooks/use-properties";
import {
  createPropertyAction,
  updatePropertyAction,
  type PropertyActionState,
} from "@/app/(dashboard)/properties/actions";
import type { Property, PropertyStatus, PropertyType } from "@/lib/types";

interface PropertyFormProps {
  initial?: Property;
  mode: "create" | "edit";
}

function SubmitButton({ mode }: { mode: PropertyFormProps["mode"] }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "儲存中..." : mode === "create" ? "新增物件" : "更新物件"}
    </Button>
  );
}

export function PropertyForm({ initial, mode }: PropertyFormProps) {
  const router = useRouter();
  const refresh = usePropertyStore((s) => s.refresh);

  const action =
    mode === "create"
      ? createPropertyAction
      : updatePropertyAction.bind(null, initial!.id);

  const [state, formAction] = useFormState<PropertyActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      // If action redirected, this never runs. On validation error, refresh local cache after navigation back.
      if (!result?.error) refresh();
      return result ?? {};
    },
    {},
  );

  const [type, setType] = useState<PropertyType>(initial?.type ?? "買賣");
  const [status, setStatus] = useState<PropertyStatus>(
    initial?.status ?? "委託中",
  );
  const [district, setDistrict] = useState<string>(
    initial?.district ?? TAIPEI_DISTRICTS[0],
  );

  const defaultDeadline = initial?.commissionDeadline
    ? new Date(initial.commissionDeadline).toISOString().slice(0, 10)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden inputs mirror the Radix Select state into FormData */}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="district" value={district} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="title">物件名稱 *</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={initial?.title ?? ""}
            placeholder="例：大安森林公園旁 三房兩廳"
          />
        </div>

        <div className="space-y-1.5">
          <Label>類型 *</Label>
          <Select value={type} onValueChange={(v) => setType(v as PropertyType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((t) => (
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
            onValueChange={(v) => setStatus(v as PropertyStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>行政區 *</Label>
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAIPEI_DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">委託金額(萬元)*</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            required
            defaultValue={initial?.price?.toString() ?? ""}
            placeholder="例：1880"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="address">地址 *</Label>
          <Input
            id="address"
            name="address"
            required
            defaultValue={initial?.address ?? ""}
            placeholder="完整地址"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rooms">房數</Label>
          <Input
            id="rooms"
            name="rooms"
            type="number"
            min={0}
            defaultValue={initial?.rooms?.toString() ?? "2"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bathrooms">衛浴</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            type="number"
            min={0}
            defaultValue={initial?.bathrooms?.toString() ?? "1"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="area">坪數</Label>
          <Input
            id="area"
            name="area"
            type="number"
            min={0}
            defaultValue={initial?.area?.toString() ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="floor">樓層</Label>
          <Input
            id="floor"
            name="floor"
            defaultValue={initial?.floor ?? ""}
            placeholder="例：8"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="totalFloors">總樓層</Label>
          <Input
            id="totalFloors"
            name="totalFloors"
            type="number"
            min={0}
            defaultValue={initial?.totalFloors?.toString() ?? ""}
          />
        </div>

        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="commissionDeadline">委託到期日 *</Label>
          <Input
            id="commissionDeadline"
            name="commissionDeadline"
            type="date"
            required
            defaultValue={defaultDeadline}
            className="min-w-0 max-w-full appearance-none"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="description">物件描述</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={initial?.description ?? ""}
            placeholder="格局、特色、屋況、屋主出售動機等..."
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
