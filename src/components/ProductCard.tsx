"use client";

import { Check, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function addProduct() {
    if (product.stock_count === 0) return;
    add(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="product-card" style={{ "--card-index": index } as React.CSSProperties}>
      <div className="product-topline">
        <span>{product.category} · {String(index + 1).padStart(2, "0")}</span>
        <span className="price-pill">{formatMoney(product.price)}</span>
      </div>
      <div className="product-image">
        <Image
          src={product.image_path}
          alt={product.name}
          fill
          sizes="(max-width: 590px) 70vw, (max-width: 820px) 40vw, 320px"
        />
      </div>
      <div className="product-copy">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-details">
          {product.volume_ml && <span>{product.volume_ml} ml</span>}
          {product.alcohol_pct && <span>{product.alcohol_pct}% vol.</span>}
        </div>
      </div>
      <button className={added ? "add-button is-added" : "add-button"} onClick={addProduct} disabled={product.stock_count === 0}>
        {product.stock_count === 0 ? "Indisponible" : added ? <><Check size={15} /> Ajouté</> : <><Plus size={15} /> Ajouter au panier</>}
      </button>
    </article>
  );
}
