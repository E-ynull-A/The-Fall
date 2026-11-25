# The Fall

Single-player medieval grand strategy browser game. You inherit a collapsing kingdom and decide what is worth saving.
React 18 + TypeScript + Vite. No backend; saves live in the browser's LocalStorage.

## Run

```
npm install
npm run dev      # http://localhost:5173
npm test         # engine, combat, AI, save tests (Vitest)
npm run build    # typecheck + production build into dist/
```

## Architecture

- `src/types/` – TypeScript types for every entity: kingdom, province, card, effect, event, objective, military, economy, game state.
- `src/data/` – data-driven content and tuning: kingdoms, 12 provinces + map layout, traits, 28 cards, 15 events, 9 objectives, 3 scenarios, economy and military rules.
- `src/engine/` – pure game logic, no React. Every state change goes through `gameReducer` (`GameEngine.ts`).
  - `TurnManager` – the yearly sequence: military (sieges) → world (AI, diplomacy, events) → end of year (objectives, defeat) → new year (delayed effects, economy, cards).
  - `EconomyManager`, `ProvinceManager`, `CardManager`, `EffectManager`, `CombatManager`, `EventManager`, `AIManager`, `DiplomacyManager`, `ObjectiveManager`, `validation`.
- `src/features/map/mapGeometry.ts` – atlas geometry: province borders are Voronoi cells of the seats in `data/provinces/mapLayout.ts`; a test checks they match the gameplay neighbor lists.
- `src/services/` – `SaveService` (LocalStorage, validated, versioned) and `AudioService` (Web Audio synthesised sounds).
- `src/components/` – React UI that renders state and dispatches actions only.
- `src/utils/random.ts` – seeded RNG stored in the game state, so a loaded game continues identically.

## Status

All eight roadmap phases are implemented: foundation, interactive map, economy and turns, cards, military and conquest,
events/AI/diplomacy, campaign and persistence, polish. 87 automated tests.

## Languages

English and Azerbaijani, switchable on the title screen and in the in-game menu (remembered in LocalStorage).
`src/i18n/` holds a dependency-free translator: keys are the English source strings, dynamic engine messages use regex patterns,
and untranslated text falls back to English. A test checks that all game content and the chronicle of a played campaign are translated.
`scripts/i18n-wrap.cjs` is the codemod that wrapped UI text in `tr()`.

## Key rules (tunable in `src/data/`)

- Gold, Food, Military are non-negative; Stability and Legitimacy are 0–100.
- Taxes scale with province stability (50–100%) and tax level (×0.5 / ×1 / ×1.5, with +3 / 0 / −4 stability a year).
- Upkeep: 1 gold per 5 army, 1 per 4 garrison, administration rising with province count, castles cost 1.
- Unpaid soldiers desert; famine hits stability everywhere; provinces below 15 stability rebel.
- Three decrees (cards) per year; one free card replacement per year.
- Attacks only on adjacent provinces; walls of level 2+ require a siege. Conquered land starts restless and pays half taxes for 3 years.
- AI realms make no unprovoked war in the first 3 years and wait 4 years after each conquest. Gifts can keep Draven's hostility below its war threshold.
- Defeat: stability or legitimacy at 0, capital lost, all provinces lost, or two years of total collapse. Scenarios are also lost when time runs out.
- Victory: Unification (or a scenario's goal). Other objectives grant rewards and the campaign continues.

## Balance notes

Simulations show a passive ruler falls in roughly 8–25 years; a simple defensive strategy (gifts to Draven, walls,
recruiting, sensible decrees) usually survives 30 years. Expansion is possible but costly.
