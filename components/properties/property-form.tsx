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
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TAIPEI_DISTRICTS,
  CURRENT_USER,
} from "@/lib/constants";
import { usePropertyStore } from "@/hooks/use-properties";
import type { Property, PropertyStatus, PropertyType } from "@/lib/types";

interface PropertyFormProps {
  initial?: Property;
  mode: "create" | "edit";
}

export function PropertyForm({ initial, mode }: PropertyFormProps) {
  const router = useRouter();
  const add = usePropertyStore((s) => s.add);
  const update = usePropertyStore((s) => s.update);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    address: initial?.address ?? "",
    district: initial?.district ?? TAIPEI_DISTRICTS[0],
    price: initial?.price?.toString() ?? "",
    type: (initial?.type ?? "買賣") as PropertyType,
    rooms: initial?.rooms?.toString() ?? "2",
    bathrooms: initial?.bathrooms?.toString() ?? "1",
    area: initial?.area?.toString() ?? "",
    floor: initial?.floor ?? "",
    totalFloors: initial?.totalFloors?.toString() ?? "",
    status: (initial?.status ?? "委託中") as PropertyStatus,
    commissionDeadline: initial?.commissionDeadline
      ? new Date(initial.commissionDeadline).toISOString().slice(0, 10)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    description: initial?.description ?? "",
  });

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      address: form.address.trim(),
      district: form.district,
      price: Number(form.price) || 0,
      type: form.type,
      rooms: Number(form.rooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      area: Number(form.area) || 0,
      floor: form.floor.trim(),
      totalFloors: Number(form.totalFloors) || 0,
      status: form.status,
      commissionDeadline: new Date(form.commissionDeadline),
      description: form.description.trim(),
      images: initial?.images ?? [],
      ownerId: initial?.ownerId ?? CURRENT_USER.id,
    };

    if (mode === "create") {
      const created = add(payload);
      toast.success("物件已新增");
      router.push(`/properties/${created.id}`);
    } else if (initial) {
      update(initial.id, payload);
      toast.success("物件已更新");
      router.push(`/properties/${initial.id}`);
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="title">物件名稱 *</Label>
          <Input
            id="title"
            required
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="例：大安森林公園旁 三房兩廳"
          />
        </div>

        <div className="space-y-1.5">
          <Label>類型 *</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setField("type", v as PropertyType)}
          >
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
            value={form.status}
            onValueChange={(v) => setField("status", v as PropertyStatus)}
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
          <Select
            value={form.district}
            onValueChange={(v) => setField("district", v)}
          >
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
            type="number"
            min={0}
            required
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
            placeholder="例：1880"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="address">地址 *</Label>
          <Input
            id="address"
            required
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="完整地址"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rooms">房數</Label>
          <Input
            id="rooms"
            type="number"
            min={0}
            value={form.rooms}
            onChange={(e) => setField("rooms", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bathrooms">衛浴</Label>
          <Input
            id="bathrooms"
            type="number"
            min={0}
            value={form.bathrooms}
            onChange={(e) => setField("bathrooms", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="area">坪數</Label>
          <Input
            id="area"
            type="number"
            min={0}
            value={form.area}
            onChange={(e) => setField("area", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="floor">樓層</Label>
          <Input
            id="floor"
            value={form.floor}
            onChange={(e) => setField("floor", e.target.value)}
            placeholder="例：8"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="totalFloors">總樓層</Label>
          <Input
            id="totalFloors"
            type="number"
            min={0}
            value={form.totalFloors}
            onChange={(e) => setField("totalFloors", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="commissionDeadline">委託到期日</Label>
          <Input
            id="commissionDeadline"
            type="date"
            value={form.commissionDeadline}
            onChange={(e) => setField("commissionDeadline", e.target.value)}
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="description">物件描述</Label>
          <Textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="格局、特色、屋況、屋主出售動機等..."
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "儲存中..." : mode === "create" ? "新增物件" : "更新物件"}
        </Button>
      </div>
    </form>
  );
}
