import { Card, CardContent } from "@/components/ui/card";
import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: { value: string; up: boolean };
  accent?: "maroon" | "gold" | "success" | "info";
}

export default function StatCard({
  label,
  value,
  subValue,
  trend,
  accent = "maroon",
}: StatCardProps) {
  const borderLeftColor =
    accent === "maroon"
      ? "border-l-[#7A1C2C]"
      : accent === "gold"
        ? "border-l-[#DDA625]"
        : accent === "success"
          ? "border-l-[#15803D]"
          : "border-l-[#1E252D]";

  return (
    <Card
      className={`border-l-4 border-[#E2E8F0] bg-white ${borderLeftColor} rounded-md shadow-none`}
    >
      <CardContent className="p-3.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
            {label}
          </span>
          {trend && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                trend.up ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"
              }`}
            >
              {trend.up ? "+" : "-"}
              {trend.value}
            </span>
          )}
        </div>
        <div className="text-xl leading-tight font-extrabold text-[#1E252D] tabular-nums">
          {value}
        </div>
        {subValue && <div className="mt-1 line-clamp-1 text-[11px] text-[#64748B]">{subValue}</div>}
      </CardContent>
    </Card>
  );
}
