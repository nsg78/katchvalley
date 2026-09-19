import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TrackOrder } from "@/components/TrackOrder";

export const metadata: Metadata = { title: "Suivre une commande" };

export default function TrackingPage() {
  return (
    <>
      <Header compact />
      <main className="inner-page tracking-page content-width">
        <div className="page-intro centered">
          <p className="section-kicker">Suivi privé</p>
          <h1>Où en est votre commande&nbsp;?</h1>
          <p>Renseignez le numéro de téléphone utilisé lors de la commande.</p>
        </div>
        <TrackOrder />
      </main>
      <Footer />
    </>
  );
}
