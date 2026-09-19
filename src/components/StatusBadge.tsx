import { STATUS_LABELS, type OrderStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status-badge status-${status}`}><i />{STATUS_LABELS[status]}</span>;
}
