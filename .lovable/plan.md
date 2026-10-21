# Endless becomes "Space Climb": rise from the rooftops to deep space

## Goal
Endless mode gets its own journey, separate from the ten districts. It starts above the city rooftops and climbs through clouds, storms, the edge of space, orbit, the Moon and the planets to deep space, at around 600 floors. Every zone has its own painted scene, living motion, obstacle and faster pace. A fresh Space Climb leaderboard records the score and the furthest zone each player reached.

## What stays unchanged
- Campaign districts, levels, stars, unlocks, rewards, coin amounts, Market prices, audio mix, approved art and films.
- Rewarded ads and the five-second countdown. Endless coin rules stay as they are now.
- The old Endless leaderboard is kept, not deleted. It is hidden from the menu and saved as "Classic".
- The signing key. Builds run manually and only when you say "start it".

## The journey (11 zones)

| # | Floors | Zone | Scene and motion | Obstacle added (earlier ones stay, gentler) |
|---|--------|------|------------------|----------------------------------------------|
| 1 | 0-25 | Rooftops | Sunrise city below, swallows crossing | Fast crane |
| 2 | 25-50 | High Clouds | Sea of clouds drifting, gulls gliding | Wind gusts (gradual signalled wind) |
| 3 | 50-75 | Storm and Aurora | Painted rain, distant lightning behind the tower, aurora ribbons | Slippery floors |
| 4 | 75-100 | Edge of Space | Earth's curve below, stars fading in, deep blue to black | Sliding crane |
| 5 | 100-150 | Orbit | Satellites drifting, slow painted space debris | Faster swing step |
| 6 | 150-200 | The Moon | Moon's craters glowing, Earth rising | Low gravity: slower fall, more sway |
| 7 | 200-260 | Mars | Red dust clouds rolling, Phobos passing | Dust gusts (a stronger form of the wind) |
| 8 | 260-330 | Asteroid Belt | Tumbling painted rocks in the far layers | Narrower floors |
| 9 | 330-410 | Jupiter | Giant swirling planet, storm eye turning | A steady pull to one side |
| 10 | 410-500 | Saturn | Rings glittering, ice motes drifting | Crane swings in an arc |
| 11 | 500-600+ | Deep Space | Nebula colours, shooting stars | Every challenge combined, top speed |

- Pace rises in clear steps at each zone, plus a small gradual climb inside each zone.
- Runs never end by goal. After 600, Deep Space continues at top speed.
- Obstacles stay behind or around the tower and never cover the landing area.

## Player experience
- **Zone arrival:** a soft painted banner ("Welcome to the Moon") fades in for about 2 seconds while play continues. A gentle chime plays.
- **Altitude marker:** a slim painted strip at the screen edge shows the current zone icon and the next one approaching.
- **Game over:** shows score, floors and the zone reached ("Reached Mars — floor 231"), plus your best zone.
- **Home button:** "Endless" is renamed "Space Climb" and shows your best score with your best zone icon.
- **Leaderboard:** a fresh Space Climb board with name, score, floors and a zone icon. It has two tabs: All-time and This week.

## Artwork (approved one at a time before it goes into the game)
Everything is painted in the same storybook gouache style: no flat, vector or neon art, and no 3D.
1. Eleven zone skies, each with a lower and an upper painting so the sky crossfades smoothly as you climb (22 paintings). Space zones keep painted, warm storybook colours, not photo-real space.
2. Living scenery as authored pose sheets (no sliding images):
   - satellites (slow turn)
   - space debris and asteroids (tumble)
   - shooting stars
   - Jupiter's storm swirl
   - Saturn ring sparkle
   - Mars dust
   - the Moon and Earth rising
3. A space-themed floor set for the tower above the edge of space: same proportions, painted panels with small porthole windows. Floors stay 2D painted blocks.
4. Eleven zone badge icons for the altitude marker, the leaderboard and the game-over screen.
5. A painted zone-arrival banner plaque.

**Review order:**
- Rooftops, then High Clouds, then each zone in turn
- then the creatures and objects
- then the floor set
- then the badges and banner

## Sound
- One new space ambience bed (soft cosmic pad) from the Edge of Space onwards.
- The Rooftops and Clouds zones reuse the existing birds and wind ambience.
- Volume follows the existing music and effects settings. Silence when leaving the app still applies.

## Implementation order
1. Zone rules and tests, with placeholder visuals using existing art. Playable straight away.
2. Fresh leaderboard: server-validated, signed-in only, one score per run, records the zone reached.
3. HUD: zone banner, altitude marker, game-over zone line, Home and leaderboard labels.
4. Artwork integration zone by zone, each after your approval.
5. Full phone-size walkthrough of all 11 zones. Browser checks cannot prove real-phone smoothness.
6. Android build only when you say "start it".

## Technical details
- New browser-safe `src/game/spaceClimb.ts` replaces the rules in `endless.ts`:
  - a `SPACE_ZONES` table (id, name, start floor, speed step, obstacle set)
  - `zoneAt(floors)`
  - `spaceSpec(floors): LevelSpec`, extended with optional `gravity`, `pull` and `arc` fields that default to neutral, so campaign specs are untouched
  - `spaceSpec` is unit-tested at every zone boundary
- TowerGame reads the new optional fields only when `endless` is set.
  - Low gravity scales fall acceleration.
  - Pull adds constant sideways acceleration, through the same path as wind.
  - Arc adds a vertical component to the crane swing in motion.ts.
  - Motion tests are extended.
- The sky gets a space-zone layer selected by zone: low and high paintings crossfaded by camera height, like `districtSkyMix`. It is preloaded per zone through preload.ts, two zones ahead, so nothing streams in mid-run.
- Database:
  - new `space_scores` table: player_id, name, score, floors, zone, run_id unique, created_at
  - RLS: public select; no direct insert
  - a security-definer `submit_space_score(_run, _score)` that validates a finished, unused endless run ticket from `start_game_run` / `finish_game_run`, derives the zone server-side from the validated floors, and inserts once per run
  - `endless_scores` and `submit_endless_score` are left in place; the UI stops posting to them
  - the weekly view filters `created_at >= date_trunc('week', now())`
- `leaderboard.ts` gets `topSpaceScores(limit, scope)` and `submitSpaceScore`. The submission status keeps mirroring the server response and resets per run.
- `AGENTS.md`: replace the endless rule with a Space Climb rule (zone rules in spaceClimb.ts with tests; scores only via submit_space_score).
- Memory: save the zone list and the fresh-leaderboard decision as a feature memory.
