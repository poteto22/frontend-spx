---
name: cgfront-architecture
description: >-
  Use this skill when modifying, refactoring, or adding features to CG-Front's frontend
  architecture (Vanilla JS Store, pub/sub, views, components) or Express backend server (server.js).
---

# CG-Front Architecture & State Management Skill

This skill documents architectural patterns, coding guidelines, and directory conventions for `CG-Front`.

---

## 1. System Architecture Overview

`CG-Front` is built without heavy UI frameworks (no React/Vue/Angular), using clean Vanilla JavaScript ES Modules on the frontend and an Express server on Node.js:

```text
CG-Front/
├── server.js               # Node.js backend: REST API, static files, SPX proxy, asset scanner
├── data/
│   ├── config.json         # Dropdown options, preset heads, SPX endpoint config
│   └── rundown.json        # Persisted rundown items and metadata
├── assets/                 # Broadcast graphic assets (bar/, head/, logo/)
├── css/
│   ├── main.css            # Base styles, variables, typography, layout
│   └── components.css      # Card, badge, button, modal, drag-and-drop styles
└── js/
    ├── app.js              # Application entrypoint & view router initialization
    ├── store.js            # Centralized Store (state, pub/sub, auto-save)
    ├── api.js              # SPX Client and backend API abstraction
    ├── views/
    │   ├── mainRundown.js  # Dashboard & active ON-AIR rundown summary
    │   ├── builder.js      # Rundown editor (add, edit, clone, delete, reorder)
    │   ├── controller.js   # Main broadcast control desk (play, next, stop, preview)
    │   └── settings.js     # SPX server IP, port, API key configuration
    └── components/
        ├── editor.js       # Item edit modal/form
        └── preview.js      # JSON & graphic preview panel
```

---

## 2. Central State Management (`js/store.js`)

State is handled through an observable **Store** singleton with pub/sub event emitters:

### Subscribing to State Changes
```javascript
store.subscribe('itemsChanged', (items) => {
  renderItemList(items);
});

store.subscribe('activeOnAirChanged', (activeItem) => {
  updateOnAirBadges(activeItem);
});
```

### Modifying State & Auto-Save
1. All mutations to `items` must pass through `store.setItems(...)`, `store.addItem(...)`, or `store.updateItem(...)`.
2. Any data mutation schedules a **debounced auto-save** (default 500ms):
   - Sends `POST /api/items` with payload `{ items: [...] }`.
   - The backend immediately writes to `data/rundown.json`.
   - UI status badge updates from `saving...` to `saved`.

---

## 3. View Lifecycle & Separation of Concerns

Each view in `js/views/` must export an initializer or class implementing:
- `mount()` or `init(container, store)`: Bind event listeners, register subscriptions.
- `render()`: Generate or update DOM elements cleanly.
- `destroy()` or unbind handlers if views are dynamically mounted/unmounted.

### Guidelines:
- **No Direct DOM Mutations Across Views**: Do not query or alter elements belonging to another view directly. Emit an event through `store` or update shared state.
- **Escape User Content**: When rendering text fields (e.g. `item.topic`, `item.head`) in HTML templates, sanitize with `escapeHtml()` or use `textContent` to prevent DOM XSS.

---

## 4. Backend Server Endpoints (`server.js`)

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/config` | Returns merged config from `data/config.json` + scanned files in `./assets/` |
| `POST` | `/api/config` | Updates `data/config.json` |
| `GET` | `/api/items` | Reads `data/rundown.json` |
| `POST` | `/api/items` | Saves `data/rundown.json` with atomicity |
| `POST` | `/api/active-item` | Sets current on-air item ID and cache |
| `GET` | `/mainbar` | Outputs JSON formatted for graphic templates (`New-bar4.html`) |
| `ALL` | `/spx-api/v1/*` | Proxy forwarder to SPX Graphics Controller |

---

## 5. Adding New Graphic Types or Fields

When adding a new graphic item type (e.g. `breaking-news` or `ticker`):
1. Add option to `config.itemTypes` in `data/config.json`.
2. Update the form fields in `js/components/editor.js`.
3. Support payload rendering in `js/views/controller.js` and `js/components/preview.js`.
4. Ensure `server.js` route `/mainbar` (or template endpoint) returns the required JSON structure.
