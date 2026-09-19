import { ArrowRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProductGrid } from "@/components/ProductGrid";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="hero-shell">
          <div className="hero-copy reveal">
            <p className="eyebrow"><span /> Distillerie artisanale</p>
            <h1>Khatch &amp; <em>Valley.</em></h1>
            <p className="hero-lead">
              Une adresse dédiée à l’art de la distillation, alliant traditions arméniennes et
              savoir-faire d’exception au cœur de South Los Santos.
            </p>
            <div className="hero-meta">
              <span>El Rancho Blvd</span><i />
              <span>South Los Santos</span><i />
              <span>Vente en ligne exclusive</span>
            </div>
            <a className="button button-dark hero-cta" href="#cuvees">
              Découvrir nos cuvées <ArrowRight size={17} />
            </a>
          </div>
          <div className="hero-mark reveal reveal-delay" aria-hidden="true">
            <Image src="/logo-original.png" alt="Logo Khatch & Valley" width={300} height={218} priority />
            <div className="seal-ring"><span>Distillé à South Los Santos</span></div>
          </div>
        </section>

        <section className="intro-section content-width">
          <div>
            <p className="section-kicker">La maison</p>
            <h2>Une vision pure<br />de la distillation.</h2>
          </div>
          <div className="intro-copy">
            <p>
              Khatch &amp; Valley propose aux amateurs de spiritueux fins des productions
              authentiques, façonnées avec rigueur et des ingrédients de premier choix.
            </p>
            <p>
              Bières, whiskies, vodkas, gins botaniques, rhums, tequilas, brandies et liqueurs
              sont élaborés pour offrir une expérience unique. Nos chais sont fermés à la
              clientèle physique : toute commande passe par notre canal sécurisé.
            </p>
          </div>
        </section>

        <section id="cuvees" className="catalog-section content-width">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Le catalogue</p>
              <h2>Nos cuvées &amp; spiritueux</h2>
            </div>
            <p className="category-line">Lager · Whisky · Vodka · Gin · Rhum · Tequila · Brandy · Liqueur</p>
          </div>
          <ProductGrid />
        </section>

        <section className="order-cta content-width">
          <div className="order-cta-copy">
            <p className="section-kicker">Canal privé</p>
            <h2>Votre commande, préparée avec soin.</h2>
            <p>
              Sélectionnez vos bouteilles, choisissez votre mode de règlement et payez seulement
              à la livraison en jeu.
            </p>
          </div>
          <Link className="button button-dark" href="/commande">
            Accéder à la commande <ArrowRight size={17} />
          </Link>
        </section>

        <section className="values-strip content-width" aria-label="Nos engagements">
          <div><Sparkles size={18} /><span>Cuvées artisanales</span></div>
          <div><ShieldCheck size={18} /><span>Commande confidentielle</span></div>
          <div><MapPin size={18} /><span>Livraison à South LS</span></div>
        </section>

        <section className="signature-panel content-width">
          <p className="section-kicker">Khatch &amp; Valley · South Los Santos</p>
          <h2>Une bouteille, un terroir, une signature.</h2>
          <p>Retrouvez nos créations exclusives et suivez votre commande depuis votre téléphone.</p>
          <div className="pill-row">
            <span>El Rancho Blvd</span><span>South Los Santos</span><span>Sur commande</span>
          </div>
          <small>Sous la direction de <strong>Monsieur Khatchadourian</strong></small>
        </section>
      </main>
      <Footer />
    </>
  );
}
