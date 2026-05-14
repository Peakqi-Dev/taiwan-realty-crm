"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { ClientForm } from "@/components/clients/client-form";
import { useClient, useClientStore } from "@/hooks/use-clients";
import { deleteClientAction } from "@/app/(dashboard)/clients/actions";
import { CURRENT_USER, INTERACTION_TYPES } from "@/lib/constants";
import {
  formatBudgetRange,
  formatDate,
  formatDateTime,
  formatRelative,
} from "@/lib/utils";
import type { InteractionType } from "@/lib/types";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const client = useClient(params.id);
  const interactionsFor = useClientStore((s) => s.interactionsFor);
  const addInteraction = useClientStore((s) => s.addInteraction);
  const removeOne = useClientStore((s) => s.removeOne);
  const initialized = useClientStore((s) => s.initialized);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [interactionType, setInteractionType] = useState<InteractionType>("電話");
  const [note, setNote] = useState("");

  if (!client) {
    if (!initialized) {
      return (
        <div className="mx-auto max-w-4xl py-10 text-center text-sm text-slate-500">
          載入中...
        </div>
      );
    }
    notFound();
  }

  const interactions = interactionsFor(client.id);

  const onDelete = async () => {
    if (!confirm("確定要刪除此客戶?")) return;
    setDeleting(true);
    const result = await deleteClientAction(client.id);
    if (result.error) {
      toast.error(result.error);
      setDeleting(false);
      return;
    }
    removeOne(client.id);
    toast.success("客戶已刪除");
    router.push("/clients");
  };

  const onAddInteraction = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      toast.error("請輸入互動內容");
      return;
    }
    addInteraction({
      clientId: client.id,
      type: interactionType,
      note: note.trim(),
      createdBy: CURRENT_USER.id,
    });
    setNote("");
    toast.success("互動紀錄已新增");
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
            <ClientForm initial={client} mode="edit" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">{client.type}</p>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    {client.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4" /> {client.phone}
                    </span>
                    {client.lineId && (
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="h-4 w-4" /> LINE: {client.lineId}
                      </span>
                    )}
                  </div>
                </div>
                <ClientStatusBadge status={client.status} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">預算</p>
                  <p className="font-medium">
                    {formatBudgetRange(client.budgetMin, client.budgetMax)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">最後聯絡</p>
                  <p className="font-medium">
                    {formatRelative(client.lastContactAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">建檔日期</p>
                  <p className="font-medium">{formatDate(client.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">偏好行政區</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {client.preferredDistricts.length === 0 && (
                    <span className="text-sm text-slate-500">未指定</span>
                  )}
                  {client.preferredDistricts.map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">需求備註</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {client.requirements || "尚未填寫"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 font-semibold text-slate-900">新增互動紀錄</h2>
              <form onSubmit={onAddInteraction} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div className="space-y-1.5">
                    <Label>類型</Label>
                    <Select
                      value={interactionType}
                      onValueChange={(v) =>
                        setInteractionType(v as InteractionType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERACTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="note">內容</Label>
                    <Textarea
                      id="note"
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="記錄這次的對話、看屋反饋或下一步動作..."
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    <Plus className="mr-1 h-4 w-4" />
                    新增紀錄
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 font-semibold text-slate-900">互動紀錄</h2>
              {interactions.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                  尚無互動紀錄
                </p>
              ) : (
                <ul className="space-y-3">
                  {interactions.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {i.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(i.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {i.note}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="text-center">
            <Link
              href="/clients"
              className="text-sm text-blue-600 hover:underline"
            >
              ← 返回客戶清單
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
