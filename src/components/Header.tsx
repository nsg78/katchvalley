"use client";

import { Menu, PackageSearch, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/components/CartProvider";
import { cn } from "@/lib/utils";

export function Header({ compact = false }: { compact?: boolean }) {
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className={cn("site-header", compact && "is-compact")}>
        <Link className="brand-lockup" href="/" aria-label="Khatch & Valley — Accueil">
          <Image src="/logo-original.png" alt="" width={45} height={45} priority />
          <span>KHATCH &amp; VALLEY<small>Artisanal brewstillery</small></span>
        </Link>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Navigation principale">
          <Link href="/#cuvees" onClick={() => setMenuOpen(false)}>Nos cuvées</Link>
          <Link href="/suivi" onClick={() => setMenuOpen(false)}>Suivre ma commande</Link>
          <Link className="admin-link" href="/admin" onClick={() => setMenuOpen(false)}>Administration</Link>
        </nav>
        <div className="header-actions">
          <button className="cart-trigger" onClick={() => setOpen(true)} aria-label={`Panier, ${count} article(s)`}>
            <ShoppingBag size={18} /><span>Panier</span>
            {count > 0 && <b>{count}</b>}
          </button>
          <button className="menu-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <div className="mobile-bar">
        <Link href="/suivi"><PackageSearch size={20} /><span>Suivi</span></Link>
        <button onClick={() => setOpen(true)}><ShoppingBag size={20} /><span>Panier</span>{count > 0 && <b>{count}</b>}</button>
      </div>
      <CartDrawer />
    </>
  );
}
