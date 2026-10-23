# Undergrads Q4 Roadmap

Internal roadmap tool for the Undergrads tech team.

The ordered list is the spine. Each card opens into whatever documentation its tier has earned:

| Tier | Document depth |
|---|---|
| Now | Full PRD — tables, pilot, test, acceptance criteria |
| Next | One-pager — what, why, rough size, dependencies |
| Later | A title and a sentence |

Sizing is **effort, not dates**: `xs` ≤8h · `s` ~a week · `m` 2–4 weeks · `l` 1–2 months · `xl` a quarter+ · `unsized`.

`unsized` is a real state. An item nobody understands well enough yet shows as unsized rather than carrying an invented number.

## Stack

- Static HTML/CSS/JS, no build step
- [Supabase](https://supabase.com) — `roadmap` schema in the `undergrads-data-development` project
- Supabase Auth, passwordless magic link, restricted to `@undergrads.com`
- Hosted on GitHub Pages

## Working on it

There is no build. Edit the files and push.

```bash
git clone https://github.com/jackfromundergrads/undergrads-roadmap.git
cd undergrads-roadmap
python3 -m http.server 8000   # then open http://localhost:8000
```

| File | What's in it |
|---|---|
| `index.html` | Page shell |
| `app.css` | Tokens from the Undergrads design system, both themes |
| `app.js` | Auth, board, detail panel, all CRUD |

Adding or editing roadmap items does **not** require a clone. Sign in and edit in the browser.

## Security

The publishable Supabase key in `app.js` is safe to commit — it is designed to be public. Every table has row-level security restricting access to authenticated `@undergrads.com` accounts, so the key alone grants nothing. Roadmap content lives in the database, never in this repo.

## Design

Colors and type come from the Undergrads brand guidelines via the design system. Navy carries structure, gold carries action — one gold element per screen, so the primary action is never ambiguous.
