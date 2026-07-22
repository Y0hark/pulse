# Déploiement continu — ce que tu dois faire une fois

Le code est prêt (Dockerfile, migrations auto, CORS, cookies cross-site, CI). Il reste à créer
les comptes/connexions ci-dessous — ce sont des actions ponctuelles, ensuite chaque `git push`
sur `main` redéploie tout seul.

Stack : **Cloudflare Pages** (front) · **Render** (API, via Docker) · **Neon** (Postgres) ·
**cron-job.org** (freeze hebdo) · **Resend** (emails magic-link) · **GitHub Actions** (tests).

---

## 1. Neon — base Postgres

1. Créer un compte sur neon.tech (gratuit), un nouveau projet `pulse`.
2. Copier la connection string, et **ajouter `?sslmode=require`** à la fin si elle n'y est pas déjà.
   → c'est la valeur de `DATABASE_URL`.
3. Rien d'autre : les migrations (`db/migrations/*.up.sql`) s'appliquent automatiquement à
   chaque déploiement (voir `docker-entrypoint.sh`, via `golang-migrate`).

## 2. Render — API backend

1. Créer un compte sur render.com, connecter ton compte GitHub, autoriser l'accès au repo `pulse`.
2. "New +" → "Blueprint" → sélectionner le repo. Render détecte `render.yaml` à la racine et
   propose de créer le service `pulse-api` (Docker, plan free, health check `/healthz`).
3. Renseigner les variables d'environnement marquées `sync: false` dans `render.yaml` :
   - `DATABASE_URL` : la connection string Neon de l'étape 1.
   - `APP_BASE_URL` : l'URL publique que Render attribue à ce service (visible après la
     première création, ex. `https://pulse-api.onrender.com`) — à remettre à jour une fois connue.
   - `CORS_ORIGIN` : l'URL Cloudflare Pages de l'étape 3 (ex. `https://pulse.pages.dev`).
   - `RESEND_API_KEY`, `MAIL_FROM` : étape 5.
   - `INTERNAL_TASK_SECRET` : une chaîne aléatoire longue (ex. générée avec
     `openssl rand -hex 32`) — à réutiliser telle quelle à l'étape 4.
   - `ALLOWED_DOMAINS` (optionnel) : ex. `tnpconsultants.com` pour restreindre qui peut se connecter.
4. `autoDeploy: true` est déjà activé dans `render.yaml` : chaque push sur `main` redéploie l'API.

⚠️ Le plan free de Render met le service en veille après ~15 min sans requête. L'étape 4
(cron-job.org) sert aussi de filet pour réveiller le service et ne pas rater un freeze.

## 3. Cloudflare Pages — frontend

1. dash.cloudflare.com → Workers & Pages → "Create" → "Pages" → connecter le repo GitHub.
2. Build settings :
   - Root directory : `frontend`
   - Build command : `npm run build`
   - Output directory : `dist`
3. Variable d'environnement de build : `VITE_API_BASE_URL` = l'URL Render de l'étape 2
   (ex. `https://pulse-api.onrender.com`).
4. Déployer. Chaque push sur `main` redéclenche un build automatique.
   (`frontend/public/_redirects` gère déjà le fallback SPA pour Vue Router.)

## 4. cron-job.org — freeze hebdomadaire

1. Créer un compte gratuit sur cron-job.org.
2. Nouveau cron job :
   - URL : `https://<ton-url-render>/internal/tasks/freeze`
   - Méthode : `POST`
   - Header custom : `x-internal-secret: <la même valeur que INTERNAL_TASK_SECRET>`
   - Fréquence : toutes les 5–10 minutes (l'endpoint est idempotent — pas de risque à
     l'appeler souvent ; ça sert aussi à garder Render éveillé).

## 5. Resend — envoi des magic links

1. Créer un compte sur resend.com (gratuit, 100 emails/jour / 3000/mois).
2. Ajouter et vérifier ton domaine d'envoi (DNS : SPF/DKIM fournis par Resend), ou utiliser
   leur domaine de test le temps de valider le flux.
3. Créer une API key → `RESEND_API_KEY` sur Render.
4. `MAIL_FROM` sur Render, ex. `Pulse <pulse@tnpconsultants.com>` (doit correspondre au domaine vérifié).
5. Tant que `RESEND_API_KEY` n'est pas configuré, l'app retombe automatiquement sur
   `ConsoleMailer` (le lien est loggé au lieu d'être envoyé — pratique pour tester avant
   d'activer Resend).

## 6. GitHub Actions (déjà en place, rien à faire)

`.github/workflows/ci.yml` fait tourner les tests + typecheck (back et front) sur chaque push
et pull request vers `main`. Ça ne bloque pas le déploiement Render/Cloudflare par défaut (ils
déploient dès que le code arrive sur `main`, indépendamment du résultat des Actions).

Si tu veux que rien ne parte en prod tant que les tests ne sont pas verts : Settings → Branches
→ Branch protection rule sur `main` → cocher "Require status checks to pass" et sélectionner
les jobs `backend` / `frontend`. Ça empêche de merger une PR rouge, donc `main` reste toujours vert.

---

## Récapitulatif des secrets à renseigner

| Variable | Où | Valeur |
|---|---|---|
| `DATABASE_URL` | Render | connection string Neon (`?sslmode=require`) |
| `APP_BASE_URL` | Render | URL publique du service Render lui-même |
| `CORS_ORIGIN` | Render | URL Cloudflare Pages |
| `RESEND_API_KEY` | Render | clé API Resend |
| `MAIL_FROM` | Render | adresse d'envoi, domaine vérifié Resend |
| `INTERNAL_TASK_SECRET` | Render + cron-job.org | chaîne aléatoire, identique des deux côtés |
| `ALLOWED_DOMAINS` | Render | optionnel, domaines email autorisés |
| `VITE_API_BASE_URL` | Cloudflare Pages | URL publique du service Render |
