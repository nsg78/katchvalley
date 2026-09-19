"use client";

import { Save, Upload, Wine, X } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";

const TONES = [
  ["amber", "Ambré"], ["oak", "Chêne"], ["clear", "Transparent"], ["mist", "Brume"],
  ["rum", "Rhum"], ["silver", "Argent"], ["brandy", "Brandy"], ["apricot", "Abricot"]
] as const;

export function ProductEditor({
  product,
  token,
  nextSortOrder,
  onClose,
  onSaved
}: {
  product: Product | null;
  token: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(product?.image_path || "/brand-mark.svg");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      let imagePath = String(data.get("imagePath") || "/brand-mark.svg");
      const image = data.get("image");
      if (image instanceof File && image.size > 0) {
        const imageForm = new FormData();
        imageForm.append("image", image);
        const uploadResponse = await fetch("/api/admin/products/image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: imageForm
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || "Envoi de l’image impossible.");
        imagePath = uploadResult.imagePath;
      }

      const numberOrNull = (name: string) => {
        const value = String(data.get(name) || "").trim();
        return value ? Number(value) : null;
      };
      const payload = {
        ...(product ? { id: product.id } : {}),
        name: String(data.get("name")),
        category: String(data.get("category")),
        description: String(data.get("description")),
        image_path: imagePath,
        price: Number(data.get("price")),
        volume_ml: numberOrNull("volume_ml"),
        alcohol_pct: numberOrNull("alcohol_pct"),
        stock_count: numberOrNull("stock_count"),
        visual_tone: String(data.get("visual_tone")),
        bottle_style: String(data.get("bottle_style")),
        sort_order: Number(data.get("sort_order")),
        active: data.get("active") === "on"
      };

      const response = await fetch("/api/admin/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Enregistrement impossible.");
      onSaved(result.product as Product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="product-editor-layer" role="dialog" aria-modal="true" aria-label={product ? `Modifier ${product.name}` : "Ajouter un alcool"}>
      <button className="product-editor-backdrop" type="button" onClick={onClose} aria-label="Fermer" />
      <form className="product-editor" onSubmit={submit}>
        <header>
          <div><p className="section-kicker">Catalogue</p><h2>{product ? "Modifier l’alcool" : "Ajouter un alcool"}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>

        <div className="product-editor-scroll">
          <div className="product-editor-image">
            <div className="product-image-preview" style={{ backgroundImage: `url("${preview.replace(/"/g, "%22")}")` }}><Wine size={24} /></div>
            <label className="image-upload"><Upload size={16} /><span><strong>Choisir une image</strong><small>PNG, JPG ou WebP · 5 Mo maximum</small></span><input name="image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }} /></label>
            <input name="imagePath" type="hidden" value={product?.image_path || "/brand-mark.svg"} readOnly />
          </div>

          <div className="field-grid">
            <label>Nom du produit<input name="name" defaultValue={product?.name || ""} minLength={2} maxLength={100} required placeholder="Ex. Valley Cognac" /></label>
            <label>Catégorie<input name="category" defaultValue={product?.category || "Spiritueux"} minLength={2} maxLength={60} required placeholder="Whisky, bière, liqueur…" /></label>
          </div>
          <label>Description<textarea name="description" defaultValue={product?.description || ""} minLength={5} maxLength={500} rows={4} required placeholder="Présentation courte affichée dans la boutique" /></label>
          <div className="product-numbers-grid">
            <label>Prix ($)<input name="price" type="number" min={0} max={100000} defaultValue={product?.price ?? 0} required /></label>
            <label>Volume (ml)<input name="volume_ml" type="number" min={1} max={10000} defaultValue={product?.volume_ml ?? 700} /></label>
            <label>Alcool (% vol.)<input name="alcohol_pct" type="number" min={0} max={100} step="0.1" defaultValue={product?.alcohol_pct ?? 40} /></label>
            <label>Stock <span className="optional">vide = illimité</span><input name="stock_count" type="number" min={0} max={100000} defaultValue={product?.stock_count ?? ""} /></label>
          </div>
          <div className="field-grid">
            <label>Teinte visuelle<select name="visual_tone" defaultValue={product?.visual_tone || "amber"}>{TONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Forme de bouteille<select name="bottle_style" defaultValue={product?.bottle_style || "round"}><option value="round">Ronde</option><option value="square">Carrée</option><option value="beer">Bière</option></select></label>
          </div>
          <div className="product-editor-last-row">
            <label>Ordre d’affichage<input name="sort_order" type="number" min={0} max={10000} defaultValue={product?.sort_order ?? nextSortOrder} required /></label>
            <label className="product-active-check"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} /><span><strong>Visible dans la boutique</strong><small>Décochez pour préparer le produit sans le publier.</small></span></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <footer>
          <button className="button button-light" type="button" onClick={onClose}>Annuler</button>
          <button className="button button-dark" type="submit" disabled={loading}><Save size={16} />{loading ? "Enregistrement…" : product ? "Enregistrer les modifications" : "Ajouter au catalogue"}</button>
        </footer>
      </form>
    </div>
  );
}
