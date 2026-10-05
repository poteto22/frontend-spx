/**
 * VIEW 1: Main Rundown Overview Dashboard (หน้าจอแสดงผล Main Rundown)
 */
export class MainRundownView {
  constructor(container, api, store, showToast) {
    this.container = container;
    this.api = api;
    this.store = store;
    this.showToast = showToast;

    this.render();
    this.subscribeStore();
  }

  subscribeStore() {
    this.store.subscribe('items', () => this.updateOverview());
    this.store.subscribe('blocks', () => this.updateOverview());
    this.store.subscribe('activeOnAirItem', () => this.updateOverview());
    this.store.subscribe('currentRundownName', () => this.updateOverview());
  }

  render() {
    this.container.innerHTML = `
      <div class="overview-dashboard">
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="stat-total-items">0</div>
              <div class="stat-label">รายการ CG ทั้งหมด</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon info">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <div class="stat-value" id="stat-total-blocks">0</div>
              <div class="stat-label">บล็อกข่าวทั้งหมด</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div>
              <div class="stat-value text-success" id="stat-onair-status">OFF-AIR</div>
              <div class="stat-label">สถานะการออกอากาศ</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon neutral">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div>
              <div class="stat-value fs-md" id="stat-rundown-name">MainRundown</div>
              <div class="stat-label">ชื่อไฟล์ Rundown</div>
            </div>
          </div>
        </div>

        <!-- Live On-Air Banner -->
        <div class="live-onair-box">
          <div class="onair-header">
            <span class="fs-sm fw-700 text-secondary uppercase">กราฟิกที่กำลังแสดงผล (Live Preview)</span>
            <span class="onair-pulse-badge" id="onair-badge">OFF-AIR</span>
          </div>
          <div class="onair-item-preview" id="onair-preview-content">
            <div class="text-muted fs-sm">ไม่มีกราฟิกที่กำลังแสดงผลในขณะนี้</div>
          </div>
        </div>

        <!-- Current Rundown Table Overview -->
        <div class="card">
          <div class="card-header flex-between">
            <h3 class="fs-md">โครงสร้าง Main Rundown ปัจจุบัน (แยกตามบล็อกข่าว)</h3>
            <div class="flex-center gap-2">
              <button class="btn btn-sm btn-primary" id="btn-goto-controller">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                ไปที่หน้าจอควบคุม Rundown
              </button>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="items-table-container p-3 flex flex-col gap-3" id="overview-items-list">
              <!-- Item list injected -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-goto-controller').addEventListener('click', () => {
      document.querySelector('[data-view="view-controller"]').click();
    });

    this.updateOverview();
  }

  updateOverview() {
    const { items, blocks, activeOnAirItem, currentRundownName } = this.store.getState();

    const totalEl = document.getElementById('stat-total-items');
    const totalBlocksEl = document.getElementById('stat-total-blocks');
    const onairStatusEl = document.getElementById('stat-onair-status');
    const rundownNameEl = document.getElementById('stat-rundown-name');
    const previewContent = document.getElementById('onair-preview-content');
    const onairBadge = document.getElementById('onair-badge');
    const listContainer = document.getElementById('overview-items-list');

    if (totalEl) totalEl.textContent = (items || []).length.toString();
    if (totalBlocksEl) totalBlocksEl.textContent = (blocks || []).length.toString();
    if (rundownNameEl) rundownNameEl.textContent = currentRundownName || 'MainRundown';

    if (activeOnAirItem) {
      if (onairStatusEl) {
        onairStatusEl.textContent = 'ON-AIR';
        onairStatusEl.className = 'stat-value text-success';
      }
      if (onairBadge) {
        onairBadge.textContent = '● ON-AIR';
        onairBadge.style.backgroundColor = 'var(--accent-play)';
      }
      if (previewContent) {
        const itemID = activeOnAirItem.itemID || 'mainbar';
        let headDisplay = activeOnAirItem.head || '';
        let topicDisplay = activeOnAirItem.topic || '';
        if (itemID === 'logo') {
          headDisplay = 'LOGO CG';
          topicDisplay = `Logo: ${activeOnAirItem.logo || '-'}`;
        } else if (itemID === 'bar2line') {
          topicDisplay = `L1: ${activeOnAirItem.line1 || '-'} | L2: ${activeOnAirItem.line2 || '-'}`;
        } else if (itemID === 'bar2name') {
          topicDisplay = `พิธีกร: ${activeOnAirItem.name1 || '-'} & ${activeOnAirItem.name2 || '-'} (${activeOnAirItem.line2 || '-'})`;
        }

        previewContent.innerHTML = `
          <div class="onair-item-head">${headDisplay}</div>
          <div class="onair-item-topic">${topicDisplay}</div>
          <div class="onair-meta">
            <span><strong>itemID:</strong> <code>${activeOnAirItem.itemID}</code></span>
            <span><strong>Mainbar:</strong> ${activeOnAirItem.mainbar || '-'}</span>
            <span><strong>Headbar:</strong> ${activeOnAirItem.headbar || 'none'}</span>
          </div>
        `;
      }
    } else {
      if (onairStatusEl) {
        onairStatusEl.textContent = 'OFF-AIR';
        onairStatusEl.className = 'stat-value text-muted';
      }
      if (onairBadge) {
        onairBadge.textContent = 'OFF-AIR';
        onairBadge.style.backgroundColor = 'var(--text-muted)';
      }
      if (previewContent) {
        previewContent.innerHTML = '<div class="text-muted fs-sm">ไม่มีกราฟิกที่กำลังแสดงผลในขณะนี้</div>';
      }
    }

    if (!listContainer) return;

    if (!items || items.length === 0) {
      listContainer.innerHTML = '<div class="text-muted p-3 text-center">ยังไม่มีรายการ CG ใน Rundown</div>';
      return;
    }

    listContainer.innerHTML = '';

    const safeBlocks = (blocks && blocks.length > 0) ? blocks : [];

    // Helper to render an item row
    const renderItemRow = (item, idx) => {
      const row = document.createElement('div');
      const isOnAir = activeOnAirItem && (activeOnAirItem.itemID === item.itemID && activeOnAirItem.topic === item.topic && activeOnAirItem.head === item.head);
      row.className = `item-row-card overview-row-card ${isOnAir ? 'is-onair' : ''}`;

      const itemID = item.itemID || 'mainbar';
      let headDisplay = item.head || '';
      let topicDisplay = item.topic || '';
      if (itemID === 'logo') {
        headDisplay = item.head ? `${item.head} (Logo)` : 'Logo CG';
        topicDisplay = `Logo Asset: ${item.logo || '-'}`;
      } else if (itemID === 'bar2line') {
        headDisplay = item.head ? `${item.head} (บาร์ 2 บรรทัด)` : 'บาร์ 2 บรรทัด';
        topicDisplay = `[L1] ${item.line1 || '-'} | [L2] ${item.line2 || '-'}`;
      } else if (itemID === 'bar2name') {
        headDisplay = item.head ? `${item.head} (บาร์พิธีกร 2 คน)` : 'บาร์พิธีกร 2 คน';
        topicDisplay = `พิธีกร: ${item.name1 || '-'} & ${item.name2 || '-'} (${item.line2 || '-'})`;
      } else {
        topicDisplay = item.topic || '(ไม่มีข้อความประเด็น)';
      }

      row.innerHTML = `
        <div class="item-row-index">#${idx + 1}</div>
        <div>
          <span class="badge ${isOnAir ? 'badge-success' : 'badge-neutral'}">
            ${isOnAir ? 'ON-AIR' : 'STOPPED'}
          </span>
          <div class="fs-xs font-mono text-muted mt-1">ID: ${item.itemID}</div>
        </div>
        <div class="item-row-main">
          ${headDisplay ? `<div class="item-row-head">${headDisplay}</div>` : ''}
          <div class="item-row-topic">${topicDisplay}</div>
          <div class="item-row-assets">
            <span>Mainbar: <code>${item.mainbar || '-'}</code></span> | 
            <span>Headbar: <code>${item.headbar || 'none'}</code></span>
          </div>
        </div>
        <div class="item-row-actions">
          <button class="btn btn-xs btn-play btn-trigger-item" data-idx="${idx}">
            PLAY
          </button>
        </div>
      `;

      row.querySelector('.btn-trigger-item').addEventListener('click', async () => {
        try {
          await this.api.setActiveItem(item);
          await this.api.playItem(item.itemID);
          await this.api.directPlayout({
            command: 'play',
            relativeTemplatePath: item.relpath,
            out: item.out || 'manual',
            DataFields: [
              { field: 'f0', value: item.head },
              { field: 'f1', value: item.topic },
              { field: 'mainbar', value: item.mainbar },
              { field: 'headbar', value: item.headbar }
            ]
          }).catch(() => null);

          this.store.setState({ activeOnAirItem: item });
          this.showToast(`เล่น CG: ${item.head}`, 'success');
        } catch (err) {
          this.showToast(`ไม่สามารถสั่งเล่น CG ได้: ${err.message}`, 'danger');
        }
      });

      return row;
    };

    if (safeBlocks.length === 0) {
      // Flat list fallback if no blocks
      items.forEach((item, idx) => {
        listContainer.appendChild(renderItemRow(item, idx));
      });
      return;
    }

    // Render grouped by blocks
    safeBlocks.forEach((block) => {
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

      const header = document.createElement('div');
      header.className = 'ctrl-block-header';
      header.innerHTML = `
        <div class="flex-center gap-2">
          <button class="btn-block-collapse" title="${block.collapsed ? 'ขยาย' : 'ย่อลง'}">
            <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <span class="ctrl-block-title">📁 ${block.title}</span>
          <span class="block-count-badge fs-xs">${blockItems.length} รายการ</span>
          ${hasOnAir ? '<span class="badge badge-success fs-xs">● ON-AIR</span>' : ''}
        </div>
        <div class="fs-xs text-muted">
          คลิกเพื่อ ${block.collapsed ? 'ขยาย' : 'ย่อเก็บ'}
        </div>
      `;

      header.addEventListener('click', () => {
        this.store.toggleBlockCollapse(block.id);
      });

      const body = document.createElement('div');
      body.className = 'ctrl-block-items flex flex-col gap-2 p-2';

      if (blockItems.length === 0) {
        body.innerHTML = '<div class="text-muted fs-xs p-2 text-center">ไม่มีรายการ CG ในบล็อกข่าวนี้</div>';
      } else {
        blockItems.forEach(({ item, globalIdx }) => {
          body.appendChild(renderItemRow(item, globalIdx));
        });
      }

      blockGroup.appendChild(header);
      blockGroup.appendChild(body);
      listContainer.appendChild(blockGroup);
    });

    // Unassigned items
    const unassigned = [];
    items.forEach((item, globalIdx) => {
      const belongs = safeBlocks.some(b => b.id === item.blockId);
      if (!belongs) {
        unassigned.push({ item, globalIdx });
      }
    });

    if (unassigned.length > 0) {
      const unassignedGroup = document.createElement('div');
      unassignedGroup.className = 'ctrl-block-group';
      unassignedGroup.innerHTML = `
        <div class="ctrl-block-header" style="background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3);">
          <div class="flex-center gap-2">
            <span class="ctrl-block-title text-warning">📌 รายการที่ไม่ได้ระบุบล็อกข่าว</span>
            <span class="block-count-badge fs-xs">${unassigned.length}</span>
          </div>
        </div>
      `;
      const unassignedBody = document.createElement('div');
      unassignedBody.className = 'ctrl-block-items flex flex-col gap-2 p-2';
      unassigned.forEach(({ item, globalIdx }) => {
        unassignedBody.appendChild(renderItemRow(item, globalIdx));
      });
      unassignedGroup.appendChild(unassignedBody);
      listContainer.appendChild(unassignedGroup);
    }
  }
}
