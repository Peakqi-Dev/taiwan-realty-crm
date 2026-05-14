"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PropertyStatusBadge } from "@/components/properties/property-status-badge";
import { PropertyForm } from "@/components/properties/property-form";
import { useProperty, usePropertyStore } from "@/hooks/use-properties";
import { deletePropertyAction } from "@/app/(dashboard)/properties/actions";
import { formatDate, formatPriceWan, daysFromNow } from "@/lib/utils";
import { useState } from "react";

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const property = useProperty(params.id);
  const removeOne = usePropertyStore((s) => s.removeOne);
  const initialized = usePropertyStore((s) => s.initialized);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Wait for the store to load before deciding the property is missing.
  if (!property) {
    if (!initialized) {
      return (
        <div className="mx-auto max-w-4xl py-10 text-center text-sm text-slate-500">
          載入中...
        </div>
      );
    }
    notFound();
  }

  const days = daysFromNow(property.commissionDeadline);

  const onDelete = async () => {
    if (!confirm("確定要刪除此物件?")) return;
    setDeleting(true);
    const result = await deletePropertyAction(property.id);
    if (result.error) {
      toast.error(result.error);
      setDeleting(false);
      return;
    }
    removeOne(property.id);
    toast.success("物件已刪除");
    router.push("/properties");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            <Pencil className="mr-1 h-4 w-4" />
            {editing ? "取消編輯" : "編輯"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-1 h-4 w-4 text-rose-600" />
            {deleting ? "刪除中..." : "刪除"}
          </Button>
        </div>
      </div>

      {editing ? (
        <Card>
          <CardContent className="p-6">
            <PropertyForm initial={property} mode="edit" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    {property.type} · {property.district}
                  </p>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    {property.title}
                  </h1>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" /> {property.address}
                  </p>
                </div>
                <PropertyStatusBadge status={property.status} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">委託金額</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatPriceWan(property.price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">坪數</p>
                  <p className="text-lg font-semibold">{property.area} 坪</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">格局</p>
                  <p className="text-lg font-semibold">
                    {property.rooms} 房 {property.bathrooms} 衛
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">樓層</p>
                  <p className="text-lg font-semibold">
                    {property.floor} / {property.totalFloors}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">委託到期日</p>
                  <p className="font-medium">
                    {formatDate(property.commissionDeadline)}
                    {days >= 0 ? ` (${days} 天後)` : ` (已過期 ${Math.abs(days)} 天)`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">建立日期</p>
                  <p className="font-medium">{formatDate(property.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">最後更新</p>
                  <p className="font-medium">{formatDate(property.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-2 font-semibold text-slate-900">物件描述</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {property.description || "尚未填寫"}
              </p>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link
              href="/properties"
              className="text-sm text-blue-600 hover:underline"
            >
              ← 返回物件清單
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
