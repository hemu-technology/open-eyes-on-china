# Search Keyboard Navigation Enhancement

This repository adds keyboard navigation for the inline search results WITHOUT modifying the upstream theme files.

## What Was Added
1. `layouts/partials/hooks/body-end.html` – Injects a small script at the end of `<body>` to support:
   - ArrowDown / ArrowUp: Move selection through visible `.search_result` items.
   - Enter: Navigate to the highlighted result (or first if none highlighted yet).
   - Escape: Clears the active highlight (theme's existing Escape logic still closes results / clears input).
   - Adds accessible roles (`role=listbox` on container, `role=option` per result) and uses a CSS class `search_result--active`.
2. `assets/sass/_custom.sass` – Adds styling for the active result highlight.

## Styling
Active item class: `search_result--active`
```sass
.search_result--active
  background: var(--theme)
  color: #fff !important
  outline: 2px solid var(--theme)
  border-radius: .25rem
  text-decoration: none
  display: block
```
Adjust colors by overriding `--theme` (see `assets/sass/_override.sass`) or redefine the class in your own stylesheet.

## How It Works
- Theme already renders an input with id `find` and a results container `.search_results` containing `.search_result` links.
- Script listens to `keydown` on the input only (keeps scope tight, no global listeners except those already present in theme).
- Selection index wraps (cyclic).
- Focus is moved to the active anchor for screen reader support.

## Removing the Feature
Delete the file: `layouts/partials/hooks/body-end.html` (or comment out the script block) and remove the CSS block from `assets/sass/_custom.sass`.

## Future Enhancements (Optional)
- Home / End keys to jump to first/last result.
- Show snippet/preview and scroll active item into view if result list becomes scrollable.
- Support keyboard navigation on the dedicated search page variant.

## Accessibility Notes
- The results container gets `role=listbox` only after the first arrow key press (lazy enhancement, prevents role on empty list).
- Each result gets `role=option` and `tabindex=-1` so programmatic focus is valid while keeping normal tab order clean.

## Tested Edge Cases
- No results: Arrow keys do nothing.
- One result: Arrow keys keep it selected without errors.
- Escape after selection clears highlight but does not interfere with theme’s clear.

Feel free to extend this logic; the injection isolation means theme updates are safe.
