# Emotion Independent Vector Faces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the runtime PNG atlas crop with 18 standalone, transparent, reference-matched SVG mood faces whose selection and focus treatment belongs only to the surrounding button.

**Architecture:** Put all reference-traced vector artwork in one focused `EmotionFaceArtwork.tsx` module with one SVG component per stable mood ID and a typed lookup map. Keep `EmotionIcon` as the public adapter for size, fallback, selection semantics, and CSS classes. Make the mood button own selected/focus visuals, while the SVG remains transparent and visually unchanged in every interaction state.

**Tech Stack:** React 18, TypeScript, inline SVG, CSS, Vitest, Testing Library, Vite.

---

## File structure

- Create `src/emotion/components/EmotionFaceArtwork.tsx`: 18 independent SVG drawings and the mood-to-artwork map; no interaction logic and no raster references.
- Modify `src/emotion/components/EmotionIcon.tsx`: small public adapter that selects artwork and falls back to calm.
- Modify `src/emotion/components/EmotionIcon.test.tsx`: structural guarantees for unique vector artwork and absence of raster/text/background artifacts.
- Modify `src/emotion/components/EmotionComposer.tsx`: confirm selected state is expressed by the mood button and expose stable selection semantics.
- Modify `src/emotion/emotionModule.css`: remove atlas presentation rules and move all selected/focus treatment to `.emotion-mood-choice`.
- Delete runtime asset `src/emotion/assets/reference-mood-atlas.png` after all SVG tests pass.
- Add browser evidence under `docs/情绪模块/验收证据/2026-08-14-v1.3.3/screenshots/`.

### Task 1: Lock the no-raster component contract

**Files:**
- Modify: `src/emotion/components/EmotionIcon.test.tsx`

- [ ] **Step 1: Write failing structural tests**

Add assertions equivalent to:

```tsx
const { container } = render(<>{moodPresets.map(({ id }) => <EmotionIcon key={id} moodId={id} />)}</>);
expect(container.querySelectorAll('svg[data-reference-face]')).toHaveLength(18);
expect(container.querySelector('image, text, foreignObject')).not.toBeInTheDocument();
expect(container.innerHTML).not.toMatch(/\.png|\.jpe?g|data:image/i);
expect(new Set(Array.from(container.querySelectorAll('svg'), node => node.innerHTML))).toHaveLength(18);
```

Add a selected-state assertion:

```tsx
const { container } = render(<EmotionIcon moodId="happy" selected />);
const svg = container.querySelector('svg[data-reference-face="happy"]');
expect(svg).not.toHaveClass('is-selected');
expect(svg).not.toHaveAttribute('style');
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- --run src/emotion/components/EmotionIcon.test.tsx`

Expected: FAIL because the current component contains an SVG `<image>` that points to the PNG atlas.

- [ ] **Step 3: Commit the red test**

```powershell
git add -- src/emotion/components/EmotionIcon.test.tsx
git commit -m "test(emotion): require standalone vector mood faces"
```

### Task 2: Build the uplifted and steady vector groups

**Files:**
- Create: `src/emotion/components/EmotionFaceArtwork.tsx`
- Modify: `src/emotion/components/EmotionIcon.tsx`

- [ ] **Step 1: Create shared SVG primitives without shared face anatomy**

Define only neutral technical helpers such as gradient definitions and the component type. Each mood must retain its own face outline and feature paths:

```tsx
export interface FaceArtworkProps { id: string }
type FaceArtwork = (props: FaceArtworkProps) => JSX.Element;

function FaceGradient({ id, light, base }: { id: string; light: string; base: string }) {
  return (
    <defs>
      <radialGradient id={id} cx="32%" cy="24%" r="78%">
        <stop offset="0" stopColor={light} />
        <stop offset="1" stopColor={base} />
      </radialGradient>
    </defs>
  );
}
```

Do not introduce `<image>`, `<text>`, `<foreignObject>`, opaque full-canvas rectangles, or data URLs.

- [ ] **Step 2: Trace four uplifted faces**

Create dedicated SVG components for `happy`, `excited`, `grateful`, and `satisfied`. Preserve the reference-specific eye and mouth forms plus star/heart decorations. Every component uses `viewBox="0 0 120 120"`, `overflow="visible"`, transparent canvas, and `data-reference-face`.

- [ ] **Step 3: Trace four steady faces**

Create dedicated SVG components for `calm`, `relaxed`, `focused`, and `clear`. Preserve open/closed eye differences, exhale cloud, straight focus mouth, and blue exclamation mark.

- [ ] **Step 4: Wire the first eight moods through the adapter**

Replace the atlas import and crop map in `EmotionIcon.tsx` with:

```tsx
import { artworkByMoodId } from './EmotionFaceArtwork';

const Artwork = artworkByMoodId[mood.id] ?? artworkByMoodId.calm;
return <span className={classes} data-mood-group={mood.group} aria-hidden="true"><Artwork id={`emotion-${mood.id}`} /></span>;
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run src/emotion/components/EmotionIcon.test.tsx`

Expected: the no-raster test still fails only because ten mood components remain to be added; first-eight rendering assertions pass.

- [ ] **Step 6: Commit the first two groups**

```powershell
git add -- src/emotion/components/EmotionFaceArtwork.tsx src/emotion/components/EmotionIcon.tsx
git commit -m "feat(emotion): trace uplifted and steady mood faces"
```

### Task 3: Build the low-energy and high-pressure vector groups

**Files:**
- Modify: `src/emotion/components/EmotionFaceArtwork.tsx`

- [ ] **Step 1: Trace five low-energy faces**

Add `tired`, `bored`, `down`, `lonely`, and `sad`, including bubbles, side glances, drooping brows, purple dot, and paired tears. Keep each decoration inside the 120×120 safety canvas without clipping.

- [ ] **Step 2: Trace five high-pressure faces**

Add `anxious`, `stressed`, `angry`, `confused`, and `overwhelmed`, including sweat, stress strokes, steam, spiral/question mark, and anger mark. Match the reference mouth types: wavy, rectangular, downturned, and teeth.

- [ ] **Step 3: Complete the typed artwork map**

Export a complete mapping:

```tsx
export const artworkByMoodId: Record<string, FaceArtwork> = {
  happy: HappyFace,
  excited: ExcitedFace,
  grateful: GratefulFace,
  satisfied: SatisfiedFace,
  calm: CalmFace,
  relaxed: RelaxedFace,
  focused: FocusedFace,
  clear: ClearFace,
  tired: TiredFace,
  bored: BoredFace,
  down: DownFace,
  lonely: LonelyFace,
  sad: SadFace,
  anxious: AnxiousFace,
  stressed: StressedFace,
  angry: AngryFace,
  confused: ConfusedFace,
  overwhelmed: OverwhelmedFace,
};
```

- [ ] **Step 4: Run the component contract tests**

Run: `npm test -- --run src/emotion/components/EmotionIcon.test.tsx`

Expected: PASS, 18 unique SVGs, zero raster or text nodes.

- [ ] **Step 5: Commit the remaining groups**

```powershell
git add -- src/emotion/components/EmotionFaceArtwork.tsx
git commit -m "feat(emotion): trace low-energy and pressure mood faces"
```

### Task 4: Move selection and focus entirely to the mood button

**Files:**
- Modify: `src/emotion/components/EmotionComposer.tsx`
- Modify: `src/emotion/emotionModule.css`
- Test: `src/emotion/components/EmotionComposer.test.tsx`

- [ ] **Step 1: Write a failing interaction-state test**

Render the composer, choose 开心, and assert:

```tsx
const happy = screen.getByRole('button', { name: '开心' });
await user.click(happy);
expect(happy).toHaveAttribute('aria-pressed', 'true');
expect(happy).toHaveClass('is-selected');
expect(within(happy).getByTestId('emotion-face-happy')).not.toHaveClass('is-selected');
```

- [ ] **Step 2: Run the composer test and confirm the expected failure**

Run: `npm test -- --run src/emotion/components/EmotionComposer.test.tsx`

Expected: FAIL if the selected class or semantics remain on the face rather than the button.

- [ ] **Step 3: Implement button-owned state**

Set `aria-pressed={draft.moodId === mood.id}` and `className={draft.moodId === mood.id ? 'emotion-mood-choice is-selected' : 'emotion-mood-choice'}`. Stop passing a visual `selected` state into the SVG artwork.

- [ ] **Step 4: Replace atlas and internal-ring CSS**

Remove `.emotion-face--reference` and `.emotion-face--svg.is-selected` visual rules. Add:

```css
.emotion-face--vector { background: transparent; border-radius: 0; box-shadow: none; overflow: visible; transform: none; }
.emotion-face--vector svg { display: block; width: 100%; height: 100%; overflow: visible; }
.emotion-mood-choice.is-selected { background: #eef6f2; box-shadow: inset 0 0 0 1px #dcebe4; }
.emotion-mood-choice:focus { outline: none; }
.emotion-mood-choice:focus-visible { outline: 3px solid #3f6f60; outline-offset: 3px; }
.emotion-mood-choice.is-selected .emotion-face { box-shadow: none; }
```

- [ ] **Step 5: Run component and composer tests**

Run: `npm test -- --run src/emotion/components/EmotionIcon.test.tsx src/emotion/components/EmotionComposer.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit interaction styling**

```powershell
git add -- src/emotion/components/EmotionComposer.tsx src/emotion/components/EmotionComposer.test.tsx src/emotion/emotionModule.css
git commit -m "fix(emotion): keep mood selection outside artwork"
```

### Task 5: Remove the PNG runtime asset and verify production output

**Files:**
- Delete: `src/emotion/assets/reference-mood-atlas.png`
- Verify: `src/emotion/components/EmotionIcon.tsx`

- [ ] **Step 1: Prove no runtime raster reference remains**

Run:

```powershell
rg -n "reference-mood-atlas|<image|data:image|\.png" src/emotion
```

Expected: no match associated with mood face rendering.

- [ ] **Step 2: Delete the unused atlas**

Delete only `src/emotion/assets/reference-mood-atlas.png` after the no-reference search succeeds.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: PASS and no `reference-mood-atlas-*.png` entry in Vite output.

- [ ] **Step 4: Commit asset removal**

```powershell
git add -u -- src/emotion/assets/reference-mood-atlas.png
git commit -m "chore(emotion): remove mood atlas runtime asset"
```

### Task 6: Real-browser visual and accessibility verification

**Files:**
- Create: `docs/情绪模块/验收证据/2026-08-14-v1.3.3/screenshots/vector-faces-1024.png`
- Create: `docs/情绪模块/验收证据/2026-08-14-v1.3.3/screenshots/vector-faces-390.png`

- [ ] **Step 1: Open the emotion composer at 1024px**

Verify all 18 faces are visible, transparent, aligned, and contain no white rectangles, labels, dividers, or crop remnants. Select 开心 and 疲惫 separately; selection must only tint the button area.

- [ ] **Step 2: Inspect the DOM contract in the browser**

Evaluate:

```js
({
  faces: document.querySelectorAll('.emotion-composer svg[data-reference-face]').length,
  rasters: document.querySelectorAll('.emotion-composer svg image').length,
  embeddedText: document.querySelectorAll('.emotion-composer svg text, .emotion-composer svg foreignObject').length,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
})
```

Expected: `{ faces: 18, rasters: 0, embeddedText: 0, overflow: false }`.

- [ ] **Step 3: Repeat at 390×844**

Verify no horizontal overflow, decorations remain visible, all controls remain at least 44×44px, and the sticky save action does not cover the mood grid.

- [ ] **Step 4: Keyboard-check focus and selection**

Use Tab to focus a mood button, press Space to select it, and verify the focus outline surrounds only that button. Press Tab again and confirm no stale internal frame remains.

- [ ] **Step 5: Save browser evidence**

Store screenshots at the two paths listed above and keep the latest composer open for user inspection.

### Task 7: Regression gate and delivery commit

**Files:**
- Test: all emotion module test files
- Verify: full repository tests and production build

- [ ] **Step 1: Run all emotion tests**

Run: `npm test -- --run src/emotion`

Expected: all emotion tests pass. If the important-day date-boundary test fails, fix its clock setup in a separate test-only commit and rerun; do not change important-day product behavior.

- [ ] **Step 2: Run the full repository suite**

Run: `npm test -- --run`

Expected: all test files and tests pass; record exact counts.

- [ ] **Step 3: Run the production build again**

Run: `npm run build`

Expected: PASS with no mood atlas PNG emitted.

- [ ] **Step 4: Confirm change isolation**

Run: `git status --short` and compare against the pre-existing dirty-file list. Do not stage or commit unrelated user files.

- [ ] **Step 5: Commit browser evidence and final verification metadata**

```powershell
git add -f -- docs/情绪模块/验收证据/2026-08-14-v1.3.3/screenshots/vector-faces-1024.png docs/情绪模块/验收证据/2026-08-14-v1.3.3/screenshots/vector-faces-390.png
git commit -m "test(emotion): verify standalone vector mood faces"
```

## Self-review

- Spec coverage: all 18 moods, transparent vectors, no raster, no embedded labels/dividers, external-only selection/focus, fallback compatibility, desktop/mobile evidence, and build output are covered.
- Placeholder scan: no TBD, TODO, “similar to,” or unspecified error-handling steps remain.
- Type consistency: `artworkByMoodId`, `FaceArtwork`, `moodId`, `data-reference-face`, `emotion-face--vector`, and button `is-selected` naming are consistent across tasks.
