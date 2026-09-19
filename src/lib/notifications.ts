import { APPLICATION_ROLE_LABELS, type JobApplication, type Order } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

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
              { name: "Point de livraison", value: order.delivery_location || "À convenir" },
              ...(order.desired_delivery_at
                ? [{ name: "Date souhaitée", value: formatDate(order.desired_delivery_at) }]
                : [])
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

export async function notifyNewApplication(application: JobApplication) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Khatch & Valley — Recrutement",
        embeds: [
          {
            title: `Nouvelle candidature — ${APPLICATION_ROLE_LABELS[application.role]}`,
            description: application.motivation.slice(0, 2000),
            color: 7115362,
            fields: [
              { name: "Candidat", value: application.applicant_name, inline: true },
              { name: "Téléphone", value: application.phone, inline: true },
              { name: "Disponibilités", value: application.availability },
              { name: "Expérience", value: application.experience || "Non renseignée" }
            ],
            footer: { text: "Candidature reçue depuis le site" },
            timestamp: application.created_at
          }
        ]
      }),
      signal: AbortSignal.timeout(4500)
    });
  } catch (error) {
    console.error("Notification de candidature non envoyée", error);
  }
}
