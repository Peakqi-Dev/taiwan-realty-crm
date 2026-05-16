"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { updateAgentProfileAction, type UpdateUserState } from "./actions";

interface Props {
  userId: string;
  initial: {
    displayName: string;
    phone: string;
    bio: string;
    photoUrl: string;
    lineId: string;
  };
}

const initialState: UpdateUserState = {};

export function EditAgentProfileForm({ userId, initial }: Props) {
  const action = updateAgentProfileAction.bind(null, userId);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="顯示名稱" name="display_name" defaultValue={initial.displayName} required />
        <Field label="電話" name="phone" defaultValue={initial.phone} />
        <Field label="個人 LINE ID" name="line_id" defaultValue={initial.lineId} />
        <Field
          label="大頭照網址"
          name="photo_url"
          defaultValue={initial.photoUrl}
          type="url"
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500">自我介紹</label>
        <textarea
          name="bio"
          rows={3}
          maxLength={200}
          defaultValue={initial.bio}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
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
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      儲存個人資料
    </button>
  );
}
