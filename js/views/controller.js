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

    this.isLogoOnAir = false;
    this.render();
    this.subscribeStore();
  }

  subscribeStore() {
    this.store.subscribe('items', (items) => this.renderPlaylist(items));
    this.store.subscribe('activeOnAirItem', () => this.renderPlaylist(this.store.getState().items));
    this.store.subscribe('config', (config) => this.populateLogoSelect(config));
  }

  render() {
    const { items, config } = this.store.getState();

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

          <!-- Dedicated CG Logo Control Section -->
          <div class="card p-3">
            <div class="flex-between mb-2">
              <h4 class="fs-sm text-secondary mb-0 fw-700">ส่วนควบคุม CG Logo</h4>
              <span class="badge badge-neutral" id="ctrl-logo-status-pill">OFF-AIR</span>
            </div>
            
            <div class="form-group mb-3">
              <label class="form-label fs-xs" for="ctrl-logo-select">เลือกรูปภาพ Logo (จาก ./assets/logo)</label>
              <select class="form-control form-control-sm" id="ctrl-logo-select">
                <!-- Populated dynamically -->
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button class="btn btn-sm btn-play" id="btn-play-logo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                PLAY LOGO
              </button>
              <button class="btn btn-sm btn-stop" id="btn-stop-logo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12"></rect></svg>
                STOP LOGO
              </button>
            </div>
          </div>
        </aside>
      </div>
    `;

    // Bind Main Controls
    document.getElementById('btn-big-play').addEventListener('click', () => this.triggerPlay());
    document.getElementById('btn-big-next').addEventListener('click', () => this.triggerNext());
    document.getElementById('btn-big-stop').addEventListener('click', () => this.triggerStop());

    // Bind Logo Controls
    document.getElementById('btn-play-logo').addEventListener('click', () => this.triggerPlayLogo());
    document.getElementById('btn-stop-logo').addEventListener('click', () => this.triggerStopLogo());

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

    this.populateLogoSelect(config);
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

  populateLogoSelect(config) {
    const logoSelect = document.getElementById('ctrl-logo-select');
    if (!logoSelect) return;
    const currentVal = logoSelect.value;
    logoSelect.innerHTML = '';

    const options = (config && config.logoOptions && Array.isArray(config.logoOptions) && config.logoOptions.length > 0)
      ? config.logoOptions
      : [{ label: 'LOGO คมชัดลึก 2026.png', value: './assets/logo/LOGO คมชัดลึก 2026.png' }];

    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label || optData.value;
      logoSelect.appendChild(opt);
    });

    if (currentVal && Array.from(logoSelect.options).some(o => o.value === currentVal)) {
      logoSelect.value = currentVal;
    }
  }

  async triggerPlayLogo() {
    const logoSelect = document.getElementById('ctrl-logo-select');
    const selectedLogo = logoSelect ? logoSelect.value : '';
    if (!selectedLogo) {
      this.showToast('กรุณาเลือกไฟล์ Logo ก่อนสั่งเล่น', 'warning');
      return;
    }

    const logoItem = {
      itemID: 'logo',
      logo: selectedLogo,
      head: 'LOGO CG',
      topic: `Logo: ${selectedLogo.split('/').pop()}`,
      relpath: 'Example/New-bar4.html',
      webplayout: '1',
      out: 'manual'
    };

    try {
      await this.api.setActiveItem(logoItem);
      await this.api.playItem('logo');
      await this.api.directPlayout({
        command: 'play',
        relativeTemplatePath: logoItem.relpath,
        webplayoutLayer: '1',
        out: 'manual',
        DataFields: [{ field: 'logo', value: selectedLogo }]
      }).catch(() => null);

      this.isLogoOnAir = true;
      this.updateLogoUI();
      this.showToast(`▶ PLAY LOGO: ${selectedLogo.split('/').pop()}`, 'success');
    } catch (err) {
      this.showToast(`เล่น Logo ล้มเหลว: ${err.message}`, 'danger');
    }
  }

  async triggerStopLogo() {
    try {
      await this.api.stopItem('logo');
      await this.api.directPlayout({
        command: 'stop',
        webplayoutLayer: '1'
      }).catch(() => null);

      this.isLogoOnAir = false;
      this.updateLogoUI();
      this.showToast(`⏹ STOP LOGO: หยุดแสดงผล Logo`, 'info');
    } catch (err) {
      this.showToast(`Stop Logo ล้มเหลว: ${err.message}`, 'danger');
    }
  }

  updateLogoUI() {
    const logoPill = document.getElementById('ctrl-logo-status-pill');
    if (!logoPill) return;

    if (this.isLogoOnAir) {
      logoPill.className = 'badge badge-success';
      logoPill.textContent = '● ON-AIR';
    } else {
      logoPill.className = 'badge badge-neutral';
      logoPill.textContent = 'OFF-AIR';
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
      const itemID = selectedItem.itemID || 'mainbar';
      let detailsHtml = `<div><strong>itemID:</strong> <code>${selectedItem.itemID}</code></div>`;

      if (itemID === 'logo') {
        detailsHtml += `<div><strong>Logo:</strong> <code>${selectedItem.logo || '-'}</code></div>`;
      } else if (itemID === 'bar2line') {
        detailsHtml += `
          <div><strong>Head:</strong> ${selectedItem.head || '-'}</div>
          <div><strong>Line 1:</strong> ${selectedItem.line1 || '-'}</div>
          <div><strong>Line 2:</strong> ${selectedItem.line2 || '-'}</div>
          <div><strong>Mainbar:</strong> <code>${selectedItem.mainbar || '-'}</code></div>
          <div><strong>Headbar:</strong> <code>${selectedItem.headbar || 'none'}</code></div>
        `;
      } else if (itemID === 'bar2name') {
        detailsHtml += `
          <div><strong>Head:</strong> ${selectedItem.head || '-'}</div>
          <div><strong>Name Left:</strong> ${selectedItem.name1 || '-'}</div>
          <div><strong>Name Right:</strong> ${selectedItem.name2 || '-'}</div>
          <div><strong>Position:</strong> ${selectedItem.line2 || '-'}</div>
          <div><strong>Mainbar:</strong> <code>${selectedItem.mainbar || '-'}</code></div>
          <div><strong>Headbar:</strong> <code>${selectedItem.headbar || 'none'}</code></div>
        `;
      } else {
        detailsHtml += `
          <div><strong>Head:</strong> ${selectedItem.head || '-'}</div>
          <div><strong>Topic:</strong> ${selectedItem.topic || '-'}</div>
          <div><strong>Mainbar:</strong> <code>${selectedItem.mainbar || '-'}</code></div>
          <div><strong>Headbar:</strong> <code>${selectedItem.headbar || 'none'}</code></div>
        `;
      }

      detailsContainer.innerHTML = detailsHtml;
    }

    container.innerHTML = '';
    let draggedIndex = null;

    items.forEach((item, idx) => {
      const isSelected = idx === this.selectedItemIndex;
      const isOnAir = activeOnAirItem && (activeOnAirItem.itemID === item.itemID && activeOnAirItem.topic === item.topic && activeOnAirItem.head === item.head);

      const el = document.createElement('div');
      el.className = `playlist-item ${isSelected ? 'selected' : ''} ${isOnAir ? 'onair' : ''}`;
      el.setAttribute('draggable', 'true');

      const itemID = item.itemID || 'mainbar';
      let headDisplay = item.head || '';
      let topicDisplay = item.topic || '';
      if (itemID === 'logo') {
        headDisplay = item.head ? `${item.head} (Logo)` : 'Logo CG';
        topicDisplay = `Logo: ${item.logo || '-'}`;
      } else if (itemID === 'bar2line') {
        headDisplay = item.head ? `${item.head} (บาร์ 2 บรรทัด)` : 'บาร์ 2 บรรทัด';
        topicDisplay = `L1: ${item.line1 || '-'} | L2: ${item.line2 || '-'}`;
      } else if (itemID === 'bar2name') {
        headDisplay = item.head ? `${item.head} (บาร์พิธีกร 2 คน)` : 'บาร์พิธีกร 2 คน';
        topicDisplay = `พิธีกร: ${item.name1 || '-'} & ${item.name2 || '-'} (${item.line2 || '-'})`;
      }

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
            <div class="fw-700 text-primary">${headDisplay}</div>
            <div class="fs-xs text-secondary">${topicDisplay}</div>
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
