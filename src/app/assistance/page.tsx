import type { Metadata } from "next";
import { BellRing, MessageCircle, PackageSearch, Phone } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Assistance" };

const DISCORD_URL = "https://discord.gg/MWBBcSjg3U";

export default function SupportPage() {
  return (
    <>
      <Header compact />
      <main className="inner-page support-page content-width">
        <div className="page-intro centered">
          <p className="section-kicker">Service client</p>
          <h1>Comment pouvons-nous vous aider&nbsp;?</h1>
          <p>Suivi de commande, livraison, facture ou demande particulière : notre équipe reste disponible.</p>
        </div>

        <div className="support-grid">
          <section className="support-contact-card">
            <span className="support-icon"><MessageCircle size={26} /></span>
            <p className="section-kicker">Contact direct</p>
            <h2>Rejoignez le Discord Katch Valley.</h2>
            <p>Pour échanger avec notre équipe ou obtenir de l’aide sur une commande, rejoignez notre espace officiel.</p>
            <a className="button button-dark" href={DISCORD_URL} target="_blank" rel="noreferrer">Rejoindre le Discord <MessageCircle size={17} /></a>
          </section>

          <aside className="support-info-list">
            <div><BellRing /><span><strong>Commande reçue</strong><p>À chaque commande, notre équipe est automatiquement prévenue.</p></span></div>
            <div><Phone /><span><strong>Prise de contact</strong><p>Nous revenons vers vous directement sur le numéro renseigné.</p></span></div>
            <div><PackageSearch /><span><strong>Suivi et facture</strong><p>Retrouvez l’avancement et la facture d’une commande livrée depuis l’espace de suivi.</p><Link href="/suivi">Accéder au suivi →</Link></span></div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
