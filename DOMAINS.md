# Domains

Planned addresses for Dawnspire. Nothing is deployed yet; development runs locally from git. Update this file whenever a domain or subdomain is added, moved, or retired.

| Address | Serves | Source | Access | Status |
| --- | --- | --- | --- | --- |
| `dawnspire.cc` | Public company site | repo root (`src/`, `public/`) | Public | Planned |
| `www.dawnspire.cc` | Redirects to `dawnspire.cc` | DNS / host redirect | Public | Planned |
| `base.dawnspire.cc` | Base: member, HR, and admin workspace | `base/` (app) + `server/` (API) | Signed-in accounts only | In development |

## Routing notes

- `dawnspire.cc` is the canonical public address. Its root redirects to the home page (or whatever the public site ships as its entry).
- `base.dawnspire.cc` shows a single sign-in page to anyone not signed in. Nothing else on that host is reachable without a session.
- Base must not be indexed by search engines (`noindex`, plus a disallow-all `robots.txt` on that host).
- Use a wildcard certificate (`*.dawnspire.cc`) so individual subdomain names do not appear in public certificate-transparency logs.

## Local development equivalents

| Production | Local |
| --- | --- |
| `dawnspire.cc` | `http://localhost:5173` |
| `base.dawnspire.cc` | `http://localhost:5174` |
| Base API (same origin as Base in production) | `http://localhost:5175`, proxied by the Base dev server |

## Contact address

Public inquiries go to `dawnspire.office@gmail.com` (to be replaced later). It is set once as `CONTACT_EMAIL` in `src/App.tsx`.
