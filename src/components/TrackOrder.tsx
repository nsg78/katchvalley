"use client";

import { PackageSearch, Phone, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_STEPS, type Order } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function TrackOrder() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPhone(localStorage.getItem("kv_last_phone") || "");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Recherche impossible.");
      setOrders(data.orders);
      localStorage.setItem("kv_last_phone", phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tracking-shell">
      <form className="tracking-search" onSubmit={search}>
        <Phone size={20} />
        <input value={phone} onChange={(event) => setPhone(event.target.value)} minLength={7} maxLength={24} inputMode="tel" placeholder="Votre numéro de téléphone" aria-label="Numéro de téléphone" required />
        <button className="button button-dark" disabled={loading}>{loading ? "Recherche…" : "Rechercher"}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}

      {orders?.length === 0 && (
        <div className="no-orders"><PackageSearch size={30} /><h2>Aucune commande trouvée.</h2><p>Vérifiez que le numéro est identique à celui saisi lors de la commande.</p></div>
      )}

      {orders && orders.length > 0 && (
        <div className="tracked-orders">
          <div className="tracked-heading"><p>{orders.length} commande{orders.length > 1 ? "s" : ""} trouvée{orders.length > 1 ? "s" : ""}</p><button className="text-button" onClick={() => search()} disabled={loading}><RefreshCw size={14} /> Actualiser</button></div>
          {orders.map((order) => {
            const currentIndex = STATUS_STEPS.indexOf(order.status);
            return (
              <article className="tracked-order" key={order.id}>
                <div className="tracked-order-head">
                  <div><span>Commande</span><h2>{order.order_number}</h2><p>Passée le {formatDate(order.created_at)}</p></div>
                  <StatusBadge status={order.status} />
                </div>
                {order.status !== "cancelled" ? (
                  <div className="status-timeline">
                    {STATUS_STEPS.map((status, index) => (
                      <div className={index <= currentIndex ? "timeline-step complete" : "timeline-step"} key={status}>
                        <i>{index < currentIndex ? "✓" : index + 1}</i><span>{status === "out_for_delivery" ? "Livraison" : status === "received" ? "Reçue" : status === "preparing" ? "Préparation" : status === "ready" ? "Prête" : "Livrée"}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="cancelled-note">Cette commande a été annulée. Contactez l’équipe pour plus d’informations.</p>}
                <div className="tracked-details">
                  <div><span>Contenu</span>{order.order_items.map((item) => <p key={`${order.id}-${item.product_name}`}>{item.quantity}× {item.product_name}</p>)}</div>
                  <div><span>Livraison</span><p>{order.delivery_location}</p></div>
                  <div><span>Règlement</span><p>{order.payment_method === "cash" ? "Espèces" : "Carte"} · {order.payment_status === "paid" ? "Payé" : "À la livraison"}</p></div>
                  <div className="tracked-total"><span>Total</span><strong>{formatMoney(order.total)}</strong></div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
