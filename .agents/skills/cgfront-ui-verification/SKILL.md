---
name: cgfront-ui-verification
description: >-
  Use this skill when verifying UI components, testing user flows, checking broadcast controls
  (Play, Next, Stop), testing drag-and-drop reordering, or validating auto-save and asset scanning in CG-Front.
---

# CG-Front UI & Broadcast Playout Verification Checklist

This skill provides step-by-step verification checklists for manual and automated validation of the CG-Front broadcast controller web app.

---

## 1. Pre-flight & Server Verification

Before testing frontend interactions:
1. Verify the Node server is running without errors:
   ```bash
   node server.js
   ```
   (Default port: `http://localhost:8080`)
2. Confirm API health:
   - Check `http://localhost:8080/api/config` returns valid JSON with `itemTypes`, `mainbarOptions`, `headbarOptions`, and `logoOptions`.
   - Check `http://localhost:8080/api/items` returns the array of rundown items.

---

## 2. Core UI Workspaces Checklist

### A. Main Rundown View (`#view-main-rundown`)
- [ ] Displays all rundown cards loaded from `data/rundown.json`.
- [ ] Shows active ON-AIR banner/indicator on the card currently broadcasting.
- [ ] Summary cards reflect correct total counts and item types.

### B. Rundown Builder View (`#view-builder`)
- [ ] **Add Item**: Clicking "Add Item" opens the editor modal with empty or default fields.
- [ ] **Edit Item**: Clicking "Edit" populates all fields accurately (Topic, Head, Headbar, Mainbar, Logo).
- [ ] **Clone Item**: Duplicate creates an exact copy with a newly generated unique ID.
- [ ] **Delete Item**: Prompts confirmation and removes the item from the list.
- [ ] **Drag & Drop Reordering**:
  - Grabbing the grip icon and dropping moves the item cleanly to the new position.
  - New order immediately updates `store.state.items`.
  - Auto-save indicator shows `saving...` and transitions to `saved`.
- [ ] **Export / Import**:
  - Export downloads a valid `.json` file containing all items.
  - Import parses and populates the rundown correctly.

### C. Control Desk View (`#view-controller`)
- [ ] **Queue Selection**: Clicking a card selects it as the "Active Cue".
- [ ] **Payload Preview**: The JSON and visual preview dynamically update to show the selected item's data.
- [ ] **PLAY ON-AIR**:
  - Triggers `POST /api/active-item` with the item's ID.
  - Sends play command to SPX.
  - Card badge changes to bright red `ON-AIR`.
  - `/mainbar` endpoint updates to return the active item's payload.
- [ ] **NEXT / STEP**: Advances cue to the subsequent item in the rundown.
- [ ] **STOP**: Sends stop command to SPX and clears ON-AIR state (`IDLE`).

### D. Settings View (`#view-settings`)
- [ ] Allows editing SPX API URL (default: `http://localhost:5656/api/v1`) and API Key.
- [ ] Connection test button validates reachability and shows green badge if server is online.

---

## 3. Data Integrity & Edge Cases

- [ ] **Blank Head & Headbar**: An item with empty string `head` and empty string `headbar` should not cause runtime errors or broken `<img>` tags.
- [ ] **Thai Unicode Characters**: Topic and Head text in Thai (e.g. `ประเด็นร้อน`, `สัมภาษณ์ทางโทรศัพท์`) render with correct encoding without truncation or garbled characters.
- [ ] **Cross-Device Access**: When accessing from LAN IP (e.g. `http://192.168.1.50:8080`), `js/api.js` automatically routes calls to the server host rather than failing on `localhost`.
- [ ] **Disk Persistence**: Reloading the browser preserves newly added items and modified ordering from `data/rundown.json`.
