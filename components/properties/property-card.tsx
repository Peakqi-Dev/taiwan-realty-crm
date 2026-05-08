import Link from "next/link";
import { Building2, MapPin, Ruler } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyStatusBadge } from "./property-status-badge";
import { formatPriceWan, daysFromNow } from "@/lib/utils";
import type { Property } from "@/lib/types";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const daysLeft = daysFromNow(property.commissionDeadline);
  const isExpiring = daysLeft >= 0 && daysLeft <= 7;
  const isExpired = daysLeft < 0;

  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{property.type} · {property.district}</p>
              <h3 className="font-semibold text-slate-900 truncate">{property.title}</h3>
            </div>
            <PropertyStatusBadge status={property.status} />
          </div>

          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{property.address}</span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {property.rooms} 房 {property.bathrooms} 衛
            </span>
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" />
              {property.area} 坪
            </span>
            <span>
              {property.floor} / {property.totalFloors} 樓
            </span>
          </div>

          <div className="flex items-end justify-between border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs text-slate-500">委託金額</p>
              <p className="text-lg font-bold text-blue-700">
                {formatPriceWan(property.price)}
              </p>
            </div>
            <p
              className={
                isExpired
                  ? "text-xs text-rose-600 font-medium"
                  : isExpiring
                    ? "text-xs text-amber-600 font-medium"
                    : "text-xs text-slate-500"
              }
            >
              {isExpired
                ? `已過期 ${Math.abs(daysLeft)} 天`
                : `委託剩 ${daysLeft} 天`}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
