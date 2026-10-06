---
name: spx-controller-api
description: >-
  Use this skill when developing, debugging, or extending SPX Graphics Controller integrations,
  SPX REST API v1 calls (play, stop, update, rundown sync), template JSON payload structures,
  or broadcast overlay graphics management in CG-Front.
---

# SPX Playout Controller & REST API v1 Skill

This skill provides operational procedures, payload rules, and API conventions for interacting with the SPX Graphics Controller and CasparCG/Web overlay layers.

---

## 1. Core Architecture & Endpoints

SPX Graphics Controller exposes a REST API at `/api/v1`. `CG-Front` communicates through:
1. **Direct client fetch** via `SPXClient` (`js/api.js`) to `http://<host>:5656/api/v1`.
2. **Reverse Proxy fallback** on Node.js Express server (`/spx-api/v1/*` in `server.js`) to mitigate CORS or direct network routing issues between client and SPX.

### Key SPX Endpoints

| Action | Endpoint | Method | Key Params / Body |
| :--- | :--- | :--- | :--- |
| **Play Item** | `/api/v1/item/play` | `POST` | `{ "project": "...", "rundown": "...", "itemID": "..." }` |
| **Stop Item** | `/api/v1/item/stop` | `POST` | `{ "project": "...", "rundown": "...", "itemID": "..." }` |
| **Continue / Next** | `/api/v1/item/continue` | `POST` | `{ "project": "...", "rundown": "...", "itemID": "..." }` |
| **Update Item Data** | `/api/v1/item/update` | `POST` | `{ "project": "...", "rundown": "...", "itemID": "...", "data": {...} }` |
| **Get Server Info** | `/api/v1/info` | `GET` | Returns version, uptime, and active profile |
| **Get Rundown List** | `/api/v1/rundowns` | `GET` | List available rundowns in active project |
| **Get Rundown Items** | `/api/v1/rundown/items` | `GET` | Query params: `project`, `rundown` |

---

## 2. Playout & Active Item Contract

When an operator clicks **PLAY ON-AIR** in CG-Front:
1. **Set Active Item in Local Backend**:
   - Send `POST /api/active-item` with `{ itemID: "<id>" }` to tell `server.js` which item template is currently broadcasting.
   - Files like `New-bar4.html` query `GET /mainbar` (or `GET /api/active-item`) to render dynamic graphic layers.
2. **Dispatch SPX Item Command**:
   - Call `SPXClient.playItem(project, rundown, itemID)`.
   - Update `Store.state.activeOnAirItem` and layer state flags (`layerStates[layer] = 'playing'`).
3. **Handle Stop / Abort**:
   - Call `SPXClient.stopItem(...)` or `stopAllLayers()`.
   - Clear `activeOnAirItem` in the store and update UI badges to `IDLE`.

---

## 3. Template Payload Specifications

Templates (e.g. `mainbar`, `bar2line`, `bar2name`, `logo`) expect consistent fields:

```json
{
  "head": "หัวข้อข่าว / สถานการณ์เด่น",
  "topic": "ข้อความพาดหัวหลักที่จะแสดงผลบนแถบ",
  "mainbar": "./assets/bar/MAIN BAR.png",
  "headbar": "./assets/head/top-bar-1.png",
  "logo": "./assets/logo/NewsAlert.png"
}
```

### Critical Rules
- **Optional Head / Headbar**: If `head` or `headbar` is empty string (`""`), templates must gracefully omit the top bar without layout breakages or missing image borders.
- **Dynamic Assets**: Asset paths must match relative paths available in `server.js` static directories (`./assets/bar/`, `./assets/head/`, `./assets/logo/`).
- **Data Sanitization**: Trim leading/trailing whitespace before broadcasting. Escape HTML when rendering preview cards to avoid XSS.

---

## 4. Troubleshooting Playout Errors

1. **SPX Connection Refused (ECONNREFUSED / 500)**:
   - Check if SPX Controller is running on port 5656 (`http://localhost:5656`).
   - Confirm API Key in `Settings` matches SPX settings (`config.json` -> `spxApiKey`).
   - Check fallback proxy in `server.js`: `/spx-api/v1/*`.
2. **Missing Graphic on Screen**:
   - Check CasparCG / Browser Source URL (`http://<server-ip>:8080/mainbar`).
   - Check `data/rundown.json` and active item mapping in `server.js`.
