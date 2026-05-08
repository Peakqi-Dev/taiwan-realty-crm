import Link from "next/link";
import { Phone, MessageCircle, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ClientStatusBadge } from "./client-status-badge";
import { formatBudgetRange, formatRelative } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface ClientCardProps {
  client: Client;
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">{client.type}</p>
              <h3 className="font-semibold text-slate-900">{client.name}</h3>
            </div>
            <ClientStatusBadge status={client.status} />
          </div>

          <div className="space-y-1.5 text-sm text-slate-600">
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{client.phone}</span>
            </div>
            {client.lineId && (
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span>LINE: {client.lineId}</span>
              </div>
            )}
            {client.preferredDistricts.length > 0 && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {client.preferredDistricts.join("、")}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <div>
              <p className="text-slate-500">預算</p>
              <p className="font-medium text-slate-900">
                {formatBudgetRange(client.budgetMin, client.budgetMax)}
              </p>
            </div>
            <p className="text-slate-500">最後聯絡 {formatRelative(client.lastContactAt)}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
