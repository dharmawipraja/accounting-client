# Toast (sonner) restyle to the Buku design system — Design Spec

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Scope:** Restyle the app's toast/snackbar so it (a) follows the in-app dark-mode toggle and (b) matches the Buku visual language. Two files: `src/components/ui/sonner.tsx` and `src/app/providers.tsx`. No changes to any `toast.*` caller.

## Goal

Make the sonner toast "better and match the new design": fix the theme-sync bug so toasts follow the app's own dark mode, and re-skin the semantic variants to the Buku "calm card + colour accent" language (neutral popover card, semantic colour carried only by the lucide icon + a 3px left-bar), on the navy-tinted elevated shadow and 8px radius.

## Background

The toast is **sonner** (`^2.0.7`), mounted once in `src/app/providers.tsx` as `<Toaster richColors position="top-right" />` inside `QueryClientProvider`, under the custom `ThemeProvider` from `@/stores/theme`. The custom `Toaster` lives in `src/components/ui/sonner.tsx`.

Two real problems plus polish gaps were found during exploration:

1. **Theme desync (bug).** `sonner.tsx` reads `useTheme()` from **`next-themes`** — a library this app uses **nowhere else**. There is no `next-themes` provider mounted, so the hook always returns its default `theme: "system"`. The app's actual theme is a **zustand** store (`@/stores/theme`, `theme: 'light' | 'dark'`) that toggles the `.dark` class on `<html>`. Result: the toast follows the OS colour scheme, not the in-app toggle, and can render in the wrong mode.
2. **Colours don't match Buku.** `richColors` paints whole-toast backgrounds from **sonner's own** green/red/amber palette, unrelated to the Buku semantic tokens (`success #00875A`, `warning #B95000`, `error/destructive #C52720`, `info` = primary `#006FCF`) used by the `StatusChip` system.
3. **Minor.** A dead `cn-toast` class is applied via `toastOptions.classNames.toast` but never defined anywhere. Toasts use sonner's default drop-shadow, not the Buku navy-tinted elevated shadow.

Already correct and kept: the lucide `icons` prop (CircleCheck / Info / TriangleAlert / OctagonX / Loader2), the `--normal-bg/-text/-border` base vars wired to popover tokens, the `--border-radius: var(--radius)` (8px), and `position="top-right"`.

## Decisions (from brainstorming)

- **Variant style = "calm card + colour accent" (Option B).** Neutral popover card (white in light / navy `#00175A` in dark) with ink text; the only colour is the **semantic lucide icon** plus a **3px left-bar** in the matching semantic tone. This reads premium/restrained and still satisfies "state via icon + text, never colour alone". (The louder "fully tinted background" Option A was declined.)
- **Drop `richColors`.** It forces whole-toast tinting, which is exactly the look we are not building; the per-type styling is done with sonner's per-type `classNames` instead.
- **Theme = the app store.** Read `useTheme()` from `@/stores/theme`, not `next-themes`.
- **Keep** `position="top-right"`, the lucide icons, and the base popover/radius vars.
- **Leave the `next-themes` dependency in `package.json`** (now unused by app code) rather than touch the lockfile in a styling change. Out of scope to remove.

## Design

### 1. Theme sync — `src/components/ui/sonner.tsx`

Replace the import and hook source:

```tsx
import { useTheme } from "@/stores/theme"   // was: next-themes
// ...
const { theme } = useTheme()                // 'light' | 'dark', from the zustand store
```

Pass `theme` straight through to `<Sonner theme={theme} />`. The store value is already exactly `'light' | 'dark'`, both valid `ToasterProps["theme"]` values, so no cast/mapping is needed. The Toaster now re-renders when the store toggles, so toasts always match the app mode.

### 2. Variant styling — `src/components/ui/sonner.tsx`

Keep the base `style` vars (popover bg/text/border, radius). Replace the dead `toastOptions.classNames.toast: "cn-toast"` with real Buku classes plus per-type accents:

```tsx
toastOptions={{
  classNames: {
    toast: "shadow-lg border-border",
    success: "border-l-[3px] border-l-success [&_[data-icon]]:text-success",
    error:   "border-l-[3px] border-l-destructive [&_[data-icon]]:text-destructive",
    warning: "border-l-[3px] border-l-warning [&_[data-icon]]:text-warning",
    info:    "border-l-[3px] border-l-primary [&_[data-icon]]:text-primary",
  },
}}
```

- Sonner applies the per-type class (`success`/`error`/`warning`/`info`) to the toast **root** element for that toast type, so the descendant selector `[&_[data-icon]]:text-X` colours the icon slot. lucide icons render with `currentColor`, so `text-success` (etc.) tints the glyph; the 3px `border-l` is the left-bar.
- The `loading` type keeps the spinner with no accent bar (neutral), which is correct.
- All four colours are the Buku semantic Tailwind utilities (exposed from the tokens via `@theme inline`). Because the `.dark` block redefines `--success`/`--warning`/`--destructive`/`--primary` to the navy-safe brighter tones, dark mode adapts with no extra code.

### 3. Shadow / radius / type

`shadow-lg` resolves to the Buku elevated shadow `0 6px 24px rgba(0,23,90,0.16)` (defined in `src/index.css`), matching app-wide card elevation. Radius stays 8px via the existing `--border-radius: var(--radius)`. Public Sans is inherited from the app — no font work.

### 4. Provider mount — `src/app/providers.tsx`

Remove `richColors` from the `<Toaster />`; keep `position="top-right"`:

```tsx
<Toaster position="top-right" />
```

### Resulting `sonner.tsx` (target shape)

```tsx
import { useTheme } from "@/stores/theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
      } as React.CSSProperties}
      toastOptions={{
        classNames: {
          toast: "shadow-lg border-border",
          success: "border-l-[3px] border-l-success [&_[data-icon]]:text-success",
          error: "border-l-[3px] border-l-destructive [&_[data-icon]]:text-destructive",
          warning: "border-l-[3px] border-l-warning [&_[data-icon]]:text-warning",
          info: "border-l-[3px] border-l-primary [&_[data-icon]]:text-primary",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
```

## Testing

A focused test (`src/components/ui/sonner.test.tsx`) that **mocks the `sonner` library** so its `Toaster` is a spy that records the props our composition passes, then renders the real `<Providers>` tree (which mounts our `Toaster` wrapper). This tests the actual wiring — store → `theme` prop, and the dropped `richColors` at the mount site — without depending on sonner's internal DOM or a live toast lifecycle.

Why not assert on rendered DOM: sonner v2 reflects its theme onto `data-sonner-theme` (not `data-theme`) and returns `null` for a position with no toasts, so `[data-sonner-toaster]` is **absent** until a toast actually fires — too brittle for a unit test. The mock-spy approach matches existing precedent (`src/lib/api/toastApiError.test.ts` already does `vi.mock('sonner', …)`).

The spy is created with `vi.hoisted` (so the hoisted `vi.mock` factory can reference it):

```tsx
const { sonnerSpy } = vi.hoisted(() => ({ sonnerSpy: vi.fn() }));
vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => { sonnerSpy(props); return null; },
}));
```

Three assertions, each rendering `<Providers><div /></Providers>` and reading the latest spy call's props:

1. **Theme follows the store, not the OS.** With `useTheme.setState({ theme: 'dark' })` before render, assert the captured props `toMatchObject({ theme: 'dark' })`. This **fails** against the old `next-themes` wiring (which yields `theme: 'system'`), and passes once the import is switched to `@/stores/theme`.
2. **No `richColors`.** Assert the captured `props.richColors` is falsy. Guards against re-adding it at the mount.
3. **Buku accent classNames.** Assert `props.toastOptions.classNames` has `success` containing `border-l-success`, `error` containing `border-l-destructive`, `warning` containing `border-l-warning`, `info` containing `border-l-primary`.

`afterEach` resets the store (`useTheme.setState({ theme: 'light' })`) and clears the spy. The per-type icon colour and shadow are covered by the visual/manual verification below.

Existing callers (`src/lib/api/toastApiError.ts` and every `toast.success/error/...` site) are unchanged — they keep calling the same sonner API and simply render in the new style. The full suite must stay green.

## Verification

- `pnpm test --run` green (existing + new test).
- `pnpm exec tsc --noEmit` clean (note: `theme` from the store is `'light' | 'dark'`, assignable to `ToasterProps["theme"]` without a cast).
- `pnpm run lint` — no new warnings (pre-existing React-Compiler/RHF warnings excepted per CLAUDE.md).
- `pnpm run build` succeeds.
- Manual/visual: toggling in-app dark mode flips the toast mode; a success toast shows a green icon + green left-bar on a neutral card, error red, warning amber, info blue; navy-tinted elevated shadow; 8px radius.

## Files

- **Modify:** `src/components/ui/sonner.tsx` (theme source + per-type classNames + shadow; drop dead `cn-toast`).
- **Modify:** `src/app/providers.tsx` (drop `richColors`; keep `position="top-right"`).
- **Create:** `src/components/ui/sonner.test.tsx` (theme-sync + no-richColors contract).

## Out of scope

- Removing the `next-themes` dependency from `package.json` / lockfile.
- Changing toast position, duration, dismiss behaviour, or any `toast.*` call site.
- Custom toast content/JSX, action buttons, or a close button.
- Any change to `StatusChip` / `statusChips.tsx` (the toast borrows their token language but shares no code).
