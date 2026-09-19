"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MAX_QUANTITY = 999;

export function QuantityInput({
  quantity,
  onChange,
  compact = false,
  label = "Quantité"
}: {
  quantity: number;
  onChange: (quantity: number) => void;
  compact?: boolean;
  label?: string;
}) {
  const [draft, setDraft] = useState(String(quantity));
  const [editing, setEditing] = useState(false);

  function change(next: number) {
    setDraft(String(next));
    setEditing(false);
    onChange(next);
  }

  function commit(value = draft) {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) ? Math.min(MAX_QUANTITY, Math.max(1, parsed)) : 1;
    setDraft(String(next));
    setEditing(false);
    onChange(next);
  }

  return (
    <div className={cn("quantity-control", compact && "small")}>
      <button type="button" onClick={() => change(Math.max(1, quantity - 1))} aria-label="Retirer une unité">
        <Minus size={compact ? 13 : 14} />
      </button>
      <input
        aria-label={label}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QUANTITY}
        value={editing ? draft : String(quantity)}
        onFocus={() => {
          setDraft(String(quantity));
          setEditing(true);
        }}
        onChange={(event) => {
          const value = event.target.value.replace(/\D/g, "").slice(0, 3);
          setDraft(value);
          setEditing(true);
          if (value) onChange(Math.min(MAX_QUANTITY, Math.max(1, Number(value))));
        }}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <button type="button" onClick={() => change(Math.min(MAX_QUANTITY, quantity + 1))} aria-label="Ajouter une unité">
        <Plus size={compact ? 13 : 14} />
      </button>
    </div>
  );
}
