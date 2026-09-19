import type { Metadata } from "next";
import { BriefcaseBusiness, PackageCheck, Truck } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RecruitmentForm } from "@/components/RecruitmentForm";

export const metadata: Metadata = { title: "Recrutement" };

const roles = [
  { icon: Truck, title: "Livreur", text: "Assurer les tournées, le contact client et la remise des commandes." },
  { icon: PackageCheck, title: "Préparateur de commande", text: "Préparer les cuvées avec rigueur et coordonner les départs en livraison." },
  { icon: BriefcaseBusiness, title: "Chargé d’affaires", text: "Développer les relations professionnelles et les commandes de volume." }
];

export default function RecruitmentPage() {
  return (
    <>
      <Header compact />
      <main className="inner-page recruitment-page content-width">
        <div className="page-intro">
          <p className="section-kicker">Rejoindre la maison</p>
          <h1>Faites grandir Khatch &amp; Valley.</h1>
          <p>La brewstillery recherche des profils fiables, soigneux et à l’aise avec la clientèle de South Los Santos.</p>
        </div>
        <div className="recruitment-layout">
          <aside className="role-list">
            {roles.map(({ icon: Icon, title, text }) => (
              <article className="role-card" key={title}><span><Icon size={20} /></span><div><h2>{title}</h2><p>{text}</p></div></article>
            ))}
          </aside>
          <RecruitmentForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
