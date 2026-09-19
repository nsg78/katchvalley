# Khatch & Valley Brewstillery

Boutique RP complète pour Vercel + Supabase, inspirée de la direction artistique fournie : ivoire, noir, cuivre et mise en page éditoriale.

## Fonctionnalités

- Catalogue responsive avec les 8 cuvées de la maquette
- Panier persistant, quantités et total recalculé côté serveur
- Commande sans paiement réel : préférence espèces ou carte, règlement à la livraison en jeu
- Suivi des commandes par numéro de téléphone
- Tableau de bord sécurisé : commandes, statuts, règlement et catalogue
- Notification Discord facultative à chaque nouvelle commande
- Alerte navigateur dans le panel admin et actualisation automatique toutes les 15 secondes
- Affichage optimisé pour PC, mobile classique et petit WebView de téléphone FiveM
- Row Level Security Supabase, clé `service_role` utilisée uniquement côté serveur

## 1. Créer le projet Supabase

1. Créer un nouveau projet sur Supabase.
2. Ouvrir **SQL Editor**.
3. Copier tout le fichier [`supabase/schema.sql`](supabase/schema.sql), puis l’exécuter.
4. Ouvrir **Authentication > Users > Add user** et créer le compte de l’administrateur.
5. Copier l’UUID du compte.
6. Exécuter dans SQL Editor :

```sql
insert into public.admin_profiles (user_id, display_name)
values ('UUID_DU_COMPTE_AUTH', 'Khatchadourian');
```

Le catalogue est automatiquement créé par le script SQL. Les prix peuvent ensuite être modifiés depuis `/admin/dashboard`.

## 2. Configurer les variables

Copier `.env.example` vers `.env.local`, puis renseigner :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DISCORD_WEBHOOK_URL=
```

La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être préfixée par `NEXT_PUBLIC_` ni copiée dans du code client.

## 3. Lancer en local

```bash
npm install
npm run dev
```

- Boutique : `http://localhost:3000`
- Suivi : `http://localhost:3000/suivi`
- Administration : `http://localhost:3000/admin`

Sans variables Supabase, la boutique reste prévisualisable avec le catalogue local, mais la prise de commande et le panel admin sont volontairement désactivés.

## 4. Déployer sur Vercel

1. Envoyer ce dossier dans un dépôt GitHub.
2. Importer le dépôt dans Vercel.
3. Ajouter les mêmes variables dans **Project settings > Environment Variables**.
4. Remplacer `NEXT_PUBLIC_SITE_URL` par l’URL Vercel finale.
5. Déployer.

## Notification Discord

Dans Discord : **Paramètres du salon > Intégrations > Webhooks > Nouveau webhook**. Copier son URL dans `DISCORD_WEBHOOK_URL` sur Vercel. Chaque commande déclenchera un message comprenant le client, le téléphone, le contenu, le total, le mode de règlement et le point de livraison.

Le webhook reste côté serveur et n’est jamais envoyé au navigateur.

## Cycle d’une commande

`Reçue` → `En préparation` → `Prête` → `En livraison` → `Livrée`

L’administrateur peut aussi passer une commande à `Annulée` et marquer séparément le règlement comme `Payé`.

## Personnalisation rapide

- Textes et produits par défaut : `src/lib/catalog.ts`
- Prix réellement utilisés : table Supabase `products`
- Palette et mise en page : `src/app/globals.css`
- Logo vectoriel : `public/brand-mark.svg`
- Message Discord : `src/lib/notifications.ts`

Les prix affichés au premier chargement proviennent du catalogue local, puis sont remplacés par ceux de Supabase. Lors de la validation, le serveur ignore toujours les prix du navigateur et calcule le montant depuis la base.
