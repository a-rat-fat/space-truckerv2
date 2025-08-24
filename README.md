# 🚛🚀 Space Truckers v3 — Skins + Quêtes + Carte + FR/EN + Postgres

**Nouveautés v3**
- 🎨 Skins/illustrations de vaisseaux (SVG) + sélection de skin
- 🧭 Mini carte stellaire (SVG) avec itinéraires actifs
- 🎯 Petites quêtes quotidiennes (bonus crédits/réputation)
- 🇫🇷/🇬🇧 Bascule FR/EN (i18n côté front)
- 🗄️ Base **Postgres** via `DATABASE_URL` (Railway plugin), avec fallback **SQLite** si absent
- ✅ Dockerfile compatible Railway (pas de `VOLUME`)

## Lancer en local (OrbStack / Docker)
```bash
unzip space-truckers-v3.zip
cd space-truckers-v3

docker build -t space-truckers-v3 .

# SQLite local (crée un dossier data si tu veux)
mkdir -p data
# Fallback SQLite: aucun env à fournir
docker run -p 8080:8080 --env PORT=8080 -v $(pwd)/data:/data space-truckers-v3
# → http://localhost:8080

# OU Postgres local : fournir DATABASE_URL (ex: postgres://user:pass@host:5432/db)
docker run -p 8080:8080 --env PORT=8080 --env DATABASE_URL="postgresql+psycopg2://user:pass@host:5432/db" space-truckers-v3
```
## Déploiement Railway
1) Crée un service à partir de ce repo/dossier.  
2) Ajoute le plugin **PostgreSQL** → Railway fournit `DATABASE_URL`.  
3) Déploie (Dockerfile déjà prêt).  
4) Optionnel: pour SQLite fallback (non recommandé en prod), ne fournis pas `DATABASE_URL`.

## API
- `POST /api/score` `{ name, profit }`
- `GET /api/leaderboard`
- `POST /api/save` `{ slot, state }` (3 slots)
- `GET /api/save?slot=1`
