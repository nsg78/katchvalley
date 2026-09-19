export type PaymentMethod = "cash" | "card";
export type PaymentStatus = "pending" | "paid";
export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  image_path: string;
  price: number;
  volume_ml: number | null;
  alcohol_pct: number | null;
  visual_tone: string;
  bottle_style: string;
  active: boolean;
  stock_count: number | null;
  sort_order: number;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

export type OrderItem = {
  id?: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

export type StatusHistory = {
  id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  delivery_location: string;
  notes: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  order_status_history?: StatusHistory[];
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Reçue",
  preparing: "En préparation",
  ready: "Prête",
  out_for_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée"
};

export const STATUS_STEPS: OrderStatus[] = [
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered"
];
