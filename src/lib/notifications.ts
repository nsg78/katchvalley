import type { Order } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export async function notifyNewOrder(order: Order) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  const items = order.order_items
    .map((item) => `• ${item.quantity}× ${item.product_name}`)
    .join("\n");

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Khatch & Valley — Commandes",
        embeds: [
          {
            title: `Nouvelle commande ${order.order_number}`,
            description: items,
            color: 12286539,
            fields: [
              { name: "Client", value: order.customer_name, inline: true },
              { name: "Téléphone", value: order.phone, inline: true },
              { name: "Total", value: formatMoney(order.total), inline: true },
              {
                name: "Paiement à la livraison",
                value: order.payment_method === "cash" ? "Espèces" : "Carte",
                inline: true
              },
              { name: "Point de livraison", value: order.delivery_location || "À convenir" }
            ],
            footer: { text: "Commande reçue depuis la boutique" },
            timestamp: order.created_at
          }
        ]
      }),
      signal: AbortSignal.timeout(4500)
    });
  } catch (error) {
    console.error("Notification Discord non envoyée", error);
  }
}
