"use client";

import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, Minus, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { PaymentMethod } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

type Success = { orderNumber: string; total: number };

export function CheckoutForm() {
  const { lines, total, setQuantity, clear } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length) return;
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      customerName: form.get("customerName"),
      phone: form.get("phone"),
      deliveryLocation: form.get("deliveryLocation"),
      notes: form.get("notes"),
      website: form.get("website"),
      paymentMethod,
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity }))
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La commande n’a pas pu être enregistrée.");

      localStorage.setItem("kv_last_phone", String(payload.phone));
      setSuccess({ orderNumber: data.order.order_number, total: data.order.total });
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <section className="success-card">
        <span className="success-icon"><Check size={28} /></span>
        <p className="section-kicker">Commande transmise</p>
        <h2>Merci, la maison s’en occupe.</h2>
        <p className="success-number">N° <strong>{success.orderNumber}</strong></p>
        <p>
          Total à régler à la livraison : <strong>{formatMoney(success.total)}</strong>.<br />
          Conservez votre numéro de téléphone pour suivre l’avancement.
        </p>
        <div className="success-actions">
          <Link className="button button-dark" href="/suivi">Suivre la commande <ArrowRight size={17} /></Link>
          <Link className="button button-light" href="/">Retour à l’accueil</Link>
        </div>
      </section>
    );
  }

  if (!lines.length) {
    return (
      <section className="empty-checkout">
        <h2>Votre sélection est vide.</h2>
        <p>Ajoutez au moins une bouteille avant de poursuivre.</p>
        <Link className="button button-dark" href="/#cuvees"><ArrowLeft size={17} /> Voir les cuvées</Link>
      </section>
    );
  }

  return (
    <form className="checkout-layout" onSubmit={submit}>
      <div className="checkout-form-card">
        <div className="form-section">
          <div className="form-section-title"><span>01</span><div><h2>Vos coordonnées</h2><p>Pour vous identifier et convenir de la livraison.</p></div></div>
          <div className="field-grid">
            <label>Nom ou alias en jeu<input name="customerName" minLength={2} maxLength={80} required placeholder="Vardan Petrosyan" autoComplete="name" /></label>
            <label>Numéro de téléphone<input name="phone" minLength={7} maxLength={24} required placeholder="555-0128" inputMode="tel" autoComplete="tel" /></label>
          </div>
          <label>Point de livraison souhaité<input name="deliveryLocation" maxLength={160} required placeholder="Adresse ou point de rendez-vous en jeu" /></label>
          <label>Instruction particulière <span className="optional">facultatif</span><textarea name="notes" maxLength={500} rows={4} placeholder="Créneau, personne à contacter, discrétion particulière…" /></label>
          <label className="honeypot" aria-hidden="true">Site web<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>

        <div className="form-section">
          <div className="form-section-title"><span>02</span><div><h2>Règlement à la livraison</h2><p>Choisissez le moyen que vous utiliserez en jeu.</p></div></div>
          <div className="payment-options">
            <button type="button" className={paymentMethod === "cash" ? "payment-option selected" : "payment-option"} onClick={() => setPaymentMethod("cash")}>
              <Banknote /><span><strong>Espèces</strong><small>À remettre au livreur</small></span><i>{paymentMethod === "cash" && <Check size={14} />}</i>
            </button>
            <button type="button" className={paymentMethod === "card" ? "payment-option selected" : "payment-option"} onClick={() => setPaymentMethod("card")}>
              <CreditCard /><span><strong>Carte</strong><small>Paiement en jeu à la livraison</small></span><i>{paymentMethod === "card" && <Check size={14} />}</i>
            </button>
          </div>
          <div className="no-charge-note"><ShieldCheck size={18} /><p><strong>Aucune transaction bancaire réelle.</strong> Ce site enregistre uniquement votre préférence de règlement pour la livraison en jeu.</p></div>
        </div>
      </div>

      <aside className="checkout-summary">
        <p className="section-kicker">Récapitulatif</p>
        <h2>Votre commande</h2>
        <div className="summary-lines">
          {lines.map((line) => (
            <div className="summary-line" key={line.product.id}>
              <div><strong>{line.product.name}</strong><span>{formatMoney(line.product.price)} l’unité</span></div>
              <div className="quantity-control small">
                <button type="button" onClick={() => setQuantity(line.product.id, line.quantity - 1)}><Minus size={13} /></button>
                <span>{line.quantity}</span>
                <button type="button" onClick={() => setQuantity(line.product.id, line.quantity + 1)}><Plus size={13} /></button>
              </div>
              <b>{formatMoney(line.product.price * line.quantity)}</b>
            </div>
          ))}
        </div>
        <div className="summary-total"><span>Total à la livraison</span><strong>{formatMoney(total)}</strong></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-dark button-full" type="submit" disabled={loading}>
          {loading ? "Transmission…" : <>Confirmer la commande <ArrowRight size={17} /></>}
        </button>
        <p className="summary-footnote">En confirmant, vous envoyez une demande de commande. L’équipe vous contactera en jeu si nécessaire.</p>
      </aside>
    </form>
  );
}
