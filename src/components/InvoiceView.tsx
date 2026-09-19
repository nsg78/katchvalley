"use client";

import { FileText, Printer, X } from "lucide-react";
import type { Invoice, Order } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

export function InvoiceView({
  invoice,
  order,
  onClose
}: {
  invoice: Invoice;
  order: Order;
  onClose: () => void;
}) {
  return (
    <div className="invoice-layer" role="dialog" aria-modal="true" aria-label={`Facture ${invoice.invoice_number}`}>
      <button className="invoice-backdrop" type="button" onClick={onClose} aria-label="Fermer la facture" />
      <section className="invoice-sheet">
        <div className="invoice-toolbar">
          <button type="button" onClick={() => window.print()}><Printer size={16} /> Imprimer / PDF</button>
          <button className="invoice-close" type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="invoice-paper">
          <header className="invoice-head">
            <div className="invoice-brand">
              <span><FileText size={20} /></span>
              <div><strong>Khatch &amp; Valley</strong><small>Artisanal Brewstillery</small></div>
            </div>
            <div className="invoice-title"><p>Facture</p><strong>{invoice.invoice_number}</strong></div>
          </header>

          <p className="invoice-rp-notice">DOCUMENT ROLEPLAY · SANS VALEUR FISCALE RÉELLE</p>

          <div className="invoice-parties">
            <div>
              <span>Émetteur</span>
              <strong>Khatch &amp; Valley Brewstillery</strong>
              <p>El Rancho Blvd<br />South Los Santos</p>
            </div>
            <div>
              <span>Facturé à</span>
              <strong>{invoice.customer_name}</strong>
              <p>Tél. {invoice.customer_phone}<br />Livraison : {invoice.delivery_location}</p>
            </div>
          </div>

          <div className="invoice-meta">
            <div><span>Date d’émission</span><strong>{formatDate(invoice.issued_at)}</strong></div>
            <div><span>Commande</span><strong>{order.order_number}</strong></div>
            <div><span>Règlement en jeu</span><strong>{invoice.payment_method === "cash" ? "Espèces" : "Carte"}</strong></div>
          </div>

          <div className="invoice-table-wrap">
            <table className="invoice-table">
              <thead><tr><th>Désignation</th><th>Qté</th><th>Prix unit.</th><th>Montant</th></tr></thead>
              <tbody>
                {order.order_items.map((item) => (
                  <tr key={item.id || `${item.product_name}-${item.quantity}`}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.unit_price)}</td>
                    <td>{formatMoney(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invoice-total">
            <div><span>Statut du règlement</span><strong>{order.payment_status === "paid" ? "Réglé à la livraison" : "À confirmer par l’équipe"}</strong></div>
            <div><span>Total</span><strong>{formatMoney(invoice.total)}</strong></div>
          </div>

          <footer className="invoice-foot">
            Facture générée automatiquement lorsque la commande est marquée comme livrée.
          </footer>
        </div>
      </section>
    </div>
  );
}
