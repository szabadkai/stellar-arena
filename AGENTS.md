# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `web/`; `main.js` wires together modules in `web/js`.
- Systems are grouped by responsibility: `web/js/core` for gameplay rules, `web/js/rendering` for canvas work, `web/js/ui` for HUD and menus, plus `web/js/campaign` for progression logic.
- Shared utilities (hex math, pathfinding) sit in `web/js/utils`; keep new helpers here to stay discoverable.
- The Vite build publishes static assets into `docs/`, which is tracked for GitHub Pages deployment.

## Build, Test, and Development Commands
- `npm install` pulls the lightweight toolchain (Vite only).
- `npm run dev` launches Vite’s dev server at `http://localhost:3000` with hot reload; use it for moment-to-moment tuning.
- `npm run build` outputs the production bundle into `docs/`; always run before publishing or pushing release assets.
- `npm run preview` serves the built files locally, mirroring GitHub Pages hosting—use it for final smoke checks.

## Coding Style & Naming Conventions
- JavaScript uses ES modules with 4-space indentation; prefer descriptive class and function names (`Ship`, `TurnManager`).
- Keep file names lowercase with camelCase where needed (`turnManager.js`), matching existing directories.
- Favor pure functions for utilities and keep stateful logic in classes under `core` or `game.js`.
- Run Prettier manually if installed in your editor; no automated formatter ships with the repo yet, so be consistent with current spacing and comment style.

## Testing Guidelines
- No automated suite is checked in; validate gameplay changes by running `npm run dev` and stepping through representative battles.
- When adding tests, follow Vite conventions: co-locate specs as `*.spec.js` beside the module and wire them through a future `npm test` script.
- Record manual QA steps in the pull request so others can replay them quickly.

## Commit & Pull Request Guidelines
- Keep commit subjects short and present-tense (e.g., `refine weapon cooldowns`), mirroring the existing history.
- Reference issues or feature IDs in the body, and group mechanical refactors separately from balance tweaks.
- Pull requests should include: a concise summary, screenshots or GIFs for UI changes, confirmation that `npm run build` succeeded, and any manual test notes.
- If the build updates `docs/`, include those files in the PR so reviewers can verify the deployed output.
