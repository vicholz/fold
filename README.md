# Fold

A vanilla HTML, CSS, and JavaScript designer for **bi-fold hanging paper calendars**.

Each month is one sheet: a photo on the top half, a calendar grid on the bottom, a crease in the middle, and an optional hanging-hole mark at the top. Design in the browser, then print or save a PDF at a real page size (Tabloid 11×17 in by default).

No build step, no framework, no backend.

## Run it

Serve the folder and open it in a browser:

```bash
python3 -m http.server 8765 --directory .
```

Then visit [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

Opening `index.html` directly also works (classic scripts, not ES modules). A local server is still the more reliable option for fonts and file uploads.

## What you can do

### Month photo (top half)

- Upload an image (or drop it on the photo panel)
- Drag to reposition, scroll or use the scale slider to zoom
- Opacity
- Crop (bakes a tighter frame from the original)
- Reset position or remove

The frame clips the image, so pan/zoom is how you compose the print crop.

### Calendar background (bottom half)

Same framing tools for an optional image behind the month grid. Grid ink colors (title, dates, weekends, weekday labels, lines) can be changed so the dates stay readable on a busy photo.

### Overlays

Top and bottom panels each have an overlay layer:

- Optional full-panel color wash and/or background image, with separate opacities
- Text boxes that can be added, dragged, resized, formatted, and deleted

Each text box can also have its own background color or image with opacity, so you can sit a banner on the photo (for example along the fold) without washing out the whole panel.

Text formatting: font, size, color, bold/italic/underline, alignment, letter spacing, and text opacity. Double-click a box to edit in place.

### Events

- Import a Google Calendar or Outlook `.ics` file (toolbar or the Events panel)
- Add events by hand
- Edit or remove events
- Click a day to filter the list; double-click a day to create an event there

Recurring ICS rules are expanded for the selected year (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, including `BYDAY` / `COUNT` / `UNTIL`). All-day events follow the usual exclusive `DTEND` rule.

### Print and PDF

**Print / PDF** in the toolbar:

- **Print** — current month or all 12, through the browser dialog. Set margins to **None** and turn off headers/footers.
- **Save PDF** — downloads a multi-page PDF with no printer chrome.

Page sizes:

| Size | Use |
| --- | --- |
| Tabloid 11×17 in | Typical US hanging wall calendar (default) |
| A3 297×420 mm | International equivalent |
| Letter 8.5×11 in | Smaller bi-fold for a home printer |

`@page` is set to the chosen size with **zero margin**. Print CSS hides the editor chrome, fold guide, and selection outlines so the sheet is edge to edge.

## Layout of a page

```
┌─────────────────────────────┐
│           ○ hole            │  top half: photo + overlay + text
│                             │
├──────────── fold ───────────┤
│     January 2026            │  bottom half: grid + optional bg
│  Su Mo Tu We Th Fr Sa       │
│                             │
└─────────────────────────────┘
```

The live preview is the real page (in CSS inches) scaled to fit the workspace. Print and PDF use the same layout at physical size.

## Saving work

- **Autosave** in IndexedDB (`fold-calendar`) so a refresh does not wipe the design
- **Save** / **Open** export and import a JSON project file (images stored as data URLs)

## Project layout

Vanilla files only. CSS and JS are split so one concern can change without dragging the rest with it.

```
index.html          App shell, toolbars, panels, dialogs
css/
  variables.css     Colors, type, spacing
  base.css          Reset and toasts
  layout.css        Workspace, rails, stage
  toolbar.css       Top bar
  controls.css      Buttons, fields, sliders
  calendar.css      Page, photo frame, grid
  overlays.css      Overlay washes and text boxes
  modals.css        Event, crop, export dialogs
  print.css         Borderless @page print
js/
  constants.js      Page sizes, fonts, default state
  utils.js          DOM helpers, image I/O, geometry
  state.js          AppState + IndexedDB ProjectStore
  ics-parser.js     ICS / VEVENT / RRULE
  event-store.js    Event CRUD and ICS import
  image-layer.js    Pan, zoom, drop, opacity
  overlay-layer.js  Overlay wash + movable text
  calendar-grid.js  Month grid and event chips
  page-view.js      Live page and print stamp
  crop-dialog.js    Source-image crop
  pdf-writer.js     Minimal PDF 1.4 (JPEG pages)
  canvas-renderer.js  Rasterize a month for PDF
  export.js         Print + Save PDF
  ui.js             Panel bindings
  app.js            Bootstrap
```

## Keyboard

- **Left / Right** — previous / next month
- **Delete / Backspace** — remove the selected text box (when not typing)

## Notes

- Photos are normalized to a 4000px long edge on upload so memory stays reasonable.
- The hanging hole is a screen guide; include a punch mark on print/PDF only if you check that option in the export dialog.
- Direct PDF is a JPEG-per-page PDF written in `pdf-writer.js` (no extra libraries). Print-to-PDF from the browser is the other path.
