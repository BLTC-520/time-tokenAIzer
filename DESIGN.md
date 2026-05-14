# Time TokenAIzer Design Context

## Visual Register

Product UI for wallet-connected booking, provider inventory, and liquidity management. Design serves the task: users are making paid decisions, checking wallet state, reading quote terms, and managing real booking inventory.

## Scene

A creator or buyer is using a wallet-connected marketplace on a laptop during a paid booking flow, with transaction prompts open and real money at risk. The interface should feel calm, technical, and legible under focused desk lighting.

## Color Strategy

Restrained. Use tinted graphite neutrals as the base, jade for healthy inventory and confirmed transactions, amber for expiring quotes or inventory pressure, and red only for destructive or failed states. Avoid the current purple and blue crypto gradient identity. Accent color should carry primary actions, current selection, and status signals only.

## Tokens

Use OKLCH tokens so the UI can stay consistent across components and future themes.

```css
:root {
  --background: oklch(16% 0.01 165);
  --surface: oklch(20% 0.012 165);
  --surface-raised: oklch(25% 0.014 165);
  --surface-subtle: oklch(18% 0.01 165);
  --border: oklch(40% 0.018 165);
  --border-muted: oklch(31% 0.014 165);
  --text-strong: oklch(94% 0.008 165);
  --text: oklch(86% 0.01 165);
  --text-muted: oklch(72% 0.012 165);
  --text-faint: oklch(58% 0.012 165);
  --primary: oklch(72% 0.13 158);
  --primary-pressed: oklch(64% 0.12 158);
  --success: oklch(69% 0.12 158);
  --warning: oklch(76% 0.14 78);
  --danger: oklch(67% 0.17 28);
  --focus-ring: oklch(82% 0.11 158);
  --shadow-soft: 0 16px 40px oklch(8% 0.01 165 / 40%);
  --radius-control: 8px;
  --radius-panel: 8px;
}
```

## Typography

- Use a product sans stack: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `system-ui`, `sans-serif`.
- Keep UI labels, buttons, and data in the same family.
- Use a compact fixed scale: 12, 13, 14, 16, 18, 22, and 28px.
- Cap explanatory prose at 65 to 75 characters per line.
- Use tabular numerals for balances, quote amounts, pool prices, and time quantities.

## Layout Rules

- First screen should be the usable marketplace, not a marketing landing page.
- Use a stable app shell with a top action bar, a primary marketplace column, and a right-side transaction or pool rail on wide screens.
- Collapse the rail below the marketplace on smaller screens; keep checkout actions sticky at the bottom only when they are relevant.
- Prefer compact status rows for pool, quote, inventory, and wallet readiness.
- Use panels for task groupings and repeated items, but do not nest cards inside cards.
- Keep booking controls, quote terms, and transaction actions visible together during checkout.
- Use segmented controls for payment mode: `Use TIME`, `Swap USDC`, and `Swap and book`.
- Use icons from `lucide-react` when the action has a familiar symbol, such as wallet, calendar, refresh, alert, check, external link, or settings.

## Liquid Glass Adaptation

Liquid material is an interaction treatment, not the identity. Use subtle material surfaces only for:

- Transaction sheets that appear above the marketplace during wallet confirmation.
- Sticky action bars that need to stay readable over scrolling inventory.
- Pool status overlays when the user is inspecting liquidity or slippage.

On web, adapt this with explicit OKLCH surface tokens, low-alpha borders, modest shadow, and restrained backdrop blur. Avoid decorative blur cards, heavy glass over dense tables, and frosted panels that reduce text contrast. Multiple material elements should share a single parent treatment so they feel grouped and do not compete.

## Interaction States

Every booking, swap, inventory, and wallet control must define:

- Default: calm surface, clear label, stable dimensions.
- Hover: slight surface lift or border emphasis, no layout shift.
- Focus: visible `--focus-ring` with keyboard parity.
- Active: pressed state using `--primary-pressed` or a darker neutral surface.
- Disabled: muted text, disabled cursor, and a reason in adjacent helper text or tooltip.
- Pending: skeletons for data loading; inline progress for transaction submission.
- Success: jade status with transaction hash or booking reference when available.
- Warning: amber status for expiring quote, low inventory, high slippage, or chain mismatch.
- Error: red status with recovery action, not just failure copy.

## Motion

- Keep most transitions between 150 and 250 ms.
- Use ease-out curves for reveals, confirmations, and sheet movement.
- Animate opacity and transform; avoid animating layout properties.
- Motion should communicate state: pending, confirmed, failed, expanded, collapsed, or refreshed.
- Respect `prefers-reduced-motion` by removing nonessential transitions and keeping state changes immediate.

## Accessibility Notes

- Maintain WCAG AA contrast for all text, controls, and status indicators.
- Do not rely on color alone for pool health, quote expiry, booking status, or transaction failure.
- Provide keyboard access for tabs, segmented controls, checkout actions, and provider selection.
- Keep focus order aligned with the visible booking workflow.
- Use explicit labels for wallet address, balance, quote expiry, slippage, and booking time.
- Announce asynchronous transaction states through polite live regions.
- Preserve readable text sizes on mobile; do not use viewport-scaled fonts.
- Make touch targets at least 44 by 44 CSS pixels for primary controls.
