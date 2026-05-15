"use client";

import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useEffect } from "react";
import {
  updateUserNameAction,
  type UpdateUserState,
} from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? "儲存中..." : "儲存"}
    </button>
  );
}

export function EditNameForm({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const action = updateUserNameAction.bind(null, userId);
  const [state, formAction] = useFormState<UpdateUserState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) toast.success("姓名已更新");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div>
      <p className="text-xs text-slate-500">姓名</p>
      <form action={formAction} className="mt-1 flex items-center gap-2">
        <input
          name="displayName"
          defaultValue={initialName}
          placeholder="未設定"
          className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
        />
        <SaveButton />
      </form>
    </div>
  );
}
