"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { FALLBACK_PRODUCTS } from "@/lib/catalog";
import type { Product } from "@/lib/types";

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (Array.isArray(data.products) && data.products.length) setProducts(data.products);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
