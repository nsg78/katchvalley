"use client";

import { ArrowRight, ShoppingBag, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { QuantityInput } from "@/components/QuantityInput";
import { formatMoney } from "@/lib/utils";

export function CartDrawer() {
  const { lines, total, open, setOpen, remove, setQuantity } = useCart();

  return (
    <div className={open ? "cart-layer is-open" : "cart-layer"} aria-hidden={!open}>
      <button className="cart-backdrop" aria-label="Fermer le panier" onClick={() => setOpen(false)} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Votre panier">
        <div className="cart-header">
          <div><p className="section-kicker">Votre sélection</p><h2>Le panier</h2></div>
          <button className="icon-button" onClick={() => setOpen(false)} aria-label="Fermer"><X /></button>
        </div>
        {lines.length === 0 ? (
          <div className="empty-cart">
            <span><ShoppingBag size={28} /></span>
            <h3>Votre panier est vide.</h3>
            <p>Quelques belles bouteilles n’attendent que vous.</p>
            <button className="text-button" onClick={() => setOpen(false)}>Découvrir les cuvées</button>
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {lines.map((line) => (
                <div className="cart-line" key={line.product.id}>
                  <div className="cart-product-image"><Image src={line.product.image_path} alt="" fill sizes="64px" /></div>
                  <div className="cart-line-copy">
                    <span>{line.product.category}</span>
                    <strong>{line.product.name}</strong>
                    <b>{formatMoney(line.product.price * line.quantity)}</b>
                    <QuantityInput
                      quantity={line.quantity}
                      onChange={(quantity) => setQuantity(line.product.id, quantity)}
                      label={`Quantité de ${line.product.name}`}
                    />
                  </div>
                  <button className="remove-line" onClick={() => remove(line.product.id)} aria-label={`Supprimer ${line.product.name}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <div><span>Sous-total</span><strong>{formatMoney(total)}</strong></div>
              <p>Paiement à la livraison en jeu. Aucun débit sur ce site.</p>
              <Link className="button button-dark button-full" href="/commande" onClick={() => setOpen(false)}>
                Continuer la commande <ArrowRight size={17} />
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
