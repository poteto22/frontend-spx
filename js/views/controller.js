/**
 * VIEW 3: Rundown Controller Desk (หน้าจอควบคุม Rundown)
 */
export class ControllerView {
  constructor(container, api, store, showToast) {
    this.container = container;
    this.api = api;
    this.store = store;
    this.showToast = showToast;
    this.selectedItemIndex = 0;

    this.render();
    this.subscribeStore();
  }

  subscribeStore() {
    this.store.subscribe('items', (items) => this.renderPlaylist(items));
    this.store.subscribe('activeOnAirItem', () => this.renderPlaylist(this.store.getState().items));
  }

  render() {
    const { items } = this.store.getState();

    this.container.innerHTML = `
      <div class="controller-desk">
        <!-- Main Desk Controls -->
        <div class="main-controller-panel">
          <div class="card p-3">
            <div class="flex-between mb-2">
              <span class="fs-xs fw-700 text-muted uppercase">แผงควบคุมการออกอากาศหลัก (Main Broadcast Control Desk)</span>
              <span class="badge badge-info" id="ctrl-selected-id">Selected: Item #1</span>
            </div>

            <!-- Big Playout Action Buttons -->
            <div class="big-control-buttons">
              <button class="btn-control-big btn-control-play" id="btn-big-play">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>PLAY ON-AIR</span>
              </button>
              
              <button class="btn-control-big btn-control-next" id="btn-big-next">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="5 4 15 12 5 20 5 4"></polygon>
                  <line x1="19" y1="5" x2="19" y2="19"></line>
                </svg>
                <span>NEXT / STEP</span>
              </button>

              <button class="btn-control-big btn-control-stop" id="btn-big-stop">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="6" y="6" width="12" height="12"></rect>
                </svg>
                <span>STOP</span>
              </button>
            </div>
          </div>

          <!-- Focus Navigation & Playlist -->
          <div class="playlist-container">
            <div class="flex-between mb-2 pb-2 border-b">
              <span class="fw-700 fs-sm">คิวรายการ Rundown (Playlist Queue)</span>
              <div class="flex-center gap-1">
                <button class="btn btn-xs btn-outline" id="btn-focus-first">⏮ First</button>
                <button class="btn btn-xs btn-outline" id="btn-focus-prev">◀ Prev</button>
                <button class="btn btn-xs btn-outline" id="btn-focus-next">Next ▶</button>
                <button class="btn btn-xs btn-outline" id="btn-focus-last">Last ⏭</button>
              </div>
            </div>

            <div id="ctrl-playlist-items" class="flex flex-col gap-2">
              <!-- Playlist items -->
            </div>
          </div>
        </div>

        <!-- Side Monitor Panel -->
        <aside class="side-monitor-panel">
          <div class="card p-3">
            <h4 class="fs-sm mb-2 text-secondary">ข้อมูลรายการที่เลือกอยู่ (Selected Data)</h4>
            <div id="ctrl-item-details" class="fs-xs flex flex-col gap-2">
              <!-- Details -->
            </div>
          </div>

          <div class="card p-3">
            <h4 class="fs-sm mb-2 text-secondary">JSON Payload Preview</h4>
            <pre class="json-preview-box" id="ctrl-json-preview">{}</pre>
          </div>
        </aside>
      </div>
    `;

    // Bind Controls
    document.getElementById('btn-big-play').addEventListener('click', () => this.triggerPlay());
    document.getElementById('btn-big-next').addEventListener('click', () => this.triggerNext());
    document.getElementById('btn-big-stop').addEventListener('click', () => this.triggerStop());

    document.getElementById('btn-focus-first').addEventListener('click', () => this.selectIndex(0));
    document.getElementById('btn-focus-prev').addEventListener('click', () => this.selectIndex(Math.max(0, this.selectedItemIndex - 1)));
    document.getElementById('btn-focus-next').addEventListener('click', () => {
      const items = this.store.getState().items;
      this.selectIndex(Math.min(items.length - 1, this.selectedItemIndex + 1));
    });
    document.getElementById('btn-focus-last').addEventListener('click', () => {
      const items = this.store.getState().items;
      this.selectIndex(items.length - 1);
    });

    this.renderPlaylist(items);
  }

  selectIndex(index) {
    const items = this.store.getState().items;
    if (index >= 0 && index < items.length) {
      this.selectedItemIndex = index;
      this.renderPlaylist(items);
    }
  }

  async triggerPlay() {
    const items = this.store.getState().items;
    if (items.length === 0) return;
    const item = items[this.selectedItemIndex] || items[0];

    try {
      // 1. Set specific item data as active on backend server
      await this.api.setActiveItem(item);

      // 2. Trigger SPX item play
      await this.api.playItem(item.itemID);
      
      // 3. Direct Playout fallback trigger
      await this.api.directPlayout({
        command: 'play',
        relativeTemplatePath: item.relpath,
        webplayoutLayer: item.webplayout || '1',
        out: item.out || 'manual',
        DataFields: item.DataFields || [
          { field: 'f0', value: item.head },
          { field: 'f1', value: item.topic },
          { field: 'mainbar', value: item.mainbar },
          { field: 'headbar', value: item.headbar }
        ]
      }).catch(() => null);

      this.store.setState({ activeOnAirItem: item });
      this.showToast(`▶ PLAY: ${item.head}`, 'success');
    } catch (err) {
      this.showToast(`สั่งเล่นล้มเหลว: ${err.message}`, 'danger');
    }
  }

  async triggerNext() {
    const activeItem = this.store.getState().activeOnAirItem;
    const itemID = activeItem ? activeItem.itemID : 'mainbar';
    try {
      await this.api.continueItem(itemID);
      this.showToast(`⏭ STEP / NEXT ส่งสำเร็จ`, 'warning');
    } catch (err) {
      this.showToast(`Next ล้มเหลว: ${err.message}`, 'danger');
    }
  }

  async triggerStop() {
    const activeItem = this.store.getState().activeOnAirItem;
    const itemID = activeItem ? activeItem.itemID : 'mainbar';
    try {
      await this.api.stopItem(itemID);
      this.store.setState({ activeOnAirItem: null });
      this.showToast(`⏹ STOP: หยุดแสดงผลกราฟิก`, 'info');
    } catch (err) {
      this.showToast(`Stop ล้มเหลว: ${err.message}`, 'danger');
    }
  }

  renderPlaylist(items) {
    const container = document.getElementById('ctrl-playlist-items');
    const detailsContainer = document.getElementById('ctrl-item-details');
    const jsonPreview = document.getElementById('ctrl-json-preview');
    const selectedBadge = document.getElementById('ctrl-selected-id');

    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="text-muted p-3">ไม่มีรายการในคิว</div>';
      return;
    }

    if (this.selectedItemIndex >= items.length) {
      this.selectedItemIndex = 0;
    }

    const selectedItem = items[this.selectedItemIndex];
    const activeOnAirItem = this.store.getState().activeOnAirItem;

    if (selectedBadge) {
      selectedBadge.textContent = selectedItem ? `Selected: #${this.selectedItemIndex + 1} (${selectedItem.itemID})` : 'None';
    }

    if (selectedItem && detailsContainer) {
      detailsContainer.innerHTML = `
        <div><strong>itemID:</strong> <code>${selectedItem.itemID}</code></div>
        <div><strong>Head:</strong> ${selectedItem.head}</div>
        <div><strong>Topic:</strong> ${selectedItem.topic}</div>
        <div><strong>Mainbar:</strong> <code>${selectedItem.mainbar}</code></div>
        <div><strong>Headbar:</strong> <code>${selectedItem.headbar}</code></div>
      `;

      if (jsonPreview) {
        jsonPreview.textContent = JSON.stringify({
          head: selectedItem.head,
          topic: selectedItem.topic,
          mainbar: selectedItem.mainbar,
          headbar: selectedItem.headbar
        }, null, 2);
      }
    }

    container.innerHTML = '';
    let draggedIndex = null;

    items.forEach((item, idx) => {
      const isSelected = idx === this.selectedItemIndex;
      const isOnAir = activeOnAirItem && (activeOnAirItem.head === item.head && activeOnAirItem.topic === item.topic);

      const el = document.createElement('div');
      el.className = `playlist-item ${isSelected ? 'selected' : ''} ${isOnAir ? 'onair' : ''}`;
      el.setAttribute('draggable', 'true');

      el.innerHTML = `
        <div class="flex-center gap-2">
          <div class="drag-handle" title="ลากเพื่อเปลี่ยนลำดับ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="5" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle>
              <circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle>
              <circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
            </svg>
          </div>
          <span class="fw-700 text-muted font-mono">#${idx + 1}</span>
          <div>
            <div class="fw-700 text-primary">${item.head || '(ไม่มีหัวเรื่อง)'}</div>
            <div class="fs-xs text-secondary">${item.topic}</div>
          </div>
        </div>
        <div class="flex-center gap-2">
          <span class="badge ${isOnAir ? 'badge-success' : (isSelected ? 'badge-info' : 'badge-neutral')}">
            ${isOnAir ? 'ON-AIR' : (isSelected ? 'SELECTED' : 'IDLE')}
          </span>
        </div>
      `;

      // Selection on click
      el.addEventListener('click', () => {
        this.selectedItemIndex = idx;
        this.renderPlaylist(items);
      });

      // Drag and Drop Events
      el.addEventListener('dragstart', (e) => {
        draggedIndex = idx;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', idx.toString());
      });

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-over');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over');
      });

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const fromIndex = draggedIndex !== null ? draggedIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = idx;

        if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== toIndex) {
          this.store.moveItem(fromIndex, toIndex);
          this.selectedItemIndex = toIndex;
          this.showToast(`เปลี่ยนลำดับรายการ #${fromIndex + 1} ➔ #${toIndex + 1}`, 'info');
        }
      });

      el.addEventListener('dragend', () => {
        draggedIndex = null;
        container.querySelectorAll('.playlist-item').forEach((itemEl) => {
          itemEl.classList.remove('dragging', 'drag-over');
        });
      });

      container.appendChild(el);
    });
  }
}
