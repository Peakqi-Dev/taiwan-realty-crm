"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { saveAgentProfile, type SaveAgentProfileState } from "./actions";

interface Props {
  initial: {
    displayName: string;
    phone: string;
    bio: string;
    photoUrl: string;
    lineId: string;
  };
}

const initialState: SaveAgentProfileState = {};

export function ProfileForm({ initial }: Props) {
  const [state, formAction] = useFormState(saveAgentProfile, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <Field
        label="顯示名稱"
        name="display_name"
        defaultValue={initial.displayName}
        placeholder="林大明"
        required
        hint="客戶看到的名字。建議用「姓氏 + 名字」全名。"
      />

      <Field
        label="手機號碼"
        name="phone"
        defaultValue={initial.phone}
        placeholder="0912-345-678"
        hint="客戶點「聯絡業務」時會看到。"
      />

      <Field
        label="個人 LINE ID"
        name="line_id"
        defaultValue={initial.lineId}
        placeholder="@your-line-id"
        hint="客戶可以直接用這個 ID 加你個人 LINE，跟 Bot 是分開的兩件事。"
      />

      <Field
        label="大頭照網址"
        name="photo_url"
        defaultValue={initial.photoUrl}
        placeholder="https://..."
        type="url"
        hint="選填，建議方形圖。沒填會自動用名字首字。"
      />

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-900">
          自我介紹
        </label>
        <textarea
          name="bio"
          rows={4}
          defaultValue={initial.bio}
          maxLength={200}
          placeholder="例：信義區資深房仲，專精豪宅與整新中古屋，已有 8 年經驗。"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <p className="text-xs text-slate-500">最多 200 字。</p>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          已儲存
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  hint,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      儲存
    </button>
  );
}
