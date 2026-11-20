# Dawnspire Inc.

Two apps in one repository (addresses are documented in [DOMAINS.md](DOMAINS.md)):

| App | Folder | Will live at | Local |
| --- | --- | --- | --- |
| Public company site | repo root (`src/`, `public/`) | `dawnspire.cc` | http://localhost:5173 |
| Base: member, HR and admin workspace | `base/` (app) + `server/` (API) | `base.dawnspire.cc` | http://localhost:5174 |

## Public site

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

React + TypeScript + Vite, with a right-side navigation rail and a red-orange, white, charcoal and grey identity. The site loads its projects, media, calendar and personnel from what the admin publishes in Base; when Base is unreachable it falls back to the built-in content in `src/content.ts`. Set `VITE_BASE_API` (Base's address) and `VITE_BASE_ORIGIN` when building for dawnspire.cc.

The contact form opens the visitor's email app addressed to `dawnspire.office@gmail.com`, with a copyable fallback. The loading entrance's progress tests: `node --test tests/entrance-progress.test.mjs`.

## Base

```bash
npm install --prefix server
npm install --prefix base
npm run base:setup-admin   # once: creates the single admin account (you type the password)
npm run base:server        # API on http://127.0.0.1:5175
npm run base:dev           # app on http://localhost:5174
npm run base:test          # server tests
```

- **Admin** (one account): edits and publishes the public site's content with a live preview, and creates HR accounts.
- **HR**: creates member accounts, resets passwords, corrects attendance (every change is logged), exports CSV. The inbox exists but is not connected yet.
- **Members**: time in, time out, unavailable, sick and overtime from the Overview; the Time page shows the team's week or month.

Time rules, all in Manila time: regular hours Monday to Friday 8:00–12:00 and 13:00–17:00 (8 hours); timing in before 8:00 counts from 8:00; regular time ends automatically at 17:00; overtime can only start at 17:00 (any time on weekends) and ends at midnight. Unavailable and Sick are whole-day statuses visible to everyone.

Data lives in `server/.local/` (SQLite and uploaded images, git-ignored). For local trials, `npm --prefix server run seed:dev` creates sample accounts and writes their passwords to `server/.local/dev-accounts.txt`. The database layer (Kysely) is written to move to Postgres by swapping the dialect in `server/src/db/index.ts`.

## Assets
See [ASSETS.md](ASSETS.md) for origins and credits. Brand assets live in `public/brand`.
