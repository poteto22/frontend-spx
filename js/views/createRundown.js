/**
 * VIEW 2: Create Rundown Workspace (หน้าจอสร้าง Rundown)
 */
export class CreateRundownView {
  constructor(container, api, store, editorDialog, showToast) {
    this.container = container;
    this.api = api;
    this.store = store;
    this.editorDialog = editorDialog;
    this.showToast = showToast;

    this.render();
    this.subscribeStore();
  }

  subscribeStore() {
    this.store.subscribe('items', (items) => this.renderItems(items));
    this.store.subscribe('currentRundownName', (name) => {
      const nameEl = document.getElementById('cr-rundown-name');
      if (nameEl) nameEl.textContent = name;
    });
  }

  render() {
    const { currentRundownName, items } = this.store.getState();

    this.container.innerHTML = `
      <div class="rundown-workspace-toolbar">
        <div class="flex-center gap-3">
          <h2>หน้าจอสร้าง Rundown</h2>
          <span class="badge badge-info fs-xs" id="cr-rundown-name">${currentRundownName || 'MainRundown'}</span>
        </div>
        
        <div class="flex-center gap-2">
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

      <!-- Rundown Items Container -->
      <div class="items-table-container" id="cr-items-list">
        <!-- Rendered items -->
      </div>
    `;

    // Bind Action Buttons
    document.getElementById('btn-cr-add').addEventListener('click', () => {
      this.editorDialog.openForNew();
    });

    document.getElementById('btn-cr-save-spx').addEventListener('click', async () => {
      let { currentProject, currentRundownName, items } = this.store.getState();
      try {
        const payload = {
          comment: 'Created in SPX Front-End Workspace',
          templates: items
        };
        await this.api.saveRundownJSON(currentProject || 'Nation', currentRundownName || 'MainRundown', payload);
        this.showToast(`บันทึกไฟล์ Rundown "${currentRundownName}" ไปยัง SPX เรียบร้อยแล้ว`, 'success');
      } catch (err) {
        this.showToast(`บันทึกล้มเหลว: ${err.message}`, 'danger');
      }
    });

    document.getElementById('btn-cr-export').addEventListener('click', () => {
      const { currentRundownName, items } = this.store.getState();
      const exportContent = { templates: items };
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
          let items = Array.isArray(parsed) ? parsed : (parsed.templates || []);
          this.store.setState({ items });
          this.showToast(`นำเข้าข้อมูล CG สำเร็จ (${items.length} รายการ)`, 'success');
        } catch (err) {
          this.showToast(`ไฟล์ JSON ไม่ถูกต้อง: ${err.message}`, 'danger');
        }
      };
      reader.readAsText(file);
    });

    this.renderItems(items);
  }

  renderItems(items) {
    const listContainer = document.getElementById('cr-items-list');
    if (!listContainer) return;

    if (!items || items.length === 0) {
      listContainer.innerHTML = `
        <div class="card p-4 text-center text-muted">
          <h4>ยังไม่มีรายการ CG ใน Rundown</h4>
          <p class="fs-sm mt-1">กดปุ่ม "+ สร้างรายการ CG ใหม่" ด้านบนเพื่อเริ่มเพิ่มหัวเรื่องและข้อมูล CG</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    let draggedIndex = null;

    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'item-row-card';
      row.setAttribute('draggable', 'true');

      row.innerHTML = `
        <div class="drag-handle" title="ลากเพื่อเปลี่ยนลำดับ" style="cursor: grab; display: flex; align-items: center; color: var(--text-muted); padding: 4px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle>
            <circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle>
            <circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
          </svg>
        </div>
        <div class="item-row-index">#${index + 1}</div>
        <div>
          <span class="badge badge-info">ID: ${item.itemID}</span>
        </div>
        <div class="item-row-main">
          <div class="item-row-head">${item.head || '(ไม่มีหัวเรื่อง)'}</div>
          <div class="item-row-topic">${item.topic}</div>
          <div class="item-row-assets">
            <span><strong>Main Bar:</strong> <code>${item.mainbar}</code></span>
            <span><strong>Head Bar:</strong> <code>${item.headbar}</code></span>
          </div>
        </div>
        <div class="item-row-actions">
          <button class="btn-icon btn-edit" title="แก้ไข"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
          <button class="btn-icon btn-dup" title="คัดลอก"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
          <button class="btn-icon btn-up" title="เลื่อนขึ้น" ${index === 0 ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></button>
          <button class="btn-icon btn-down" title="เลื่อนลง" ${index === items.length - 1 ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></button>
          <button class="btn-icon text-danger btn-del" title="ลบ"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        </div>
      `;

      row.querySelector('.btn-edit').addEventListener('click', () => this.editorDialog.openForEdit(index));
      row.querySelector('.btn-dup').addEventListener('click', () => {
        this.store.duplicateItem(index);
        this.showToast('คัดลอกรายการ CG เรียบร้อยแล้ว', 'info');
      });
      row.querySelector('.btn-up').addEventListener('click', () => this.store.moveItem(index, index - 1));
      row.querySelector('.btn-down').addEventListener('click', () => this.store.moveItem(index, index + 1));
      row.querySelector('.btn-del').addEventListener('click', () => {
        if (confirm(`ลบรายการ "${item.head || item.topic}"?`)) {
          this.store.deleteItem(index);
          this.showToast('ลบรายการ CG แล้ว', 'info');
        }
      });

      // Drag & Drop
      row.addEventListener('dragstart', (e) => {
        draggedIndex = index;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.classList.add('drag-over');
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        const fromIndex = draggedIndex !== null ? draggedIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIndex = index;

        if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== toIndex) {
          this.store.moveItem(fromIndex, toIndex);
          this.showToast(`เปลี่ยนลำดับรายการ #${fromIndex + 1} ➔ #${toIndex + 1}`, 'info');
        }
      });

      row.addEventListener('dragend', () => {
        draggedIndex = null;
        listContainer.querySelectorAll('.item-row-card').forEach((el) => {
          el.classList.remove('dragging', 'drag-over');
        });
      });

      listContainer.appendChild(row);
    });
  }
}
