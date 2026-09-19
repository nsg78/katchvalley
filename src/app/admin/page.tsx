import type { Metadata } from "next";
import { AdminLogin } from "@/components/AdminLogin";

export const metadata: Metadata = { title: "Administration" };

export default function AdminPage() {
  return <AdminLogin />;
}
