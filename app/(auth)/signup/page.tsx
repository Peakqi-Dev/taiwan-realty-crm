"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { signUpAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "建立中..." : "建立帳號"}
    </Button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useFormState(signUpAction, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Home className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">建立帳號</h1>
            <p className="text-sm text-slate-500">註冊 LeadFlow AI 業務助手</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">姓名</Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="例:陳俊豪"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
              <p className="text-xs text-slate-500">至少 6 個字元</p>
            </div>

            {state.error && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {state.error}
              </p>
            )}

            <SubmitButton />
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            已有帳號?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              登入
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
