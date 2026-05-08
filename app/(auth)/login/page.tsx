"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // MVP: 直接跳轉到 Dashboard。NextAuth 會在後續 sprint 接上。
    setTimeout(() => router.push("/"), 300);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Home className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              房仲業務 CRM
            </h1>
            <p className="text-sm text-slate-500">登入以管理你的客戶與物件</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                defaultValue="demo@taiwan-realty.tw"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                defaultValue="demo"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "登入中..." : "登入"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            目前為 MVP 階段,任何帳號都可進入 Dashboard。
            <br />
            <Link href="/" className="text-blue-600 hover:underline">
              直接進入 →
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
