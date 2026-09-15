/**
 * Item Editor Modal Dialog Component - Handles creation & editing of CG Items
 */
export class EditorComponent {
  constructor(store, showToast) {
    this.store = store;
    this.showToast = showToast;

    this.initElements();
    this.bindEvents();
    this.subscribeStore();
  }

  initElements() {
    this.dialog = document.getElementById('item-editor-dialog');
    this.dialogTitle = document.getElementById('editor-dialog-title');
    this.btnCloseModal = document.getElementById('btn-close-editor-modal');
    this.btnCancel = document.getElementById('btn-cancel-editor');
    this.btnSave = document.getElementById('btn-save-editor-item');

    this.inputIndex = document.getElementById('edit-item-index');
    this.selectId = document.getElementById('edit-item-id');
    this.inputTemplate = document.getElementById('edit-item-template');
    this.inputHead = document.getElementById('edit-item-head');
    this.inputTopic = document.getElementById('edit-item-topic');
    this.selectMainbar = document.getElementById('edit-item-mainbar');
    this.selectHeadbar = document.getElementById('edit-item-headbar');
    this.inputLayer = document.getElementById('edit-item-layer');
    this.inputOut = document.getElementById('edit-item-out');

    this.btnAddField = document.getElementById('btn-editor-add-field');
    this.dataFieldsList = document.getElementById('editor-datafields-list');
  }

  subscribeStore() {
    this.store.subscribe('config', (config) => {
      this.populateSelectOptions(config);
    });
  }

  populateSelectOptions(config) {
    if (!config) return;

    // 1. Populate itemID select
    if (config.itemTypes && Array.isArray(config.itemTypes)) {
      const currentVal = this.selectId.value;
      this.selectId.innerHTML = '';
      config.itemTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.value;
        opt.textContent = `${t.label} (${t.value})`;
        this.selectId.appendChild(opt);
      });
      if (currentVal !== undefined && currentVal !== null) this.selectId.value = currentVal;
    }

    // 2. Populate mainbar options select
    if (config.mainbarOptions && Array.isArray(config.mainbarOptions)) {
      const currentVal = this.selectMainbar.value;
      this.selectMainbar.innerHTML = '';
      config.mainbarOptions.forEach(optData => {
        const opt = document.createElement('option');
        opt.value = optData.value;
        opt.textContent = optData.label || optData.value;
        this.selectMainbar.appendChild(opt);
      });
      if (currentVal !== undefined && currentVal !== null) this.selectMainbar.value = currentVal;
    }

    // 3. Populate headbar options select (ensure empty option exists)
    if (config.headbarOptions && Array.isArray(config.headbarOptions)) {
      const currentVal = this.selectHeadbar.value;
      this.selectHeadbar.innerHTML = '';

      // Add blank option first if not already present in config list
      const hasEmpty = config.headbarOptions.some(o => o.value === '');
      if (!hasEmpty) {
        const noneOpt = document.createElement('option');
        noneOpt.value = '';
        noneOpt.textContent = 'none (ไม่เลือก / เว้นว่าง)';
        this.selectHeadbar.appendChild(noneOpt);
      }

      config.headbarOptions.forEach(optData => {
        const opt = document.createElement('option');
        opt.value = optData.value;
        opt.textContent = optData.label || optData.value || 'none (ไม่เลือก / เว้นว่าง)';
        this.selectHeadbar.appendChild(opt);
      });

      if (currentVal !== undefined && currentVal !== null) this.selectHeadbar.value = currentVal;
    }
  }

  bindEvents() {
    this.btnCloseModal.addEventListener('click', () => this.dialog.close());
    this.btnCancel.addEventListener('click', () => this.dialog.close());

    this.btnAddField.addEventListener('click', () => {
      this.addFieldRow('', '');
    });

    this.btnSave.addEventListener('click', () => this.saveChanges());
  }

  openForNew() {
    this.populateSelectOptions(this.store.getState().config);

    this.inputIndex.value = '-1';
    this.dialogTitle.textContent = 'สร้างรายการ CG ใหม่';
    this.inputTemplate.value = 'Example/New-bar4.html';
    this.inputHead.value = ''; // Allow blank initial head
    this.inputTopic.value = 'มอบทุนศึกษา-อุปกรณ์กีฬา รร.ผลิตนักตบทีมชาติ';
    this.inputLayer.value = '1';
    this.inputOut.value = 'manual';

    if (this.selectId.options.length > 0) this.selectId.selectedIndex = 0;
    if (this.selectMainbar.options.length > 0) this.selectMainbar.selectedIndex = 0;
    if (this.selectHeadbar.options.length > 0) this.selectHeadbar.selectedIndex = 0;

    this.dataFieldsList.innerHTML = '';
    this.dialog.showModal();
  }

  openForEdit(index) {
    this.populateSelectOptions(this.store.getState().config);

    const items = this.store.getState().items;
    if (index < 0 || index >= items.length) return;

    const item = items[index];
    this.inputIndex.value = index.toString();
    this.dialogTitle.textContent = `แก้ไขรายการ CG #${index + 1}`;

    this.selectId.value = item.itemID || 'mainbar';
    this.inputTemplate.value = item.relpath || 'Example/New-bar4.html';
    this.inputHead.value = item.head !== undefined ? item.head : '';
    this.inputTopic.value = item.topic !== undefined ? item.topic : '';
    this.selectMainbar.value = item.mainbar !== undefined ? item.mainbar : './assets/bar/MAIN BAR.png';
    this.selectHeadbar.value = item.headbar !== undefined ? item.headbar : '';
    this.inputLayer.value = item.webplayout || '1';
    this.inputOut.value = item.out || 'manual';

    this.dataFieldsList.innerHTML = '';
    if (item.DataFields && Array.isArray(item.DataFields)) {
      item.DataFields.forEach(f => {
        if (f.field !== 'f0' && f.field !== 'f1' && f.field !== 'mainbar' && f.field !== 'headbar') {
          this.addFieldRow(f.field, f.value);
        }
      });
    }

    this.dialog.showModal();
  }

  addFieldRow(key = '', val = '') {
    const row = document.createElement('div');
    row.className = 'datafield-row';
    row.innerHTML = `
      <input type="text" class="form-control font-mono df-key" placeholder="Key" value="${key}">
      <input type="text" class="form-control df-val" placeholder="Value" value="${val}">
      <button type="button" class="btn-icon text-danger btn-remove-field" title="Remove">&times;</button>
    `;

    row.querySelector('.btn-remove-field').addEventListener('click', () => row.remove());
    this.dataFieldsList.appendChild(row);
  }

  saveChanges() {
    const index = parseInt(this.inputIndex.value, 10);
    const itemID = this.selectId.value || 'mainbar';
    const template = this.inputTemplate.value.trim();
    const head = this.inputHead.value; // Allow empty string
    const topic = this.inputTopic.value.trim();
    const mainbar = this.selectMainbar.value;
    const headbar = this.selectHeadbar.value; // Allow empty string
    const layer = this.inputLayer.value.trim() || '1';
    const out = this.inputOut.value;

    if (!itemID || !topic) {
      this.showToast('กรุณากรอกข้อมูล Topic ให้ครบถ้วน', 'warning');
      return;
    }

    const customFields = [];
    const rows = this.dataFieldsList.querySelectorAll('.datafield-row');
    rows.forEach(r => {
      const k = r.querySelector('.df-key').value.trim();
      const v = r.querySelector('.df-val').value.trim();
      if (k) customFields.push({ field: k, value: v });
    });

    const itemData = {
      itemID,
      relpath: template,
      head: head || '',
      topic,
      mainbar: mainbar || './assets/bar/MAIN BAR.png',
      headbar: headbar || '',
      webplayout: layer,
      out,
      customFields
    };

    if (index === -1) {
      this.store.addItem(itemData);
      this.showToast('สร้างรายการ CG ใหม่สำเร็จ', 'success');
    } else {
      this.store.updateItem(index, itemData);
      this.showToast('บันทึกการแก้ไขสำเร็จ', 'success');
    }

    this.dialog.close();
  }
}
