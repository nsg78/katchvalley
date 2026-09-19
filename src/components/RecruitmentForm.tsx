"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { APPLICATION_ROLE_LABELS, type ApplicationRole } from "@/lib/types";

export function RecruitmentForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      applicantName: data.get("applicantName"),
      phone: data.get("phone"),
      role: data.get("role"),
      availability: data.get("availability"),
      experience: data.get("experience"),
      motivation: data.get("motivation"),
      website: data.get("website")
    };

    try {
      const response = await fetch("/api/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "La candidature n’a pas pu être transmise.");
      form.reset();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="application-success">
        <CheckCircle2 size={35} />
        <p className="section-kicker">Candidature reçue</p>
        <h2>Merci pour votre intérêt.</h2>
        <p>L’équipe étudiera votre profil et vous contactera par téléphone si elle souhaite poursuivre.</p>
        <button className="text-button" type="button" onClick={() => setSent(false)}>Envoyer une autre candidature</button>
      </div>
    );
  }

  return (
    <form className="recruitment-form" onSubmit={submit}>
      <div className="form-section-title"><span>01</span><div><h2>Votre candidature</h2><p>Quelques informations suffisent pour faire connaissance.</p></div></div>
      <div className="field-grid">
        <label>Prénom Nom ou raison sociale<input name="applicantName" minLength={2} maxLength={80} required placeholder="Prénom Nom ou raison sociale" autoComplete="name" /></label>
        <label>Numéro de téléphone<input name="phone" minLength={4} maxLength={20} required placeholder="Ex. 4728" inputMode="tel" autoComplete="tel" /></label>
      </div>
      <label>Poste recherché
        <select name="role" defaultValue="delivery_driver" required>
          {(Object.entries(APPLICATION_ROLE_LABELS) as [ApplicationRole, string][]).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label>Disponibilités<input name="availability" minLength={2} maxLength={200} required placeholder="Jours, horaires ou fréquence de présence" /></label>
      <label>Expérience <span className="optional">facultatif</span><textarea name="experience" maxLength={800} rows={4} placeholder="Expériences utiles, permis, réseau commercial…" /></label>
      <label>Motivation<textarea name="motivation" minLength={20} maxLength={1500} rows={6} required placeholder="Pourquoi souhaitez-vous rejoindre Khatch & Valley ?" /></label>
      <label className="honeypot" aria-hidden="true">Site web<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-dark" type="submit" disabled={loading}>{loading ? "Transmission…" : <>Envoyer ma candidature <ArrowRight size={17} /></>}</button>
    </form>
  );
}
