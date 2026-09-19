"use client";

import {
  Bell,
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  LogOut,
  PackageCheck,
  Pencil,
  Plus,
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
import { ProductEditor } from "@/components/ProductEditor";
import { FALLBACK_PRODUCTS } from "@/lib/catalog";
import { getBrowserClient } from "@/lib/supabase/browser";
import {
  APPLICATION_ROLE_LABELS,
  APPLICATION_STATUS_LABELS,
  STATUS_LABELS,
  type ApplicationStatus,
  type JobApplication,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type Product
} from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

type Tab = "orders" | "products" | "applications";

export function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [productEditor, setProductEditor] = useState<Product | "new" | null>(null);
  const [tab, setTab] = useState<Tab>("orders");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const knownOrderIds = useRef<Set<string>>(new Set());
  const knownApplicationIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const authFailed = useRef(false);

  const redirectToLogin = useCallback(async () => {
    if (authFailed.current) return;
    authFailed.current = true;
    setToken("");
    setLoading(false);
    await getBrowserClient()?.auth.signOut();
    router.replace("/admin?error=unauthorized");
  }, [router]);

  const fetchData = useCallback(async (accessToken: string, quiet = false) => {
    if (!quiet) setLoading(true);
    const isInitialLoad = firstLoad.current;
    const [ordersResponse, productsResponse, applicationsResponse] = await Promise.all([
      fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
      fetch("/api/admin/products", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }),
      fetch("/api/admin/applications", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" })
    ]);

    if (ordersResponse.status === 401 || productsResponse.status === 401 || applicationsResponse.status === 401) {
      await redirectToLogin();
      return;
    }

    if (ordersResponse.ok) {
      const data = await ordersResponse.json();
      const incoming: Order[] = data.orders || [];
      if (!isInitialLoad) {
        const fresh = incoming.filter((order) => !knownOrderIds.current.has(order.id));
        if (fresh.length) {
          setToast(`${fresh.length} nouvelle${fresh.length > 1 ? "s" : ""} commande${fresh.length > 1 ? "s" : ""} reçue${fresh.length > 1 ? "s" : ""}`);
          if (Notification.permission === "granted") {
            new Notification("Khatch & Valley", { body: `${fresh.length} nouvelle commande à traiter.` });
          }
        }
      }
      knownOrderIds.current = new Set(incoming.map((order) => order.id));
      setOrders(incoming);
    }

    if (productsResponse.ok) {
      const data = await productsResponse.json();
      if (data.products?.length) setProducts(data.products);
    }

    if (applicationsResponse.ok) {
      const data = await applicationsResponse.json();
      const incoming: JobApplication[] = data.applications || [];
      if (!isInitialLoad) {
        const fresh = incoming.filter((application) => !knownApplicationIds.current.has(application.id));
        if (fresh.length) setToast(`${fresh.length} nouvelle${fresh.length > 1 ? "s" : ""} candidature${fresh.length > 1 ? "s" : ""}`);
      }
      knownApplicationIds.current = new Set(incoming.map((application) => application.id));
      setApplications(incoming);
    }
    firstLoad.current = false;
    setLoading(false);
  }, [redirectToLogin]);

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

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && session) setToken(session.access_token);
    });
    return () => authListener.subscription.unsubscribe();
  }, [fetchData, router]);

  useEffect(() => {
    if (!token) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchData(token, true);
    };
    const interval = window.setInterval(refreshWhenVisible, 30000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
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
  const newApplications = applications.filter((application) => application.status === "new").length;

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

  function productSaved(product: Product) {
    setProducts((current) => {
      const exists = current.some((item) => item.id === product.id);
      const next = exists ? current.map((item) => item.id === product.id ? product : item) : [...current, product];
      return next.sort((a, b) => a.sort_order - b.sort_order);
    });
    setProductEditor(null);
    setToast("Catalogue mis à jour.");
  }

  async function updateApplication(id: string, updates: { status?: ApplicationStatus; adminNotes?: string | null }) {
    const previous = applications;
    setApplications((current) => current.map((application) => application.id === id ? {
      ...application,
      ...(updates.status ? { status: updates.status } : {}),
      ...(updates.adminNotes !== undefined ? { admin_notes: updates.adminNotes } : {})
    } : application));

    const response = await fetch("/api/admin/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, ...updates })
    });
    if (!response.ok) {
      setApplications(previous);
      setToast("La candidature n’a pas pu être mise à jour.");
    } else setToast("Candidature mise à jour.");
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
          <button className={tab === "applications" ? "active" : ""} onClick={() => setTab("applications")}><BriefcaseBusiness />Candidatures{newApplications > 0 && <b>{newApplications}</b>}</button>
        </nav>
        <div className="admin-sidebar-foot">
          <button onClick={enableNotifications}><Bell />Notifications</button>
          <button onClick={logout}><LogOut />Déconnexion</button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div><p className="section-kicker">Khatch &amp; Valley</p><h1>{tab === "orders" ? "Gestion des commandes" : tab === "products" ? "Gestion du catalogue" : "Gestion des candidatures"}</h1></div>
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
                      <div><span>Date souhaitée</span><strong>{order.desired_delivery_at ? formatDate(order.desired_delivery_at) : "Dès que possible"}</strong></div>
                      <div><span>Paiement prévu</span><strong>{order.payment_method === "cash" ? "Espèces" : "Carte"}</strong></div>
                      <div><span>Note client</span><strong>{order.notes || "Aucune instruction"}</strong></div>
                      <div><span>Facture</span><strong>{order.invoices?.[0]?.invoice_number || "Créée au statut Livrée"}</strong></div>
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
        ) : tab === "products" ? (
          <div className="admin-products">
            <div className="catalog-note catalog-note-actions"><Boxes /><div><strong>Catalogue de la boutique</strong><p>Ajoutez un alcool ou modifiez entièrement une fiche existante.</p></div><button className="button button-dark" type="button" onClick={() => setProductEditor("new")}><Plus size={16} />Ajouter un alcool</button></div>
            <div className="admin-product-grid">
              {products.map((product) => (
                <article className={product.active ? "admin-product" : "admin-product inactive"} key={product.id}>
                  <div className="admin-product-image"><Image src={product.image_path} alt="" fill sizes="50px" /></div>
                  <div className="admin-product-copy"><span>{product.category}</span><h2>{product.name}</h2><p>{product.description}</p></div>
                  <label>Prix ($)<input type="number" min="0" max="100000" value={product.price} onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, price: Number(event.target.value) } : item))} onBlur={(event) => updateProduct(product.id, { price: Number(event.target.value) })} /></label>
                  <div className="admin-product-actions">
                    <button className="edit-product-button" type="button" onClick={() => setProductEditor(product)}><Pencil />Modifier la fiche</button>
                    <button className="availability-toggle" type="button" onClick={() => updateProduct(product.id, { active: !product.active })}>{product.active ? <><ToggleRight />Disponible</> : <><ToggleLeft />Masqué</>}</button>
                  </div>
                </article>
              ))}
            </div>
            {productEditor && <ProductEditor key={productEditor === "new" ? "new" : productEditor.id} product={productEditor === "new" ? null : productEditor} token={token} nextSortOrder={Math.max(0, ...products.map((product) => product.sort_order)) + 1} onClose={() => setProductEditor(null)} onSaved={productSaved} />}
          </div>
        ) : (
          <div className="admin-applications">
            <div className="catalog-note"><BriefcaseBusiness /><div><strong>Recrutement de la maison</strong><p>Classez les candidatures, gardez une note interne et contactez les profils retenus par téléphone.</p></div></div>
            <div className="application-mini-metrics">
              <div><span>Nouvelles</span><strong>{newApplications}</strong></div>
              <div><span>À étudier</span><strong>{applications.filter((application) => application.status === "reviewing").length}</strong></div>
              <div><span>Retenues</span><strong>{applications.filter((application) => application.status === "accepted").length}</strong></div>
            </div>
            <div className="application-list">
              {loading && !applications.length ? <div className="admin-empty">Chargement des candidatures…</div> : applications.length === 0 ? <div className="admin-empty">Aucune candidature reçue pour le moment.</div> : applications.map((application) => (
                <article className="application-card" key={application.id}>
                  <header>
                    <div><span>{APPLICATION_ROLE_LABELS[application.role]}</span><h2>{application.applicant_name}</h2><p>{application.phone} · reçue le {formatDate(application.created_at)}</p></div>
                    <i className={`application-status status-${application.status}`}>{APPLICATION_STATUS_LABELS[application.status]}</i>
                  </header>
                  <div className="application-body">
                    <div><span>Disponibilités</span><p>{application.availability}</p></div>
                    <div><span>Expérience</span><p>{application.experience || "Non renseignée"}</p></div>
                    <div className="application-motivation"><span>Motivation</span><p>{application.motivation}</p></div>
                  </div>
                  <div className="application-actions">
                    <label>État de la candidature<select value={application.status} onChange={(event) => updateApplication(application.id, { status: event.target.value as ApplicationStatus })}>{(Object.entries(APPLICATION_STATUS_LABELS) as [ApplicationStatus, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label>Note interne<textarea rows={3} maxLength={1000} value={application.admin_notes || ""} placeholder="Informations visibles uniquement par l’équipe" onChange={(event) => setApplications((current) => current.map((item) => item.id === application.id ? { ...item, admin_notes: event.target.value } : item))} onBlur={(event) => updateApplication(application.id, { adminNotes: event.target.value || null })} /></label>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
