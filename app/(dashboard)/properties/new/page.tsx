import { PropertyForm } from "@/components/properties/property-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">新增物件</h2>
        <p className="text-sm text-slate-500">建立委託物件基本資料</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <PropertyForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
