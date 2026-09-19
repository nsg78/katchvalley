import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner content-width">
        <div>
          <strong>Khatch &amp; Valley</strong>
          <p>Distillé et embouteillé à South Los Santos.</p>
        </div>
        <div className="footer-links">
          <Link href="/#cuvees">Les cuvées</Link>
          <Link href="/suivi">Suivi de commande</Link>
          <Link href="/admin">Espace équipe</Link>
        </div>
        <small>EL RANCHO BLVD · SOUTH LOS SANTOS</small>
      </div>
    </footer>
  );
}
