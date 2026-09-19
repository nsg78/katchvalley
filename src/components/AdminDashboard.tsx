"use client";

import {
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  LogOut,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { FALLBACK_PRODUCTS } from "@/lib/catalog";
import { getBrowserClient } from "@/lib/supabase/browser";
import {
  STATUS_LABELS,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type Product
} from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

type Tab = "orders" | "products";

export function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [tab, setTab] = useState<Tab>("orders");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const knownOrderIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const fetchData = useCallback(async (accessToken: string, quiet = false) => {
    if (!quiet) setLoading(true);
    const [ordersResponse, productsResponse] = await Promise.all([
      fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
      fetch("/api/admin/products", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" })
    ]);

    if (ordersResponse.status === 401 || productsResponse.status === 401) {
      router.replace("/admin");
      return;
    }

    if (ordersResponse.ok) {
      const data = await ordersResponse.json();
      const incoming: Order[] = data.orders || [];
      if (!firstLoad.current) {
        const fresh = incoming.filter((order) => !knownOrderIds.current.has(order.id));
        if (fresh.length) {
          setToast(`${fresh.length} nouvelle${fresh.length > 1 ? "s" : ""} commande${fresh.length > 1 ? "s" : ""} reçue${fresh.length > 1 ? "s" : ""}`);
          if (Notification.permission === "granted") {
            new Notification("Khatch & Valley", { body: `${fresh.length} nouvelle commande à traiter.` });
          }
        }
      }
      knownOrderIds.current = new Set(incoming.map((order) => order.id));
      firstLoad.current = false;
      setOrders(incoming);
    }

    if (productsResponse.ok) {
      const data = await productsResponse.json();
      if (data.products?.length) setProducts(data.products);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      router.replace("/admin");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return router.replace("/admin");
      setToken(data.session.access_token);
      fetchData(data.session.access_token);
    });
  }, [fetchData, router]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => fetchData(token, true), 15000);
    return () => window.clearInterval(interval);
  }, [fetchData, token]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredOrders = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusMatch = statusFilter === "all"
        || (statusFilter === "active" && !["delivered", "cancelled"].includes(order.status))
        || order.status === statusFilter;
      const queryMatch = !lower || [order.order_number, order.customer_name, order.phone, order.delivery_location]
        .some((value) => value.toLowerCase().includes(lower));
      return statusMatch && queryMatch;
    });
  }, [orders, query, statusFilter]);

  const today = new Date().toISOString().slice(0, 10);
  const metrics = {
    newOrders: orders.filter((order) => order.status === "received").length,
    active: orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
    deliveredToday: orders.filter((order) => order.status === "delivered" && order.updated_at.startsWith(today)).length,
    pendingValue: orders.filter((order) => order.payment_status === "pending" && order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0)
  };

  async function updateOrder(id: string, updates: { status?: OrderStatus; paymentStatus?: PaymentStatus }) {
    const previous = orders;
    setOrders((current) => current.map((order) => order.id === id ? {
      ...order,
      ...(updates.status ? { status: updates.status } : {}),
      ...(updates.paymentStatus ? { payment_status: updates.paymentStatus } : {})
    } : order));

    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, ...updates })
    });
    if (!response.ok) {
      setOrders(previous);
      setToast("La modification n’a pas pu être enregistrée.");
    } else {
      setToast("Commande mise à jour.");
    }
  }

  async function updateProduct(id: string, updates: Partial<Pick<Product, "price" | "active" | "stock_count">>) {
    const previous = products;
    setProducts((current) => current.map((product) => product.id === id ? { ...product, ...updates } : product));
    const response = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, ...updates })
    });
    if (!response.ok) {
      setProducts(previous);
      setToast("Le produit n’a pas pu être modifié.");
    } else setToast("Catalogue mis à jour.");
  }

  async function logout() {
    await getBrowserClient()?.auth.signOut();
    router.replace("/admin");
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return setToast("Notifications non prises en charge sur cet appareil.");
    const permission = await Notification.requestPermission();
    setToast(permission === "granted" ? "Notifications activées." : "Autorisation non accordée.");
  }

  return (
    <main className="admin-shell">
      {toast && <div className="admin-toast"><Bell size={17} />{toast}</div>}
      <aside className="admin-sidebar">
        <div className="admin-brand"><Image src="/logo-original.png" alt="" width={39} height={39} priority /><span>K&amp;V<small>Brewstillery</small></span></div>
        <nav>
          <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ClipboardList />Commandes{metrics.newOrders > 0 && <b>{metrics.newOrders}</b>}</button>
          <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}><Boxes />Catalogue</button>
        </nav>
        <div className="admin-sidebar-foot">
          <button onClick={enableNotifications}><Bell />Notifications</button>
          <button onClick={logout}><LogOut />Déconnexion</button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div><p className="section-kicker">Khatch &amp; Valley</p><h1>{tab === "orders" ? "Gestion des commandes" : "Gestion du catalogue"}</h1></div>
          <button className="refresh-button" onClick={() => fetchData(token)} disabled={loading}><RefreshCw className={loading ? "spinning" : ""} />Actualiser</button>
        </header>

        {tab === "orders" ? (
          <>
            <div className="metric-grid">
              <div><span><ShoppingBag /></span><p>Nouvelles</p><strong>{metrics.newOrders}</strong></div>
              <div><span><ClipboardList /></span><p>À traiter</p><strong>{metrics.active}</strong></div>
              <div><span><PackageCheck /></span><p>Livrées aujourd’hui</p><strong>{metrics.deliveredToday}</strong></div>
              <div><span><CircleDollarSign /></span><p>À encaisser</p><strong>{formatMoney(metrics.pendingValue)}</strong></div>
            </div>

            <div className="admin-toolbar">
              <label className="admin-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="N° commande, client, téléphone…" /></label>
              <label className="filter-select"><span>Statut</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Commandes actives</option><option value="all">Toutes</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown /></label>
            </div>

            <div className="orders-list">
              {loading && !orders.length ? <div className="admin-empty">Chargement des commandes…</div> : filteredOrders.length === 0 ? <div className="admin-empty">Aucune commande dans cette vue.</div> : filteredOrders.map((order) => (
                <details className="admin-order-card" key={order.id}>
                  <summary>
                    <div className="order-id"><span>{formatDate(order.created_at)}</span><strong>{order.order_number}</strong></div>
                    <div className="order-customer"><strong>{order.customer_name}</strong><span>{order.phone}</span></div>
                    <div className="order-items-short">{order.order_items.reduce((sum, item) => sum + item.quantity, 0)} article(s)<span>{order.order_items.slice(0, 2).map((item) => item.product_name).join(", ")}{order.order_items.length > 2 ? "…" : ""}</span></div>
                    <strong className="order-price">{formatMoney(order.total)}</strong>
                    <StatusBadge status={order.status} />
                    <ChevronDown className="details-chevron" />
                  </summary>
                  <div className="admin-order-details">
                    <div className="admin-order-info">
                      <div><span>Livraison</span><strong>{order.delivery_location}</strong></div>
                      <div><span>Paiement prévu</span><strong>{order.payment_method === "cash" ? "Espèces" : "Carte"}</strong></div>
                      <div><span>Note client</span><strong>{order.notes || "Aucune instruction"}</strong></div>
                    </div>
                    <div className="admin-order-lines">
                      {order.order_items.map((item) => <div key={item.id || item.product_name}><span>{item.quantity}× {item.product_name}</span><strong>{formatMoney(item.subtotal)}</strong></div>)}
                    </div>
                    <div className="admin-order-actions">
                      <label>État de la commande<select value={order.status} onChange={(event) => updateOrder(order.id, { status: event.target.value as OrderStatus })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label>Règlement<select value={order.payment_status} onChange={(event) => updateOrder(order.id, { paymentStatus: event.target.value as PaymentStatus })}><option value="pending">À encaisser</option><option value="paid">Payé</option></select></label>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </>
        ) : (
          <div className="admin-products">
            <div className="catalog-note"><Boxes /><div><strong>Catalogue de la boutique</strong><p>Les changements de prix et de disponibilité sont immédiatement visibles côté client.</p></div></div>
            <div className="admin-product-grid">
              {products.map((product) => (
                <article className={product.active ? "admin-product" : "admin-product inactive"} key={product.id}>
                  <div className="admin-product-image"><Image src={product.image_path} alt="" fill sizes="50px" /></div>
                  <div className="admin-product-copy"><span>{product.category}</span><h2>{product.name}</h2><p>{product.description}</p></div>
                  <label>Prix ($)<input type="number" min="0" max="100000" value={product.price} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, price: Number(event.target.value) } : item))} onBlur={(event) => updateProduct(product.id, { price: Number(event.target.value) })} /></label>
                  <button className="availability-toggle" onClick={() => updateProduct(product.id, { active: !product.active })}>{product.active ? <><ToggleRight />Disponible</> : <><ToggleLeft />Masqué</>}</button>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
