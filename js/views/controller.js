/**
 * VIEW 3: Rundown Controller Desk (หน้าจอควบคุม Rundown)
 */

const STORAGE_KEY_SELECTED_LOGO = 'spx_selected_logo';
const STORAGE_KEY_ACTIVE_ONAIR = 'spx_active_onair_item';

export class ControllerView {
  constructor(container, api, store, editorDialog, showToast) {
    this.container = container;
    this.api = api;
    this.store = store;
    if (typeof editorDialog === 'function') {
      this.showToast = editorDialog;
      this.editorDialog = null;
    } else {
      this.editorDialog = editorDialog;
      this.showToast = showToast || (() => {});
    }
    this.selectedItemIndex = 0;

    this.isLogoOnAir = (() => {
      try { return localStorage.getItem('spx_logo_onair') === 'true'; } catch (e) { return false; }
    })();
    this.stopCooldownUntil = 0;
    this.logoStopCooldownUntil = 0;
    this.syncTimer = null;
    this.render();
    this.subscribeStore();
    this.initStateSync();
  }

  subscribeStore() {
    this.store.subscribe('items', () => this.renderPlaylist());
    this.store.subscribe('blocks', () => this.renderPlaylist());
    this.store.subscribe('activeOnAirItem', (item) => {
      if (!item) {
        this.stopCooldownUntil = Date.now() + 4000;
        try {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_ONAIR);
        } catch (e) {}
      } else {
        this.stopCooldownUntil = 0;
      }
      this.updateMainControlUI();
      this.renderPlaylist();
    });
    this.store.subscribe('stopAllTriggeredAt', () => {
      this.stopCooldownUntil = Date.now() + 4000;
      this.logoStopCooldownUntil = Date.now() + 4000;
      this.isLogoOnAir = false;
      try { localStorage.setItem('spx_logo_onair', 'false'); } catch (e) {}
      this.updateLogoUI();
      this.updateMainControlUI();
      this.renderPlaylist();
    });
    this.store.subscribe('spxLoadedRundown', () => this.updateMainControlUI());
    this.store.subscribe('config', (config) => this.populateLogoSelect(config));
  }

  render() {
    const { items, config } = this.store.getState();

    this.container.innerHTML = `
      <div class="controller-desk">
        <!-- Main Desk Controls -->
        <div class="main-controller-panel">
          <div class="card p-3 ctrl-desk-card">
            <div class="flex-between mb-2">
              <div class="flex-center gap-2">
                <span class="fs-xs fw-700 text-muted uppercase">แผงควบคุมการออกอากาศหลัก (Main Broadcast Control Desk)</span>
                <span class="badge badge-primary font-mono fs-xs" id="ctrl-rundown-badge">Rundown: Inside_Thailand/Live</span>
              </div>
              <span class="badge badge-info" id="ctrl-selected-id">Selected: Item #1</span>
            </div>

            <!-- Active ON-AIR Topic Preview Banner (Displays ONLY the item currently on-air) -->
            <div class="ctrl-active-topic-banner" id="ctrl-active-topic-banner">
              <div class="ctrl-banner-header">
                <span class="ctrl-banner-label" id="ctrl-banner-status-label">สถานะกราฟิก (STATUS):</span>
                <span class="ctrl-banner-head" id="ctrl-banner-head-text"></span>
              </div>
              <div class="ctrl-banner-topic" id="ctrl-banner-topic-text">ไม่มีรายการกำลังออกอากาศ (OFF-AIR)</div>
            </div>

            <!-- Big Playout Action Buttons (Combined Play/Stop & Next) -->
            <div class="big-control-buttons">
              <button class="btn-control-big btn-control-play" id="btn-big-play-toggle">
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
            </div>
          </div>

          <!-- Focus Navigation & Playlist -->
          <div class="playlist-container">
            <div class="flex-between mb-2 pb-2 border-b playlist-header">
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
          <div class="card p-3 ctrl-side-card">
            <h4 class="fs-sm mb-2 text-secondary">ข้อมูลรายการที่เลือกอยู่ (Selected Data)</h4>
            <div id="ctrl-item-details" class="fs-xs flex flex-col gap-2">
              <!-- Details -->
            </div>
          </div>

          <!-- Dedicated CG Logo Control Section -->
          <div class="card p-3 ctrl-side-card ctrl-logo-card">
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

            <div>
              <button class="btn btn-sm btn-play w-full flex-center gap-2" id="btn-toggle-logo" style="width: 100%; height: 38px; font-weight: 700;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>PLAY LOGO</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    `;

    // Bind Main Playout Controls
    const btnPlayToggle = document.getElementById('btn-big-play-toggle');
    if (btnPlayToggle) {
      btnPlayToggle.addEventListener('click', () => this.triggerTogglePlay());
    }
    const btnNext = document.getElementById('btn-big-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => this.triggerNext());
    }

    // Bind Logo Controls
    const btnToggleLogo = document.getElementById('btn-toggle-logo');
    if (btnToggleLogo) {
      btnToggleLogo.addEventListener('click', () => this.triggerToggleLogo());
    }

    const logoSelect = document.getElementById('ctrl-logo-select');
    if (logoSelect) {
      logoSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          localStorage.setItem(STORAGE_KEY_SELECTED_LOGO, e.target.value);
        }
      });
    }

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
    this.updateLogoUI();
    this.updateMainControlUI();
    this.renderPlaylist(items);
  }

  selectIndex(index, scrollIntoView = true) {
    const items = this.store.getState().items;
    if (index >= 0 && index < items.length) {
      this.selectedItemIndex = index;
      this.renderPlaylist(items);
      if (scrollIntoView) {
        requestAnimationFrame(() => {
          const el = document.querySelector(`.playlist-item[data-index="${index}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    }
  }

  async triggerPlay() {
    this.stopCooldownUntil = 0;
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
        out: item.out || 'manual',
        DataFields: item.DataFields || [
          { field: 'f0', value: item.head },
          { field: 'f1', value: item.topic },
          { field: 'mainbar', value: item.mainbar },
          { field: 'headbar', value: item.headbar }
        ]
      }).catch(() => null);

      const activeItemData = { ...item, _currentStep: 1 };
      this.store.setState({ activeOnAirItem: activeItemData });
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_ONAIR, JSON.stringify(activeItemData));
      } catch (e) {}

      this.updateMainControlUI();
      this.renderPlaylist();
      this.showToast(`▶ PLAY ON-AIR: ${item.head || item.topic}`, 'success');
    } catch (err) {
      this.showToast(`สั่งเล่นล้มเหลว: ${err.message}`, 'danger');
    }
  }

  populateLogoSelect(config) {
    const logoSelect = document.getElementById('ctrl-logo-select');
    if (!logoSelect) return;
    const savedVal = localStorage.getItem(STORAGE_KEY_SELECTED_LOGO);

    let options = (config && config.logoOptions && Array.isArray(config.logoOptions) && config.logoOptions.length > 0)
      ? config.logoOptions
      : [];

    if (options.length === 0) {
      const storeConfig = this.store.getState().config;
      if (storeConfig && storeConfig.logoOptions && storeConfig.logoOptions.length > 0) {
        options = storeConfig.logoOptions;
      }
    }

    logoSelect.innerHTML = '';

    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label || optData.value;
      logoSelect.appendChild(opt);
    });

    if (savedVal) {
      const hasSavedOption = Array.from(logoSelect.options).some(o => o.value === savedVal);
      if (hasSavedOption) {
        logoSelect.value = savedVal;
      } else if (options.length === 0) {
        // Options haven't loaded yet from server, keep placeholder so selection is preserved
        const tempOpt = document.createElement('option');
        tempOpt.value = savedVal;
        tempOpt.textContent = savedVal.split('/').pop();
        tempOpt.selected = true;
        logoSelect.appendChild(tempOpt);
      }
    } else if (logoSelect.options.length > 0) {
      logoSelect.selectedIndex = 0;
      localStorage.setItem(STORAGE_KEY_SELECTED_LOGO, logoSelect.value);
    }
  }

  checkIsLogoOnAir(layerData) {
    if (!layerData) return false;
    let templates = [];
    if (Array.isArray(layerData.onairTemplates)) {
      templates = layerData.onairTemplates;
    } else if (Array.isArray(layerData)) {
      templates = layerData;
    } else if (typeof layerData === 'object') {
      templates = Object.values(layerData).filter(item => item && typeof item === 'object');
    }

    return templates.some(t => {
      const isLogo = t.itemID === 'logo' ||
                     (typeof t.relpath === 'string' && t.relpath.toLowerCase().includes('logo'));
      const isOnAir = t.onair === true || t.onair === 'true' || t.status === 'playing';
      return isLogo && isOnAir;
    });
  }

  findOnAirMainGraphic(layerData) {
    if (!layerData) return null;
    let templates = [];
    if (Array.isArray(layerData.onairTemplates)) {
      templates = layerData.onairTemplates;
    } else if (Array.isArray(layerData)) {
      templates = layerData;
    } else if (typeof layerData === 'object') {
      templates = Object.values(layerData).filter(item => item && typeof item === 'object');
    }

    return templates.find(t => {
      const isLogo = t.itemID === 'logo' ||
                     (typeof t.relpath === 'string' && t.relpath.toLowerCase().includes('logo'));
      const isOnAir = t.onair === true || t.onair === 'true' || t.status === 'playing';
      return !isLogo && isOnAir;
    }) || null;
  }

  async syncPlayoutStates() {
    if (!this.api || typeof this.api.getLayerState !== 'function') return;
    try {
      const layerData = await this.api.getLayerState();
      if (!layerData) return;

      const now = Date.now();
      const isLogoStopping = now < this.logoStopCooldownUntil;
      const isMainStopping = now < this.stopCooldownUntil;

      // 1. Sync Logo Playout State
      // Note: As documented by SPX, /api/v1/getlayerstate returns web-playout layer memory
      // and returns onairTemplates: [] for items controlled via API (controlRundownItemByID).
      // Therefore, never clear this.isLogoOnAir when getlayerstate returns empty templates.
      const isLogoPlaying = this.checkIsLogoOnAir(layerData);
      if (isLogoStopping) {
        if (!isLogoPlaying) {
          this.logoStopCooldownUntil = 0;
        }
      } else if (isLogoPlaying) {
        if (!this.isLogoOnAir) {
          this.isLogoOnAir = true;
          try { localStorage.setItem('spx_logo_onair', 'true'); } catch (e) {}
          this.updateLogoUI();
        }
      }

      // 2. Sync Main Graphic Playout State with SPX
      const onAirGraphic = this.findOnAirMainGraphic(layerData);
      const currentActive = this.store.getState().activeOnAirItem;

      if (isMainStopping) {
        if (!onAirGraphic) {
          this.stopCooldownUntil = 0;
        }
      } else if (onAirGraphic) {
        // Only adopt when SPX explicitly reports an active graphic layer
        if (!currentActive) {
          let restoredItem = null;
          const savedStr = localStorage.getItem(STORAGE_KEY_ACTIVE_ONAIR);
          if (savedStr) {
            try { restoredItem = JSON.parse(savedStr); } catch (e) {}
          }
          if (!restoredItem) {
            const items = this.store.getState().items || [];
            restoredItem = items.find(it => it.itemID === onAirGraphic.itemID) || {
              itemID: onAirGraphic.itemID || 'mainbar',
              head: 'ON-AIR',
              topic: onAirGraphic.description || 'กราฟิกกำลังออกอากาศ'
            };
          }
          this.store.setState({ activeOnAirItem: restoredItem });
          this.updateMainControlUI();
        }
      }
    } catch (err) {
      // SPX may be temporarily unreachable
    }
  }

  initStateSync() {
    // Initial sync
    this.syncPlayoutStates();

    // Periodic sync every 2.5s
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => this.syncPlayoutStates(), 2500);

    // Sync on activeView change
    this.store.subscribe('activeView', (view) => {
      if (view === 'view-controller') {
        this.syncPlayoutStates();
      }
    });

    // Sync when connection status becomes true
    this.store.subscribe('isConnected', (connected) => {
      if (connected) {
        this.syncPlayoutStates();
      }
    });
  }

  async triggerTogglePlay() {
    const toggleBtn = document.getElementById('btn-big-play-toggle');
    if (toggleBtn) toggleBtn.disabled = true;

    try {
      const activeItem = this.store.getState().activeOnAirItem;
      if (activeItem) {
        await this.triggerStop();
      } else {
        await this.triggerPlay();
      }
    } finally {
      if (toggleBtn) toggleBtn.disabled = false;
    }
  }

  async triggerToggleLogo() {
    const btn = document.getElementById('btn-toggle-logo');
    if (btn) btn.disabled = true;

    try {
      if (this.isLogoOnAir) {
        await this.triggerStopLogo();
      } else {
        await this.triggerPlayLogo();
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async triggerPlayLogo() {
    this.logoStopCooldownUntil = 0;
    const logoSelect = document.getElementById('ctrl-logo-select');
    const selectedLogo = logoSelect ? logoSelect.value : '';
    if (!selectedLogo) {
      this.showToast('กรุณาเลือกไฟล์ Logo ก่อนสั่งเล่น', 'warning');
      return;
    }

    // Persist choice immediately
    localStorage.setItem(STORAGE_KEY_SELECTED_LOGO, selectedLogo);

    const logoItem = {
      itemID: 'logo',
      logo: selectedLogo,
      head: 'LOGO CG',
      topic: `Logo: ${selectedLogo.split('/').pop()}`,
      relpath: 'Example/New-bar4.html',
      out: 'manual'
    };

    try {
      await this.api.setActiveItem(logoItem);
      await this.api.playItem('logo');
      await this.api.directPlayout({
        command: 'play',
        relativeTemplatePath: logoItem.relpath,
        out: 'manual',
        DataFields: [{ field: 'logo', value: selectedLogo }]
      }).catch(() => null);

      this.isLogoOnAir = true;
      try { localStorage.setItem('spx_logo_onair', 'true'); } catch (e) {}
      this.updateLogoUI();
      this.showToast(`▶ PLAY LOGO: ${selectedLogo.split('/').pop()}`, 'success');
    } catch (err) {
      this.showToast(`เล่น Logo ล้มเหลว: ${err.message}`, 'danger');
    }
  }

  async triggerStopLogo() {
    this.logoStopCooldownUntil = Date.now() + 4000;
    this.isLogoOnAir = false;
    try { localStorage.setItem('spx_logo_onair', 'false'); } catch (e) {}
    this.updateLogoUI();

    try {
      await this.api.stopItem('logo');
      await this.api.directPlayout({
        command: 'stop'
      }).catch(() => null);

      this.showToast(`⏹ STOP LOGO: หยุดแสดงผล Logo`, 'info');
    } catch (err) {
      this.showToast(`Stop Logo ล้มเหลว: ${err.message}`, 'danger');
    }
  }

  updateLogoUI() {
    const logoPill = document.getElementById('ctrl-logo-status-pill');
    const toggleBtn = document.getElementById('btn-toggle-logo');

    if (logoPill) {
      if (this.isLogoOnAir) {
        logoPill.className = 'badge badge-success';
        logoPill.textContent = '● ON-AIR';
      } else {
        logoPill.className = 'badge badge-neutral';
        logoPill.textContent = 'OFF-AIR';
      }
    }

    if (toggleBtn) {
      if (this.isLogoOnAir) {
        toggleBtn.className = 'btn btn-sm btn-stop w-full flex-center gap-2';
        toggleBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="6" y="6" width="12" height="12"></rect>
          </svg>
          <span>STOP LOGO</span>
        `;
      } else {
        toggleBtn.className = 'btn btn-sm btn-play w-full flex-center gap-2';
        toggleBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>PLAY LOGO</span>
        `;
      }
    }
  }

  updateMainControlUI() {
    const activeItem = this.store.getState().activeOnAirItem;
    const bannerBox = document.getElementById('ctrl-active-topic-banner');
    const bannerStatusLabel = document.getElementById('ctrl-banner-status-label');
    const bannerHeadText = document.getElementById('ctrl-banner-head-text');
    const bannerTopicText = document.getElementById('ctrl-banner-topic-text');
    const toggleBtn = document.getElementById('btn-big-play-toggle');
    const rundownBadge = document.getElementById('ctrl-rundown-badge');

    if (rundownBadge) {
      const state = this.store.getState();
      const currentRundown = state.spxLoadedRundown || (state.config && state.config.spxRundownFile) || 'Inside_Thailand/Live';
      rundownBadge.textContent = `Rundown: ${currentRundown}`;
    }

    // 1. Top Banner: Exclusively shows what is ON-AIR (not the selected queue item)
    if (bannerBox) {
      if (activeItem) {
        bannerBox.classList.add('is-onair');
        if (bannerStatusLabel) bannerStatusLabel.textContent = '● กำลัง ON-AIR:';

        const itemID = activeItem.itemID || 'mainbar';
        let bannerHead = activeItem.head || '';
        let bannerTopic = activeItem.topic || '';

        if (itemID === 'logo') {
          bannerHead = activeItem.head || 'LOGO CG';
          bannerTopic = activeItem.logo ? `Logo: ${activeItem.logo.split('/').pop()}` : '-';
        } else if (itemID === 'bar2line') {
          bannerTopic = `${activeItem.line1 || ''} / ${activeItem.line2 || ''}`;
        } else if (itemID === 'bar2name') {
          bannerTopic = `${activeItem.name1 || ''} & ${activeItem.name2 || ''} (${activeItem.line2 || ''})`;
        }

        if (bannerHeadText) {
          bannerHeadText.textContent = bannerHead ? `[${bannerHead}]` : '';
        }
        if (bannerTopicText) {
          bannerTopicText.textContent = bannerTopic || '(ไม่มีข้อความประเด็น)';
        }
      } else {
        bannerBox.classList.remove('is-onair');
        if (bannerStatusLabel) bannerStatusLabel.textContent = 'สถานะกราฟิก (STATUS):';
        if (bannerHeadText) bannerHeadText.textContent = '';
        if (bannerTopicText) bannerTopicText.textContent = 'ไม่มีรายการกำลังออกอากาศ (OFF-AIR)';
      }
    }

    // 2. Play / Stop Toggle Button
    if (toggleBtn) {
      if (activeItem) {
        toggleBtn.className = 'btn-control-big btn-control-stop';
        toggleBtn.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="6" y="6" width="12" height="12"></rect>
          </svg>
          <span>STOP ON-AIR</span>
        `;
      } else {
        toggleBtn.className = 'btn-control-big btn-control-play';
        toggleBtn.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>PLAY ON-AIR</span>
        `;
      }
    }
  }

  async triggerNext() {
    const activeItem = this.store.getState().activeOnAirItem;
    if (!activeItem) {
      this.showToast('ไม่มีรายการกำลังออกอากาศ (OFF-AIR)', 'warning');
      return;
    }

    const itemID = activeItem.itemID || 'mainbar';
    const totalSteps = parseInt(activeItem.steps || 1, 10);
    const currentStep = activeItem._currentStep || 1;

    try {
      await this.api.continueItem(itemID);

      if (currentStep >= totalSteps) {
        // CG finished its final step and animated OUT (CG ลงเรียบร้อยแล้ว)
        this.stopCooldownUntil = Date.now() + 4000;
        this.store.setState({ activeOnAirItem: null });
        try {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_ONAIR);
        } catch (e) {}
        this.updateMainControlUI();
        this.renderPlaylist();
        this.showToast(`⏭ STEP / NEXT: นำกราฟิกลงจากหน้าจอเรียบร้อยแล้ว`, 'info');
      } else {
        const updatedItem = { ...activeItem, _currentStep: currentStep + 1 };
        this.store.setState({ activeOnAirItem: updatedItem });
        try {
          localStorage.setItem(STORAGE_KEY_ACTIVE_ONAIR, JSON.stringify(updatedItem));
        } catch (e) {}
        this.showToast(`⏭ STEP / NEXT (${currentStep + 1}/${totalSteps}) ส่งสำเร็จ`, 'warning');
      }
    } catch (err) {
      this.showToast(`Next ล้มเหลว: ${err.message}`, 'danger');
    }
  }

  async triggerStop() {
    this.stopCooldownUntil = Date.now() + 4000;
    const activeItem = this.store.getState().activeOnAirItem;
    const itemID = activeItem ? activeItem.itemID : 'mainbar';

    this.store.setState({ activeOnAirItem: null });
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ONAIR);
    } catch (e) {}

    this.updateMainControlUI();
    this.renderPlaylist();

    try {
      await this.api.stopItem(itemID);
      await this.api.directPlayout({ command: 'stop' }).catch(() => null);
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

    const state = this.store.getState();
    items = (items && Array.isArray(items)) ? items : (state.items || []);
    const { activeOnAirItem, blocks = [] } = state;

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="text-muted p-3">ไม่มีรายการในคิว</div>';
      return;
    }

    if (this.selectedItemIndex >= items.length) {
      this.selectedItemIndex = 0;
    }

    const selectedItem = items[this.selectedItemIndex];

    if (selectedBadge) {
      selectedBadge.textContent = selectedItem ? `Selected: #${this.selectedItemIndex + 1} (${selectedItem.itemID})` : 'None';
    }

    // Update Top Banner and Playout controls strictly from ON-AIR state
    this.updateMainControlUI();

    if (selectedItem && detailsContainer) {
      const itemID = selectedItem.itemID || 'mainbar';
      let detailsHtml = `<div><strong>itemID:</strong> <code>${selectedItem.itemID}</code></div>`;

      if (itemID === 'logo') {
        detailsHtml += `
          <div><strong>Head:</strong> ${selectedItem.head || '-'}</div>
          <div class="ctrl-detail-topic-box">
            <span class="ctrl-detail-topic-label">Logo Asset:</span>
            <div class="ctrl-detail-topic-text">${selectedItem.logo || '-'}</div>
          </div>
        `;
      } else if (itemID === 'bar2line') {
        detailsHtml += `
          <div><strong>Head:</strong> ${selectedItem.head || '-'}</div>
          <div class="ctrl-detail-topic-box">
            <span class="ctrl-detail-topic-label">บรรทัดที่ 1 (Line 1):</span>
            <div class="ctrl-detail-topic-text">${selectedItem.line1 || '-'}</div>
          </div>
          <div class="ctrl-detail-topic-box">
            <span class="ctrl-detail-topic-label">บรรทัดที่ 2 (Line 2):</span>
            <div class="ctrl-detail-topic-text">${selectedItem.line2 || '-'}</div>
          </div>
          <div><strong>Mainbar:</strong> <code>${selectedItem.mainbar || '-'}</code></div>
          <div><strong>Headbar:</strong> <code>${selectedItem.headbar || 'none'}</code></div>
        `;
      } else if (itemID === 'bar2name') {
        detailsHtml += `
          <div><strong>Head:</strong> ${selectedItem.head || '-'}</div>
          <div class="ctrl-detail-topic-box">
            <span class="ctrl-detail-topic-label">ชื่อพิธีกร:</span>
            <div class="ctrl-detail-topic-text">${selectedItem.name1 || '-'} & ${selectedItem.name2 || '-'}</div>
            <div class="fs-xs text-muted mt-1">ตำแหน่ง: ${selectedItem.line2 || '-'}</div>
          </div>
          <div><strong>Mainbar:</strong> <code>${selectedItem.mainbar || '-'}</code></div>
          <div><strong>Headbar:</strong> <code>${selectedItem.headbar || 'none'}</code></div>
        `;
      } else {
        detailsHtml += `
          <div><strong>Head:</strong> ${selectedItem.head || '-'}</div>
          <div class="ctrl-detail-topic-box">
            <span class="ctrl-detail-topic-label">ประเด็น (Topic):</span>
            <div class="ctrl-detail-topic-text">${selectedItem.topic || '-'}</div>
          </div>
          <div><strong>Mainbar:</strong> <code>${selectedItem.mainbar || '-'}</code></div>
          <div><strong>Headbar:</strong> <code>${selectedItem.headbar || 'none'}</code></div>
        `;
      }

      detailsContainer.innerHTML = detailsHtml;
    }

    container.innerHTML = '';

    // If blocks exist, group playlist by news blocks
    if (blocks && blocks.length > 0) {
      blocks.forEach((block, bIdx) => {
        const blockGroup = document.createElement('div');

        const blockItems = [];
        items.forEach((item, globalIdx) => {
          if (item.blockId === block.id) {
            blockItems.push({ item, globalIdx });
          }
        });

        const hasOnAir = blockItems.some(({ item }) =>
          activeOnAirItem && (activeOnAirItem.itemID === item.itemID && activeOnAirItem.topic === item.topic && activeOnAirItem.head === item.head)
        );

        const isCollapsed = block.collapsed && !hasOnAir;
        blockGroup.className = `ctrl-block-group ${isCollapsed ? 'is-collapsed' : ''}`;
        blockGroup.dataset.blockId = block.id;

        // Block Header
        const header = document.createElement('div');
        header.className = 'ctrl-block-header';
        header.innerHTML = `
          <div class="flex-center gap-2">
            <div class="drag-handle-block" draggable="true" title="ลากเพื่อสลับลำดับบล็อกข่าว">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="9" cy="5" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle>
                <circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle>
                <circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
              </svg>
            </div>
            <button class="btn-block-collapse" title="${block.collapsed ? 'ขยาย' : 'ย่อลง'}">
              <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <span class="ctrl-block-title">📁 ${block.title}</span>
            <span class="block-count-badge fs-xs">${blockItems.length}</span>
            ${hasOnAir ? '<span class="badge badge-success fs-xs">● ON-AIR</span>' : ''}
          </div>
          <div class="flex-center gap-1">
            <button class="btn-icon btn-block-up" title="เลื่อนบล็อกขึ้น" ${bIdx === 0 ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
            <button class="btn-icon btn-block-down" title="เลื่อนบล็อกลง" ${bIdx === blocks.length - 1 ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>
        `;

        header.addEventListener('click', (e) => {
          if (e.target.closest('.btn-block-up') || e.target.closest('.btn-block-down') || e.target.closest('.drag-handle-block')) return;
          this.store.toggleBlockCollapse(block.id);
        });

        header.querySelector('.btn-block-up').addEventListener('click', (e) => {
          e.stopPropagation();
          this.store.moveBlock(bIdx, bIdx - 1);
        });
        header.querySelector('.btn-block-down').addEventListener('click', (e) => {
          e.stopPropagation();
          this.store.moveBlock(bIdx, bIdx + 1);
        });

        // Block Dragging in controller desk
        const blockGrip = header.querySelector('.drag-handle-block');
        blockGrip.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          window.__ctrlDragData = { type: 'block', blockIndex: bIdx, blockId: block.id };
          blockGroup.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify(window.__ctrlDragData));
        });
        blockGrip.addEventListener('dragend', () => {
          blockGroup.classList.remove('dragging');
          window.__ctrlDragData = null;
          container.querySelectorAll('.ctrl-block-group').forEach(g => g.classList.remove('drag-over-block'));
        });

        header.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          blockGroup.classList.add('drag-over-block');
        });
        header.addEventListener('dragleave', (e) => {
          if (!header.contains(e.relatedTarget)) {
            blockGroup.classList.remove('drag-over-block');
          }
        });
        header.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          blockGroup.classList.remove('drag-over-block');
          const data = window.__ctrlDragData;
          if (!data) return;
          if (data.type === 'block' && data.blockIndex !== bIdx) {
            this.store.moveBlock(data.blockIndex, bIdx);
          } else if (data.type === 'item') {
            this.store.moveItemToBlock(data.globalIndex, block.id);
          }
        });

        // Block items container
        const itemsBox = document.createElement('div');
        itemsBox.className = 'ctrl-block-items';

        itemsBox.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          itemsBox.classList.add('drag-over-block');
        });
        itemsBox.addEventListener('dragleave', (e) => {
          if (!itemsBox.contains(e.relatedTarget)) {
            itemsBox.classList.remove('drag-over-block');
          }
        });
        itemsBox.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          itemsBox.classList.remove('drag-over-block');
          const data = window.__ctrlDragData;
          if (data && data.type === 'item') {
            this.store.moveItemToBlock(data.globalIndex, block.id);
          }
        });

        if (blockItems.length === 0) {
          itemsBox.innerHTML = '<div class="text-muted fs-xs p-2 text-center border-dashed rounded">ไม่มีประเด็นในบล็อกนี้ (ลากมาใส่ได้)</div>';
        } else {
          blockItems.forEach(({ item, globalIdx }) => {
            const el = this.createPlaylistItemElement(item, globalIdx, activeOnAirItem, items);
            itemsBox.appendChild(el);
          });
        }

        blockGroup.appendChild(header);
        blockGroup.appendChild(itemsBox);
        container.appendChild(blockGroup);
      });

      // Unassigned items in controller desk
      const unassignedItems = [];
      items.forEach((item, globalIdx) => {
        if (!item.blockId || !blocks.some(b => b.id === item.blockId)) {
          unassignedItems.push({ item, globalIdx });
        }
      });

      if (unassignedItems.length > 0) {
        const unGroup = document.createElement('div');
        unGroup.className = 'ctrl-block-group';
        unGroup.innerHTML = `
          <div class="ctrl-block-header">
            <span class="ctrl-block-title fs-xs text-muted">📌 รายการทั่วไป / นอกบล็อก (${unassignedItems.length})</span>
          </div>
        `;
        const unItemsBox = document.createElement('div');
        unItemsBox.className = 'ctrl-block-items';

        unGroup.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });
        unGroup.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const data = window.__ctrlDragData;
          if (data && data.type === 'item') {
            this.store.moveItemOutOfBlock(data.globalIndex);
          }
        });

        unassignedItems.forEach(({ item, globalIdx }) => {
          const el = this.createPlaylistItemElement(item, globalIdx, activeOnAirItem, items);
          unItemsBox.appendChild(el);
        });

        unGroup.appendChild(unItemsBox);
        container.appendChild(unGroup);
      }
    } else {
      // Flat list fallback
      items.forEach((item, idx) => {
        const el = this.createPlaylistItemElement(item, idx, activeOnAirItem, items);
        container.appendChild(el);
      });
    }
  }

  createPlaylistItemElement(item, idx, activeOnAirItem, items) {
    const isSelected = idx === this.selectedItemIndex;
    const isOnAir = activeOnAirItem && (activeOnAirItem.itemID === item.itemID && activeOnAirItem.topic === item.topic && activeOnAirItem.head === item.head);

    const el = document.createElement('div');
    el.className = `playlist-item ${isSelected ? 'selected' : ''} ${isOnAir ? 'onair' : ''}`;
    el.setAttribute('draggable', 'true');

    const itemID = item.itemID || 'mainbar';
    let headDisplay = item.head || '';
    let topicDisplay = item.topic || '';
    let assetsDisplay = '';

    if (itemID === 'logo') {
      headDisplay = item.head ? `${item.head} (Logo)` : 'Logo CG';
      topicDisplay = `Logo Asset: ${item.logo || '-'}`;
      assetsDisplay = `<span><strong>Logo:</strong> <code>${item.logo || '-'}</code></span>`;
    } else if (itemID === 'bar2line') {
      headDisplay = item.head ? `${item.head} (บาร์ 2 บรรทัด)` : 'บาร์ 2 บรรทัด';
      topicDisplay = `[L1] ${item.line1 || '-'} | [L2] ${item.line2 || '-'}`;
      assetsDisplay = `<span><strong>Main Bar:</strong> <code>${item.mainbar || '-'}</code></span> | <span><strong>Head Bar:</strong> <code>${item.headbar || 'none'}</code></span>`;
    } else if (itemID === 'bar2name') {
      headDisplay = item.head ? `${item.head} (บาร์พิธีกร 2 คน)` : 'บาร์พิธีกร 2 คน';
      topicDisplay = `พิธีกร: ${item.name1 || '-'} & ${item.name2 || '-'} (${item.line2 || '-'})`;
      assetsDisplay = `<span><strong>Main Bar:</strong> <code>${item.mainbar || '-'}</code></span> | <span><strong>Head Bar:</strong> <code>${item.headbar || 'none'}</code></span>`;
    } else {
      headDisplay = item.head || '';
      topicDisplay = item.topic || '(ไม่มีข้อความประเด็น)';
      assetsDisplay = `<span><strong>Main Bar:</strong> <code>${item.mainbar || '-'}</code></span> | <span><strong>Head Bar:</strong> <code>${item.headbar || 'none'}</code></span>`;
    }

    el.innerHTML = `
      <div class="ctrl-playlist-item-left">
        <div class="drag-handle" title="ลากเพื่อเปลี่ยนลำดับหรือย้ายบล็อก" style="cursor: grab; display: flex; align-items: center; color: var(--text-muted); padding: 4px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle>
            <circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle>
            <circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
          </svg>
        </div>
        <span class="ctrl-item-index font-mono">#${idx + 1}</span>
        <div>
          <span class="badge badge-info">ID: ${item.itemID}</span>
        </div>
        <div class="ctrl-item-content">
          ${headDisplay ? `<div class="ctrl-item-head">${headDisplay}</div>` : ''}
          <div class="ctrl-item-topic">${topicDisplay}</div>
          <div class="item-row-assets fs-xs text-muted mt-1">
            ${assetsDisplay}
          </div>
        </div>
      </div>
      <div class="flex-center gap-2">
        <span class="badge ${isOnAir ? 'badge-success' : (isSelected ? 'badge-info' : 'badge-neutral')}">
          ${isOnAir ? '● ON-AIR' : (isSelected ? 'SELECTED' : 'IDLE')}
        </span>
        <button class="btn btn-xs btn-outline btn-item-edit" title="แก้ไขข้อความแบบเร่งด่วน">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          EDIT
        </button>
        <button class="btn btn-xs btn-play btn-item-play" title="สั่งเล่นประเด็นนี้ทันที">
          ▶ PLAY
        </button>
      </div>
    `;

    // Selection on click
    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn-item-play') || e.target.closest('.btn-item-edit') || e.target.closest('.drag-handle')) return;
      this.selectedItemIndex = idx;
      this.renderPlaylist(items);
    });

    // Quick Edit on item button
    const editBtn = el.querySelector('.btn-item-edit');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedItemIndex = idx;
        if (this.editorDialog) {
          this.editorDialog.openForEdit(idx);
        } else {
          this.showToast('ไม่พบระบบแก้ไขรายการ', 'warning');
        }
      });
    }

    const playBtn = el.querySelector('.btn-item-play');
    if (playBtn) {
      playBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.selectedItemIndex = idx;
        await this.triggerPlay();
      });
    }

    // Drag and Drop Events
    el.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      const dragData = { type: 'item', globalIndex: idx };
      window.__ctrlDragData = dragData;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    });

    el.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      el.classList.remove('drag-over');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drag-over');
      const dragData = window.__ctrlDragData || (e.dataTransfer.getData('text/plain') ? JSON.parse(e.dataTransfer.getData('text/plain')) : null);
      if (!dragData || dragData.type !== 'item') return;

      const fromIndex = dragData.globalIndex;
      const toIndex = idx;

      if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== toIndex) {
        this.store.moveItem(fromIndex, toIndex);
        this.selectedItemIndex = toIndex;
        this.showToast(`เปลี่ยนลำดับรายการ #${fromIndex + 1} ➔ #${toIndex + 1}`, 'info');
      }
    });

    el.addEventListener('dragend', () => {
      window.__ctrlDragData = null;
      document.querySelectorAll('.playlist-item').forEach((itemEl) => {
        itemEl.classList.remove('dragging', 'drag-over');
      });
    });

    return el;
  }
}
