/**
 * VIEW 2: Create Rundown Workspace (หน้าจอสร้าง Rundown with News Blocks)
 */
export class CreateRundownView {
  constructor(container, api, store, editorDialog, showToast) {
    this.container = container;
    this.api = api;
    this.store = store;
    this.editorDialog = editorDialog;
    this.showToast = showToast;
    this.pendingDeleteBlockId = null;
    this.pendingDeleteBlockTitle = '';

    this.render();
    this.subscribeStore();
    this.initDeleteBlockDialog();
  }

  subscribeStore() {
    this.store.subscribe('items', () => this.renderItems());
    this.store.subscribe('blocks', () => this.renderItems());
    this.store.subscribe('activeOnAirItem', () => this.renderItems());
    this.store.subscribe('currentRundownName', (name) => {
      const nameEl = document.getElementById('cr-rundown-name');
      if (nameEl) nameEl.textContent = name;
    });
  }

  render() {
    const { currentRundownName } = this.store.getState();

    this.container.innerHTML = `
      <div class="rundown-workspace-toolbar">
        <div class="flex-center gap-3">
          <h2>หน้าจอสร้าง Rundown</h2>
          <span class="badge badge-info fs-xs" id="cr-rundown-name">${currentRundownName || 'MainRundown'}</span>
        </div>
        
        <div class="flex-center gap-2">
          <button class="btn btn-success" id="btn-cr-add-block" title="สร้างบล็อกข่าวเพื่อจัดหมวดหมู่ประเด็น CG">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
            + สร้างบล็อกข่าว
          </button>
          <button class="btn btn-primary" id="btn-cr-add">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + สร้างรายการ CG ใหม่
          </button>
          <button class="btn btn-secondary" id="btn-cr-save-spx">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            บันทึกไปยัง SPX Server
          </button>
          <button class="btn btn-outline" id="btn-cr-export">
            Export JSON
          </button>
          <button class="btn btn-outline" id="btn-cr-import">
            Import JSON
          </button>
          <input type="file" id="cr-file-input" accept=".json" style="display:none;">
        </div>
      </div>

      <!-- Rundown Items Container with News Blocks -->
      <div class="items-table-container" id="cr-items-list">
        <!-- Rendered news blocks & items -->
      </div>
    `;

    // Bind Action Buttons
    document.getElementById('btn-cr-add-block').addEventListener('click', () => {
      const blocks = this.store.getState().blocks || [];
      const defaultTitle = `ข่าวที่ ${blocks.length + 1}: ประเด็นข่าว`;
      const title = prompt('กรอกชื่อบล็อกข่าวใหม่:', defaultTitle);
      if (title && title.trim()) {
        this.store.addBlock(title.trim());
        this.showToast(`สร้างบล็อกข่าว "${title.trim()}" สำเร็จ`, 'success');
      }
    });

    document.getElementById('btn-cr-add').addEventListener('click', () => {
      this.editorDialog.openForNew();
    });

    document.getElementById('btn-cr-save-spx').addEventListener('click', async () => {
      let { currentProject, currentRundownName, items, blocks } = this.store.getState();
      try {
        const payload = {
          comment: 'Created in SPX Front-End Workspace',
          blocks: blocks || [],
          templates: items
        };
        await this.api.saveRundownJSON(currentProject || 'Nation', currentRundownName || 'MainRundown', payload);
        this.showToast(`บันทึกไฟล์ Rundown "${currentRundownName}" ไปยัง SPX เรียบร้อยแล้ว`, 'success');
      } catch (err) {
        this.showToast(`บันทึกล้มเหลว: ${err.message}`, 'danger');
      }
    });

    document.getElementById('btn-cr-export').addEventListener('click', () => {
      const { currentRundownName, items, blocks } = this.store.getState();
      const exportContent = { blocks: blocks || [], templates: items };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportContent, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${currentRundownName}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      this.showToast('ดาวน์โหลดไฟล์ JSON เรียบร้อยแล้ว', 'info');
    });

    const fileInput = document.getElementById('cr-file-input');
    document.getElementById('btn-cr-import').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          let items = [];
          let blocks = [];
          if (Array.isArray(parsed)) {
            items = parsed;
          } else if (parsed && parsed.items) {
            items = parsed.items;
            blocks = parsed.blocks || [];
          } else if (parsed && parsed.templates) {
            items = parsed.templates;
            blocks = parsed.blocks || [];
          }
          this.store.setState({ items, blocks });
          this.showToast(`นำเข้าข้อมูล CG สำเร็จ (${items.length} รายการ)`, 'success');
        } catch (err) {
          this.showToast(`ไฟล์ JSON ไม่ถูกต้อง: ${err.message}`, 'danger');
        }
      };
      reader.readAsText(file);
    });

    this.renderItems();
  }

  renderItems() {
    const listContainer = document.getElementById('cr-items-list');
    if (!listContainer) return;

    const { items = [], blocks = [], activeOnAirItem } = this.store.getState();

    if (items.length === 0 && blocks.length === 0) {
      listContainer.innerHTML = `
        <div class="card p-4 text-center text-muted">
          <h4>ยังไม่มีรายการ CG หรือบล็อกข่าวใน Rundown</h4>
          <p class="fs-sm mt-1">กดปุ่ม "+ สร้างบล็อกข่าว" หรือ "+ สร้างรายการ CG ใหม่" ด้านบนเพื่อเริ่มจัดเตรียมคิว</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    let draggedData = null;

    // 1. Render Each News Block
    blocks.forEach((block, bIdx) => {
      const blockCard = document.createElement('div');
      blockCard.className = `news-block-card ${block.collapsed ? 'is-collapsed' : ''}`;
      blockCard.dataset.blockId = block.id;

      // Filter items belonging to this block (with their global indices)
      const blockItems = [];
      items.forEach((item, globalIdx) => {
        if (item.blockId === block.id) {
          blockItems.push({ item, globalIdx });
        }
      });

      const hasOnAirItem = blockItems.some(({ item }) =>
        activeOnAirItem && (activeOnAirItem.itemID === item.itemID && activeOnAirItem.topic === item.topic && activeOnAirItem.head === item.head)
      );

      // Block Header HTML
      const headerEl = document.createElement('div');
      headerEl.className = 'news-block-header';
      headerEl.innerHTML = `
        <div class="news-block-header-left">
          <div class="drag-handle-block" draggable="true" title="ลากเพื่อย้ายสลับลำดับบล็อกข่าว">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="9" cy="5" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle>
              <circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle>
              <circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
            </svg>
          </div>
          <button class="btn-block-collapse" title="${block.collapsed ? 'คลิกเพื่อขยายดูประเด็น' : 'คลิกเพื่อย่อลงซ่อนประเด็น'}">
            <svg class="chevron-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="news-block-title-box" title="คลิกเพื่อแก้ไขชื่อบล็อกข่าว">
            <span class="news-block-title">📁 ${block.title}</span>
            <button class="btn-icon btn-rename-block" title="แก้ไขชื่อบล็อกข่าว">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
          </div>
          <span class="block-count-badge">${blockItems.length} ประเด็น</span>
          ${hasOnAirItem ? '<span class="badge badge-success animate-pulse">● ON-AIR</span>' : ''}
        </div>

        <div class="news-block-header-right">
          <button class="btn btn-xs btn-outline btn-add-in-block" title="เพิ่มประเด็นในบล็อกข่าวนี้">
            + เพิ่มประเด็นในบล็อก
          </button>
          <button class="btn-icon btn-block-up" title="เลื่อนบล็อกขึ้น" ${bIdx === 0 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
          </button>
          <button class="btn-icon btn-block-down" title="เลื่อนบล็อกลง" ${bIdx === blocks.length - 1 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <button class="btn-icon text-danger btn-block-del" title="ลบบล็อกข่าวนี้">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      // Collapse Toggle
      const toggleCollapse = () => {
        this.store.toggleBlockCollapse(block.id);
      };
      headerEl.querySelector('.btn-block-collapse').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
      });
      headerEl.querySelector('.news-block-title').addEventListener('click', (e) => {
        e.stopPropagation();
        const newTitle = prompt('แก้ไขชื่อบล็อกข่าว:', block.title);
        if (newTitle && newTitle.trim()) {
          this.store.updateBlock(block.id, { title: newTitle.trim() });
          this.showToast(`เปลี่ยนชื่อบล็อกข่าวเป็น "${newTitle.trim()}"`, 'info');
        }
      });
      headerEl.querySelector('.btn-rename-block').addEventListener('click', (e) => {
        e.stopPropagation();
        const newTitle = prompt('แก้ไขชื่อบล็อกข่าว:', block.title);
        if (newTitle && newTitle.trim()) {
          this.store.updateBlock(block.id, { title: newTitle.trim() });
          this.showToast(`เปลี่ยนชื่อบล็อกข่าวเป็น "${newTitle.trim()}"`, 'info');
        }
      });

      // Block Action Buttons
      headerEl.querySelector('.btn-add-in-block').addEventListener('click', (e) => {
        e.stopPropagation();
        this.editorDialog.openForNew(block.id);
      });
      headerEl.querySelector('.btn-block-up').addEventListener('click', (e) => {
        e.stopPropagation();
        this.store.moveBlock(bIdx, bIdx - 1);
      });
      headerEl.querySelector('.btn-block-down').addEventListener('click', (e) => {
        e.stopPropagation();
        this.store.moveBlock(bIdx, bIdx + 1);
      });
      headerEl.querySelector('.btn-block-del').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDeleteBlockDialog(block);
      });

      // Block Drag & Drop (Reordering Blocks)
      const blockDragGrip = headerEl.querySelector('.drag-handle-block');
      blockDragGrip.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedData = { type: 'block', blockIndex: bIdx, blockId: block.id };
        window.__dragData = draggedData;
        blockCard.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(draggedData));
      });

      blockDragGrip.addEventListener('dragend', () => {
        blockCard.classList.remove('dragging');
        draggedData = null;
        window.__dragData = null;
        listContainer.querySelectorAll('.news-block-card').forEach(c => c.classList.remove('drag-over-block'));
      });

      // Drop on Block Header (Move Block or Move Item into Block)
      headerEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        blockCard.classList.add('drag-over-block');
      });
      headerEl.addEventListener('dragleave', (e) => {
        if (!headerEl.contains(e.relatedTarget)) {
          blockCard.classList.remove('drag-over-block');
        }
      });
      headerEl.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        blockCard.classList.remove('drag-over-block');
        const data = window.__dragData || draggedData;
        if (!data) return;

        if (data.type === 'block' && data.blockIndex !== bIdx) {
          this.store.moveBlock(data.blockIndex, bIdx);
          this.showToast(`สลับลำดับบล็อกข่าวเรียบร้อย`, 'info');
        } else if (data.type === 'item') {
          this.store.moveItemToBlock(data.globalIndex, block.id);
          this.showToast(`ย้ายประเด็นเข้าสู่ "${block.title}"`, 'success');
        }
      });

      // Block Body HTML
      const bodyEl = document.createElement('div');
      bodyEl.className = 'news-block-body';

      // Drop on Block Body
      bodyEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        bodyEl.classList.add('drag-over');
      });
      bodyEl.addEventListener('dragleave', (e) => {
        if (!bodyEl.contains(e.relatedTarget)) {
          bodyEl.classList.remove('drag-over');
        }
      });
      bodyEl.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bodyEl.classList.remove('drag-over');
        const data = window.__dragData || draggedData;
        if (data && data.type === 'item') {
          this.store.moveItemToBlock(data.globalIndex, block.id);
          this.showToast(`ย้ายประเด็นเข้าสู่ "${block.title}"`, 'success');
        }
      });

      if (blockItems.length === 0) {
        const emptyDrop = document.createElement('div');
        emptyDrop.className = 'empty-block-dropzone';
        emptyDrop.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>ยังไม่มีประเด็นในบล็อกข่าวนี้ — ลากประเด็นมาใส่ที่นี่ หรือกด "+ เพิ่มประเด็นในบล็อก"</span>
        `;
        bodyEl.appendChild(emptyDrop);
      } else {
        blockItems.forEach(({ item, globalIdx }, itemOrderInBlock) => {
          const row = this.createItemRow(item, globalIdx, items, block.id, itemOrderInBlock);
          bodyEl.appendChild(row);
        });
      }

      blockCard.appendChild(headerEl);
      blockCard.appendChild(bodyEl);
      listContainer.appendChild(blockCard);
    });

    // 2. Render Unassigned Items Section (if any unassigned items exist)
    const unassignedItems = [];
    items.forEach((item, globalIdx) => {
      if (!item.blockId || !blocks.some(b => b.id === item.blockId)) {
        unassignedItems.push({ item, globalIdx });
      }
    });

    if (unassignedItems.length > 0 || blocks.length === 0) {
      const unassignedSection = document.createElement('div');
      unassignedSection.className = 'unassigned-items-section';

      const unHeader = document.createElement('div');
      unHeader.className = 'unassigned-header mb-3';
      unHeader.innerHTML = `
        <div class="flex-center gap-2">
          <span class="fw-700 fs-sm text-secondary">📌 รายการทั่วไป / นอกบล็อกข่าว</span>
          <span class="badge badge-neutral">${unassignedItems.length} รายการ</span>
        </div>
        <span class="fs-xs text-muted">ลากรายการมาปล่อยที่นี่เพื่อนำออกจากบล็อกข่าว</span>
      `;

      unassignedSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        unassignedSection.classList.add('drag-over');
      });
      unassignedSection.addEventListener('dragleave', (e) => {
        if (!unassignedSection.contains(e.relatedTarget)) {
          unassignedSection.classList.remove('drag-over');
        }
      });
      unassignedSection.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        unassignedSection.classList.remove('drag-over');
        const data = window.__dragData || draggedData;
        if (data && data.type === 'item') {
          this.store.moveItemOutOfBlock(data.globalIndex);
          this.showToast(`นำประเด็นออกจากบล็อกข่าวแล้ว`, 'info');
        }
      });

      const unBody = document.createElement('div');
      unBody.className = 'flex flex-col gap-2';

      unassignedItems.forEach(({ item, globalIdx }, orderIdx) => {
        const row = this.createItemRow(item, globalIdx, items, null, orderIdx);
        unBody.appendChild(row);
      });

      unassignedSection.appendChild(unHeader);
      unassignedSection.appendChild(unBody);
      listContainer.appendChild(unassignedSection);
    }
  }

  createItemRow(item, globalIndex, allItems, blockId, indexInGroup) {
    const row = document.createElement('div');
    row.className = 'item-row-card';
    row.setAttribute('draggable', 'true');

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
      topicDisplay = `[L1] ${item.line1 || '-'}  |  [L2] ${item.line2 || '-'}`;
      assetsDisplay = `<span><strong>Main Bar:</strong> <code>${item.mainbar || '-'}</code></span>
                       <span><strong>Head Bar:</strong> <code>${item.headbar || 'none'}</code></span>`;
    } else if (itemID === 'bar2name') {
      headDisplay = item.head ? `${item.head} (บาร์พิธีกร 2 คน)` : 'บาร์พิธีกร 2 คน';
      topicDisplay = `พิธีกร: ${item.name1 || '-'} & ${item.name2 || '-'} (${item.line2 || '-'})`;
      assetsDisplay = `<span><strong>Main Bar:</strong> <code>${item.mainbar || '-'}</code></span>
                       <span><strong>Head Bar:</strong> <code>${item.headbar || 'none'}</code></span>`;
    } else {
      headDisplay = item.head || '';
      topicDisplay = item.topic || '(ไม่มีข้อความประเด็น)';
      assetsDisplay = `<span><strong>Main Bar:</strong> <code>${item.mainbar || '-'}</code></span>
                       <span><strong>Head Bar:</strong> <code>${item.headbar || 'none'}</code></span>`;
    }

    row.innerHTML = `
      <div class="drag-handle" title="ลากเพื่อเปลี่ยนลำดับหรือย้ายเข้า/ออกบล็อก" style="cursor: grab; display: flex; align-items: center; color: var(--text-muted); padding: 4px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="5" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle>
          <circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle>
          <circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
        </svg>
      </div>
      <div class="item-row-index">#${globalIndex + 1}</div>
      <div>
        <span class="badge badge-info">ID: ${item.itemID}</span>
      </div>
      <div class="item-row-main">
        ${headDisplay ? `<div class="item-row-head">${headDisplay}</div>` : ''}
        <div class="item-row-topic">${topicDisplay}</div>
        <div class="item-row-assets">
          ${assetsDisplay}
        </div>
      </div>
      <div class="item-row-actions">
        <button class="btn-icon btn-edit" title="แก้ไข"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
        <button class="btn-icon btn-dup" title="คัดลอก"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
        <button class="btn-icon btn-up" title="เลื่อนขึ้น" ${globalIndex === 0 ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></button>
        <button class="btn-icon btn-down" title="เลื่อนลง" ${globalIndex === allItems.length - 1 ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></button>
        <button class="btn-icon text-danger btn-del" title="ลบ"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
      </div>
    `;

    row.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      this.editorDialog.openForEdit(globalIndex);
    });
    row.querySelector('.btn-dup').addEventListener('click', (e) => {
      e.stopPropagation();
      this.store.duplicateItem(globalIndex);
      this.showToast('คัดลอกรายการ CG เรียบร้อยแล้ว', 'info');
    });
    row.querySelector('.btn-up').addEventListener('click', (e) => {
      e.stopPropagation();
      this.store.moveItem(globalIndex, globalIndex - 1);
    });
    row.querySelector('.btn-down').addEventListener('click', (e) => {
      e.stopPropagation();
      this.store.moveItem(globalIndex, globalIndex + 1);
    });
    row.querySelector('.btn-del').addEventListener('click', (e) => {
      e.stopPropagation();
      const displayTitle = item.head || item.topic || item.line1 || item.name1 || (item.logo ? item.logo.split('/').pop() : '') || `รายการ #${globalIndex + 1}`;
      if (confirm(`คุณต้องการลบรายการ "${displayTitle}" หรือไม่?`)) {
        this.store.deleteItem(globalIndex);
        this.showToast('ลบรายการ CG แล้ว', 'info');
      }
    });

    // Item Drag & Drop Events
    row.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      const dragInfo = { type: 'item', globalIndex, blockId };
      window.__dragData = dragInfo;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify(dragInfo));
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('drag-over');
    });

    row.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      row.classList.remove('drag-over');
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      row.classList.remove('drag-over');
      const data = window.__dragData || (e.dataTransfer.getData('text/plain') ? JSON.parse(e.dataTransfer.getData('text/plain')) : null);
      if (!data || data.type !== 'item') return;

      const fromIndex = data.globalIndex;
      const toIndex = globalIndex;

      if (fromIndex !== toIndex) {
        this.store.moveItem(fromIndex, toIndex);
        this.showToast(`ย้ายลำดับรายการ CG สำเร็จ`, 'info');
      }
    });

    row.addEventListener('dragend', () => {
      window.__dragData = null;
      document.querySelectorAll('.item-row-card').forEach(el => el.classList.remove('dragging', 'drag-over'));
    });

    return row;
  }

  initDeleteBlockDialog() {
    this.deleteDialog = document.getElementById('delete-block-dialog');
    if (!this.deleteDialog) return;

    const btnClose = document.getElementById('btn-close-delete-block-dialog');
    const btnCancel = document.getElementById('btn-cancel-delete-block');
    const btnConfirm = document.getElementById('btn-confirm-delete-block');

    if (btnClose) {
      btnClose.addEventListener('click', () => this.deleteDialog.close());
    }
    if (btnCancel) {
      btnCancel.addEventListener('click', () => this.deleteDialog.close());
    }
    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => {
        if (!this.pendingDeleteBlockId) return;

        const selectedMode = this.deleteDialog.querySelector('input[name="del-block-mode"]:checked')?.value || 'move';
        const deleteItemsInside = (selectedMode === 'deleteAll');

        const items = this.store.getState().items || [];
        const count = items.filter(it => it.blockId === this.pendingDeleteBlockId).length;

        this.store.deleteBlock(this.pendingDeleteBlockId, deleteItemsInside);

        if (deleteItemsInside) {
          this.showToast(`ลบบล็อกข่าว "${this.pendingDeleteBlockTitle}" และรายการภายในทั้งหมด (${count} รายการ) แล้ว`, 'warning');
        } else {
          this.showToast(`ลบบล็อกข่าว "${this.pendingDeleteBlockTitle}" แล้ว (ย้าย ${count} รายการไปเป็นรายการทั่วไป)`, 'info');
        }

        this.pendingDeleteBlockId = null;
        this.pendingDeleteBlockTitle = '';
        this.deleteDialog.close();
      });
    }

    this.deleteDialog.addEventListener('click', (e) => {
      const rect = this.deleteDialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        this.deleteDialog.close();
      }
    });
  }

  openDeleteBlockDialog(block) {
    if (!block) return;
    this.pendingDeleteBlockId = block.id;
    this.pendingDeleteBlockTitle = block.title;

    const dialog = this.deleteDialog || document.getElementById('delete-block-dialog');
    if (!dialog) return;

    const items = this.store.getState().items || [];
    const itemsInBlock = items.filter(it => it.blockId === block.id);

    const titleText = document.getElementById('del-block-title-text');
    const countText = document.getElementById('del-block-count-text');
    const choicesBox = document.getElementById('del-block-choices-box');

    if (titleText) titleText.textContent = `📁 ${block.title}`;
    if (countText) {
      countText.textContent = itemsInBlock.length > 0
        ? `มีรายการข่าวอยู่ภายในทั้งหมด ${itemsInBlock.length} รายการ`
        : `บล็อกนี้ไม่มีรายการข่าวอยู่ภายใน`;
    }

    if (choicesBox) {
      if (itemsInBlock.length === 0) {
        choicesBox.classList.add('hidden');
      } else {
        choicesBox.classList.remove('hidden');
        const radioMove = dialog.querySelector('input[name="del-block-mode"][value="move"]');
        if (radioMove) radioMove.checked = true;
      }
    }

    dialog.showModal();
  }
}
