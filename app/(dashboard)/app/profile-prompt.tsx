"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  saveProfileAction,
  type SaveProfileState,
} from "./profile-actions";

const DISMISS_KEY = "lf-profile-prompt-dismissed";

interface Props {
  hasSyntheticEmail: boolean;
  hasPhone: boolean;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "儲存中..." : "儲存"}
    </button>
  );
}

export function ProfilePrompt({ hasSyntheticEmail, hasPhone }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [state, formAction] = useFormState<SaveProfileState, FormData>(
    saveProfileAction,
    {},
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
  }, []);

  useEffect(() => {
    if (state.ok) {
      toast.success("資料已更新");
      setExpanded(false);
      // Hide for the rest of the session; full server check will hide it next load too.
      sessionStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (dismissed) return null;
  if (!hasSyntheticEmail && hasPhone) return null;

  const onDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-left text-sm font-medium text-blue-900 hover:underline"
          >
            補填電話和 Email，讓助手能寄報告給你 →
          </button>
          {expanded && (
            <form action={formAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                name="email"
                type="email"
                placeholder="真實 Email（選填）"
                className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
              />
              <input
                name="phone"
                placeholder="電話（選填）"
                className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
              />
              <SaveButton />
            </form>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="關閉提示"
          className="text-blue-700 hover:text-blue-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
