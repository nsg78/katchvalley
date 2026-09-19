"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";

export function AdminLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = getBrowserClient();

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/admin/dashboard");
    });
  }, [router, supabase]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);

    if (!supabase) {
      setError("Supabase n’est pas encore configuré sur ce déploiement.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password"))
    });

    if (signInError) {
      setError("Identifiants incorrects ou accès non autorisé.");
      setLoading(false);
      return;
    }

    router.replace("/admin/dashboard");
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-brand">
        <Link className="brand-lockup light" href="/">
          <Image src="/logo-original.png" alt="" width={45} height={45} priority />
          <span>KHATCH &amp; VALLEY<small>Artisanal brewstillery</small></span>
        </Link>
        <div>
          <p className="section-kicker">Accès réservé</p>
          <h1>Le comptoir<br />de la maison.</h1>
          <p>Gérez les commandes, la préparation, la livraison et le catalogue depuis un seul espace.</p>
        </div>
        <small>EL RANCHO BLVD · SOUTH LOS SANTOS</small>
      </section>
      <section className="admin-login-panel">
        <form onSubmit={login}>
          <span className="login-icon"><LockKeyhole size={22} /></span>
          <p className="section-kicker">Administration</p>
          <h2>Heureux de vous revoir.</h2>
          <p className="login-lead">Connectez-vous avec le compte équipe créé dans Supabase.</p>
          <label>Adresse e-mail<input name="email" type="email" autoComplete="email" required placeholder="equipe@khatchvalley.com" /></label>
          <label>Mot de passe<input name="password" type="password" autoComplete="current-password" minLength={8} required placeholder="••••••••••••" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-dark button-full" disabled={loading}>
            {loading ? "Connexion…" : <>Ouvrir le tableau de bord <ArrowRight size={17} /></>}
          </button>
          <Link className="back-store" href="/">← Retour à la boutique</Link>
        </form>
      </section>
    </main>
  );
}
