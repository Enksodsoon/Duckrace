# Duck Race Randomizer Product Description for TestSprite

## Product Overview

Duck Race Randomizer is a browser-based React/Vite game for running randomized duck races from a custom participant list. The app lets a host enter or generate racers, start an animated countdown, watch real 3D mesh ducks race across a water track, and record winners, race history, and tournament eliminations. It is designed for classrooms, events, livestreams, raffles, and lightweight tournament-style selection.

The current product is a single-page web app with no backend. Data is stored locally in the browser through `localStorage`, and exports are downloaded as TXT, CSV, or JSON files.

Authentication is intentionally not part of this product. There is no login or sign-in flow. To test saved-data clearing, use the visible `Clear saved browser data` control in the host sidebar or `Clear saved data` in the Seed + Results panel.

## Primary Users

- **Race host / teacher / event organizer**: enters names or numbered groups, starts races, picks winners, exports results, and manages tournament rounds.
- **Audience / viewers**: watch the race board or audience-mode display.
- **Tester / QA automation**: validates that the race can be configured, started, completed, reset, exported, and viewed responsively.

## Core Value Proposition

The app provides a fun, visual, repeatable way to randomly select winners or rankings. Unlike a static random picker, the app animates the process through a 3D race and preserves useful output such as results, logs, and shareable configurations.

## Supported Routes and Modes

- `/`: main host dashboard.
- `/?audience=1`: opens audience mode by default.
- `/?minimal=1`: enables compact overlay mode.
- `/?seed=<value>`: uses a seeded race configuration for repeatable outcomes.
- `/?shuffle=1`: enables shuffle-before-race from URL configuration.
- Overlay/audience behavior is controlled in-app and reflected in share links.

## Main Navigation

The application has three primary views:

1. **Race Track**
   - Main race board with 3D track, live placements, recent history, race controls, sound controls, seed/results controls.

2. **Duck Garage**
   - Preview area for each racer's 3D duck model and avatar variant.
   - Includes outfit reroll and tournament round controls.

3. **Live Stats**
   - Broadcast-style live view with quick race actions, podium/results display, and audience/overlay controls.

The header also includes:

- Reroll duck outfits button.
- Sidebar hide/show toggle.
- Quick actions menu with shortcuts.

## Feature Requirements

### 1. Entry Management

Users can enter racers manually in a textarea. Entries may be separated by new lines, commas, semicolons, or tabs.

Expected behavior:

- Empty entries are ignored.
- Duplicate entries are removed when `Remove duplicate racer entries` is enabled.
- Duplicate removal shows a notice with the number of removed duplicates.
- The entry count updates as entries are added, removed, filtered, or generated.
- The active entry list updates immediately when the user types.

Controls:

- Entry textarea placeholder: `One entry per line, or use commas`
- Filter input placeholder: `Filter active entries...`
- `Remove duplicate racer entries` checkbox/button
- Clear button
- Sample button
- Export TXT button
- Import file button
- Export CSV button

### 2. Number Generation

Users can generate numbered racers from a start number, end number, and optional prefix.

Expected behavior:

- Inputs: `Start`, `End`, `Prefix`
- Example: start `1`, end `4`, prefix `Group ` produces:
  - `Group 1`
  - `Group 2`
  - `Group 3`
  - `Group 4`
- If end is lower than start, the app should still generate an ascending sequence using the min/max values.
- Generated values replace the current entry textarea.

### 3. Race Start and Countdown

Users can start a race when at least one active entry exists.

Expected behavior:

- Start button is disabled when no active racers exist.
- Clicking `Start Race` starts a countdown from 3 to 1.
- During countdown/race, start and instant-pick actions are disabled.
- After countdown, ducks begin moving across the 3D track.
- Race duration is controlled by the race duration slider, with a minimum of 3 seconds and maximum of 30 seconds.

### 4. 3D Race Track

The race is rendered as a real WebGL/Three.js 3D scene.

Expected behavior:

- The race shell is labeled `Real 3D duck race track`.
- Ducks are rendered as 3D mesh models with body, head, beak, wings, legs, accessories, and color variations.
- Ducks move left-to-right from Start toward Finish.
- The winning duck reaches `100% track progress`.
- At race completion:
  - `data-racing` is `false`.
  - `data-winner-progress` is `100`.
  - A winner banner appears.
  - The leaderboard displays `100% track progress` for the winner.
- The race bar/leaderboard must not cover the 3D track; it should appear below the race stage.
- The layout must not horizontally overflow on desktop or mobile.

### 5. Instant Pick

Users can choose winners instantly without running the full timed race.

Expected behavior:

- Instant pick is disabled when no entries exist or a timed race is running.
- Instant pick selects podium winners immediately.
- Winner progress becomes `100`.
- Winner banner and leaderboard update.
- Results are stored in recent history and race logs.

### 6. Reset

Users can reset the visual race state.

Expected behavior:

- Reset clears current racers, progress, placements, countdown, burst effects, and winner banner.
- Reset does not erase entries.
- Reset does not clear saved settings/history unless the user explicitly clicks clear saved data.

### 7. Results and Exports

The app supports exporting several outputs.

Expected behavior:

- `Export TXT`: downloads active entries as `entries.txt`.
- `Export CSV`: downloads active entries as `entries.csv`.
- `Results CSV`: downloads last winners as `results.csv`; disabled until results exist.
- `History JSON`: downloads results history as `results-history.json`; disabled until history exists.
- `Race log`: downloads race logs as `race-log.json`; disabled until logs exist.
- `Copy share link`: writes the configured URL to clipboard when possible; if clipboard is blocked, downloads `share-link.txt`.

### 8. Seeded Fairness and Share Links

Users can set or randomize an optional race seed.

Expected behavior:

- Race seed input accepts a whitespace-free string.
- Randomize seed fills the seed input with a generated value.
- Copy share link includes current seed and relevant URL parameters.
- Seeded races should be repeatable for the same participant list and race settings.
- Shuffle-before-race affects race order when enabled.

### 9. Persistence

The app stores settings and history in browser `localStorage` under:

`duck-race-randomizer:v1`

Expected behavior:

- Entries, settings, seed, sound options, race logs, round history, and UI preferences persist across refreshes.
- Malformed saved data should be ignored without crashing.
- Clear saved data removes local saved state and restores defaults.

### 10. Sound and Broadcast Controls

Users can control sound and broadcast settings.

Expected behavior:

- Sound effects can be toggled on/off.
- Master volume ranges from 0 to 200.
- Separate volume sliders exist for countdown, start, race, and finish channels.
- Sound preset dropdown includes:
  - `sport`
  - `cinematic`
  - `minimal`
- If audio is blocked by the browser/environment, the app should remain usable and show a silent-state message.

### 11. Duck Garage

Users can preview and manage 3D duck variants.

Expected behavior:

- Each racer appears with a 3D duck preview.
- Ducks have procedural outfit/accessory and pattern variations.
- Header reroll button opens Duck Garage and changes avatar seed.
- `Random outfits now` rerolls current preview styles.
- `Reroll avatar style each round` controls whether avatar styles change each race.

### 12. Tournament / Elimination Rules

Users can run repeated rounds and eliminate selected podium places.

Expected behavior:

- Podium size can be configured from 1 up to active entry count.
- Elimination places can be toggled individually.
- Buttons exist for:
  - `No elimination`
  - `Eliminate 1st only`
  - `Eliminate all podium places`
- After a race, selected winning places are removed from the remaining entry pool.
- Undo last elimination restores removed entries and round metadata.
- Round history records winners and eliminated entries.

### 13. Audience Mode and Overlay Mode

Users can show a fullscreen audience/broadcast view.

Expected behavior:

- Audience Mode opens a fullscreen overlay with the same race state.
- Overlay includes start/close controls unless opened as overlay-only route.
- Compact overlay mode reduces supporting text and panel size.
- Audience/overlay race should use the same entries, progress, winner, and podium state as the main dashboard.

## Critical User Flows for Testing

### Flow A: Basic Timed Race

1. Open `/`.
2. Confirm app title and race shell are visible.
3. Enter or use sample entries.
4. Set race duration to 3 seconds.
5. Click `Start Race`.
6. Observe countdown.
7. Wait for race completion.
8. Verify:
   - Winner banner exists.
   - Winner progress is `100`.
   - `data-racing=false`.
   - Leaderboard contains `100% track progress`.
   - Race log exists.

### Flow B: Manual Entries and Dedupe

1. Enter:
   - `Alpha`
   - `Beta`
   - `Gamma`
   - `Alpha`
2. Ensure dedupe is enabled.
3. Verify duplicate notice appears.
4. Filter by `Ga`.
5. Verify active entries count becomes `1`.
6. Clear filter.
7. Verify entries restore to the deduped list.

### Flow C: Number Generation

1. Fill `Start` with `1`.
2. Fill `End` with `4`.
3. Fill `Prefix` with `Duck `.
4. Click `Generate`.
5. Verify entries become `Duck 1` through `Duck 4`.
6. Click `Sample`.
7. Verify default groups return.

### Flow D: Instant Pick and Reset

1. Start with active entries.
2. Click `Pick`.
3. Verify winner appears and winner progress is `100`.
4. Click `Reset`.
5. Verify winner banner disappears and entries remain.

### Flow E: Navigation and Quick Actions

1. Click `Duck Garage`.
2. Verify `Duck Stable` is visible.
3. Click `Live Stats`.
4. Verify `Turbo Ready` is visible.
5. Click `Race Track`.
6. Open `MENU`.
7. Click `Open duck garage`.
8. Verify Duck Garage opens.

### Flow F: Sidebar and Responsive Layout

1. Click hide-sidebar icon.
2. Verify sidebar is hidden and show-sidebar icon appears.
3. Click show-sidebar icon.
4. Verify sidebar returns.
5. Resize viewport to mobile width.
6. Verify no horizontal overflow.
7. Verify primary controls remain reachable.

### Flow G: Persistence

1. Change entries and race duration.
2. Refresh the page.
3. Verify settings are restored.
4. Click `Clear saved browser data` or `Clear saved data`.
5. Verify defaults are restored and local state is removed.

Do not look for login/sign-in controls in this flow; the app has no authentication by design.

### Flow H: Export and Share

1. Add entries.
2. Export TXT and CSV.
3. Run or instant-pick a race.
4. Export Results CSV, History JSON, and Race Log JSON.
5. Set/randomize a seed.
6. Copy share link.
7. Verify exported/downloaded content matches current app state.

## Suggested Test Data

Basic:

```text
Group 1
Group 2
Group 3
Group 4
Group 5
Group 6
```

Dedupe:

```text
Alpha
Beta
Gamma
Delta
Alpha
```

Long names:

```text
The Very Long Duck Team Name That Should Truncate Nicely
Short
Medium Length Team
Another Extremely Long Name For Layout Testing
```

Single racer:

```text
Solo Duck
```

Large roster:

```text
Duck 1
Duck 2
Duck 3
Duck 4
Duck 5
Duck 6
Duck 7
Duck 8
Duck 9
Duck 10
Duck 11
Duck 12
Duck 13
Duck 14
Duck 15
Duck 16
```

## Non-Functional Requirements

### Performance

- Timed race should remain interactive and complete without freezing.
- 3D rendering should not block controls or prevent race completion.
- Winner must always reach the finish state even on slower devices.
- Mobile and zoomed browser layouts must avoid horizontal scrolling.

### Reliability

- No uncaught JavaScript errors during normal flows.
- No blank screen on malformed saved data.
- Race finalization must always produce a valid winner when racers exist.
- Buttons must be disabled during invalid states, such as starting a race with no active racers.

### Accessibility / Testability

- Key buttons should be discoverable by visible text or `aria-label`.
- Inputs should have stable placeholders.
- The 3D race shell exposes useful data attributes:
  - `data-leading-progress`
  - `data-winner-progress`
  - `data-racing`
- The race stage should have the accessible label `Real 3D duck race track`.

## Acceptance Criteria

- The app builds successfully with `npm run build`.
- `npm audit --audit-level=high` reports zero high-or-worse vulnerabilities.
- App loads at `/` with no framework error overlay.
- User can add racers, generate racers, filter racers, and dedupe racers.
- User can run a timed race to completion.
- User can use instant pick.
- Winner always reaches `100%` progress.
- Winner banner is visible after completion.
- Race log and history update after race/pick.
- User can reset the race without losing entries.
- User can navigate Race Track, Duck Garage, and Live Stats.
- User can open audience mode and compact overlay mode.
- User can export entries/results/history/logs.
- User can use seeded share links.
- Desktop and mobile layouts have no horizontal overflow.

## Recommended Automated Test Priorities

1. Smoke test page load and visible race shell.
2. Timed race completion with 3-second duration.
3. Instant pick and reset.
4. Entry management: manual, dedupe, filter, generated numbers.
5. Navigation: Race Track, Duck Garage, Live Stats, quick menu.
6. Persistence across refresh.
7. Export/download flows.
8. Audience mode route and compact overlay route.
9. Responsive layout at desktop, tablet, mobile, and browser zoom-like sizes.
10. Large roster and long-name stress tests.

## Known Implementation Notes

- This is a client-only app; there is no API server or database.
- Browser storage is local to each user/device.
- There is no login/sign-in feature; saved data is cleared through the visible clear-saved-data controls.
- WebGL availability is required for the full 3D race experience.
- Audio may be blocked by browser autoplay policies until the user interacts with the page.
- Vercel deploys from the GitHub `main` branch.
