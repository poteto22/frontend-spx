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
    this.store.subscribe('items', () => this.renderPlaylist());
    this.store.subscribe('blocks', () => this.renderPlaylist());
    this.store.subscribe('activeOnAirItem', () => this.renderPlaylist());
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

            <!-- Active / Selected Topic Preview Banner -->
            <div class="ctrl-active-topic-banner" id="ctrl-active-topic-banner">
              <div class="ctrl-banner-header">
                <span class="ctrl-banner-label" id="ctrl-banner-status-label">รายการที่เลือก (SELECTED):</span>
                <span class="ctrl-banner-head" id="ctrl-banner-head-text"></span>
              </div>
              <div class="ctrl-banner-topic" id="ctrl-banner-topic-text">-</div>
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
        command: 'stop'
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

    // Update Top Banner with Selected / On-Air Topic
    const bannerBox = document.getElementById('ctrl-active-topic-banner');
    const bannerStatusLabel = document.getElementById('ctrl-banner-status-label');
    const bannerHeadText = document.getElementById('ctrl-banner-head-text');
    const bannerTopicText = document.getElementById('ctrl-banner-topic-text');

    if (selectedItem && bannerTopicText) {
      const itemID = selectedItem.itemID || 'mainbar';
      let bannerHead = selectedItem.head || '';
      let bannerTopic = selectedItem.topic || '';
      if (itemID === 'logo') {
        bannerHead = selectedItem.head || 'LOGO CG';
        bannerTopic = selectedItem.logo ? `Logo: ${selectedItem.logo.split('/').pop()}` : '-';
      } else if (itemID === 'bar2line') {
        bannerTopic = `${selectedItem.line1 || ''} / ${selectedItem.line2 || ''}`;
      } else if (itemID === 'bar2name') {
        bannerTopic = `${selectedItem.name1 || ''} & ${selectedItem.name2 || ''} (${selectedItem.line2 || ''})`;
      }

      bannerTopicText.textContent = bannerTopic || '(ไม่มีข้อความประเด็น)';
      if (bannerHeadText) {
        bannerHeadText.textContent = bannerHead ? `[${bannerHead}]` : '';
      }

      const isCurrentOnAir = activeOnAirItem && (activeOnAirItem.itemID === selectedItem.itemID && activeOnAirItem.topic === selectedItem.topic && activeOnAirItem.head === selectedItem.head);
      if (bannerBox) {
        if (isCurrentOnAir) {
          bannerBox.classList.add('is-onair');
          if (bannerStatusLabel) bannerStatusLabel.textContent = '● กำลัง ON-AIR:';
        } else {
          bannerBox.classList.remove('is-onair');
          if (bannerStatusLabel) bannerStatusLabel.textContent = 'รายการที่เลือก (SELECTED):';
        }
      }
    }

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
        blockGroup.className = `ctrl-block-group ${block.collapsed ? 'is-collapsed' : ''}`;
        blockGroup.dataset.blockId = block.id;

        const blockItems = [];
        items.forEach((item, globalIdx) => {
          if (item.blockId === block.id) {
            blockItems.push({ item, globalIdx });
          }
        });

        const hasOnAir = blockItems.some(({ item }) =>
          activeOnAirItem && (activeOnAirItem.itemID === item.itemID && activeOnAirItem.topic === item.topic && activeOnAirItem.head === item.head)
        );

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
      <div class="ctrl-playlist-item-left">
        <div class="drag-handle" title="ลากเพื่อเปลี่ยนลำดับหรือย้ายบล็อก">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle>
            <circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle>
            <circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
          </svg>
        </div>
        <span class="ctrl-item-index font-mono">#${idx + 1}</span>
        <div class="ctrl-item-content">
          ${headDisplay ? `<div class="ctrl-item-head">${headDisplay}</div>` : ''}
          <div class="ctrl-item-topic">${topicDisplay}</div>
        </div>
      </div>
      <div class="flex-center gap-2">
        <span class="badge ${isOnAir ? 'badge-success' : (isSelected ? 'badge-info' : 'badge-neutral')}">
          ${isOnAir ? '● ON-AIR' : (isSelected ? 'SELECTED' : 'IDLE')}
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
}
