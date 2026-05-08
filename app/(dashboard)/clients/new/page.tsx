import { ClientForm } from "@/components/clients/client-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">新增客戶</h2>
        <p className="text-sm text-slate-500">建立客戶基本資料與需求</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <ClientForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
