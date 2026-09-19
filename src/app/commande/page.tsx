import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Commander" };

export default function CheckoutPage() {
  return (
    <>
      <Header compact />
      <main className="inner-page content-width">
        <div className="page-intro">
          <p className="section-kicker">Salon de commande</p>
          <h1>Finaliser votre sélection.</h1>
          <p>Aucun débit en ligne. Le règlement s’effectue à la livraison, en jeu.</p>
        </div>
        <CheckoutForm />
      </main>
      <Footer />
    </>
  );
}
