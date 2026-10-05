/** Real status → color mapping for charts (matches the app's status semantics). */
export const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(30 80% 40%)",
  confirmed: "hsl(220 8% 44%)",
  processing: "hsl(210 80% 45%)",
  shipped: "hsl(260 55% 50%)",
  delivered: "hsl(152 45% 33%)",
  cancelled: "hsl(0 72% 45%)",
  returned: "hsl(15 85% 45%)",
  refunded: "hsl(190 75% 35%)",
  paid: "hsl(152 45% 33%)",
  failed: "hsl(0 72% 45%)",
  inactive: "hsl(220 8% 44%)",
};

export const statusColor = (status: string) => STATUS_COLORS[status] || "hsl(220 8% 44%)";
