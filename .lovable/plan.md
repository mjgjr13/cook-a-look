## Unused image cleanup

Scanned every image in `src/assets/` and `public/images/` against `src/`, `public/`, and `index.html`. The following files have **zero references** anywhere in the codebase and are safe to delete:

| File | Size |
|---|---|
| `src/assets/advisor-1.jpg` | 32 KB |
| `src/assets/advisor-2.jpg` | 50 KB |
| `src/assets/advisor-3.jpg` | 55 KB |
| `src/assets/advisor-4.jpg` | 44 KB |
| `src/assets/lookbook-street-1.jpg` | 95 KB |
| `public/images/og-preview.svg` | 1.5 KB |

**Total removed:** ~278 KB across 6 files.

### Kept (in use)
- All `cook-a-look-favicon*` + `cook-a-look-logo.svg` — referenced by `index.html` / `site.webmanifest`
- `hero-fashion.jpg`, `og-preview.png` — referenced by hero/OG meta
- `inspiration-1..4.jpg`, `lookbook-business/casual/evening-1/2.jpg`, `lookbook-street-2.jpg` — referenced in components

### Steps
1. `rm` the 6 files above.
2. No code edits needed (zero references).
3. Run build to confirm nothing breaks.
