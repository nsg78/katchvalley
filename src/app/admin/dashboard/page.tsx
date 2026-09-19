import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return <AdminDashboard />;
}
