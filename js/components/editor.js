/**
 * Item Editor Modal Dialog Component - Progressive CG Item Creation & Editing
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
    this.stepFields = document.getElementById('editor-step-fields');

    // Head and Quick Presets
    this.sectionHead = document.getElementById('section-head');
    this.inputHead = document.getElementById('edit-item-head');
    this.presetHeadTags = document.getElementById('preset-head-tags');

    // CG Type Groups
    this.fieldsLogo = document.getElementById('fields-logo');
    this.selectLogo = document.getElementById('edit-item-logo');

    this.fieldsMainbar = document.getElementById('fields-mainbar');
    this.inputTopic = document.getElementById('edit-item-topic');

    this.fieldsBar2line = document.getElementById('fields-bar2line');
    this.inputLine1 = document.getElementById('edit-item-line1');
    this.inputLine2Bar2line = document.getElementById('edit-item-line2-bar2line');

    this.fieldsBar2name = document.getElementById('fields-bar2name');
    this.inputName1 = document.getElementById('edit-item-name1');
    this.inputName2 = document.getElementById('edit-item-name2');
    this.inputLine2Bar2name = document.getElementById('edit-item-line2-bar2name');

    // Bar Images & Advanced
    this.sectionBarAssets = document.getElementById('section-bar-assets');
    this.selectMainbar = document.getElementById('edit-item-mainbar');
    this.selectHeadbar = document.getElementById('edit-item-headbar');
    this.inputTemplate = document.getElementById('edit-item-template');
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
      this.selectId.innerHTML = '<option value="">-- กรุณาเลือกประเภท CG --</option>';
      config.itemTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.value;
        opt.textContent = `${t.label} (${t.value})`;
        this.selectId.appendChild(opt);
      });
      if (currentVal) this.selectId.value = currentVal;
    }

    // 2. Populate logo options select
    if (this.selectLogo) {
      const currentVal = this.selectLogo.value;
      this.selectLogo.innerHTML = '';
      if (config.logoOptions && Array.isArray(config.logoOptions) && config.logoOptions.length > 0) {
        config.logoOptions.forEach(optData => {
          const opt = document.createElement('option');
          opt.value = optData.value;
          opt.textContent = optData.label || optData.value;
          this.selectLogo.appendChild(opt);
        });
      } else {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = './assets/logo/logo-default.png';
        defaultOpt.textContent = 'logo-default.png (ค่าเริ่มต้น)';
        this.selectLogo.appendChild(defaultOpt);
      }
      if (currentVal) this.selectLogo.value = currentVal;
    }

    // 3. Populate mainbar options select
    if (config.mainbarOptions && Array.isArray(config.mainbarOptions)) {
      const currentVal = this.selectMainbar.value;
      this.selectMainbar.innerHTML = '';
      config.mainbarOptions.forEach(optData => {
        const opt = document.createElement('option');
        opt.value = optData.value;
        opt.textContent = optData.label || optData.value;
        this.selectMainbar.appendChild(opt);
      });
      if (currentVal) this.selectMainbar.value = currentVal;
    }

    // 4. Populate headbar options select
    if (config.headbarOptions && Array.isArray(config.headbarOptions)) {
      const currentVal = this.selectHeadbar.value;
      this.selectHeadbar.innerHTML = '';

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

    // 5. Render Quick Preset Buttons
    this.renderPresetButtons(config.presetHeads || ["ประเด็นร้อน", "สถานการณ์เด่น", "สัมภาษณ์ทางโทรศัพท์"]);
  }

  renderPresetButtons(presets) {
    if (!this.presetHeadTags) return;
    this.presetHeadTags.innerHTML = '';

    presets.forEach(text => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-tag-btn';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        this.inputHead.value = text;
        this.showToast(`ใส่ข้อความ Top Bar: "${text}"`, 'info');
      });
      this.presetHeadTags.appendChild(btn);
    });
  }

  bindEvents() {
    this.btnCloseModal.addEventListener('click', () => this.dialog.close());
    this.btnCancel.addEventListener('click', () => this.dialog.close());

    this.selectId.addEventListener('change', (e) => {
      this.handleItemTypeChange(e.target.value);
    });

    this.btnAddField.addEventListener('click', () => {
      this.addFieldRow('', '');
    });

    this.btnSave.addEventListener('click', () => this.saveChanges());
  }

  handleItemTypeChange(selectedType) {
    if (!selectedType) {
      this.stepFields.classList.add('hidden');
      this.btnSave.disabled = true;
      return;
    }

    this.stepFields.classList.remove('hidden');
    this.btnSave.disabled = false;

    // Hide all type groups first
    this.fieldsLogo.classList.add('hidden');
    this.fieldsMainbar.classList.add('hidden');
    this.fieldsBar2line.classList.add('hidden');
    this.fieldsBar2name.classList.add('hidden');

    if (selectedType === 'logo') {
      this.fieldsLogo.classList.remove('hidden');
      this.sectionHead.classList.add('hidden');
      this.sectionBarAssets.classList.add('hidden');
    } else if (selectedType === 'mainbar') {
      this.fieldsMainbar.classList.remove('hidden');
      this.sectionHead.classList.remove('hidden');
      this.sectionBarAssets.classList.remove('hidden');
    } else if (selectedType === 'bar2line') {
      this.fieldsBar2line.classList.remove('hidden');
      this.sectionHead.classList.remove('hidden');
      this.sectionBarAssets.classList.remove('hidden');
    } else if (selectedType === 'bar2name') {
      this.fieldsBar2name.classList.remove('hidden');
      this.sectionHead.classList.remove('hidden');
      this.sectionBarAssets.classList.remove('hidden');
    }
  }

  openForNew() {
    this.populateSelectOptions(this.store.getState().config);

    this.inputIndex.value = '-1';
    this.dialogTitle.textContent = 'สร้างรายการ CG ใหม่';
    this.selectId.value = '';

    this.inputHead.value = '';
    this.inputTopic.value = '';
    this.inputLine1.value = '';
    this.inputLine2Bar2line.value = '';
    this.inputName1.value = '';
    this.inputName2.value = '';
    this.inputLine2Bar2name.value = '';

    this.inputTemplate.value = 'Example/New-bar4.html';
    this.inputLayer.value = '1';
    this.inputOut.value = 'manual';

    if (this.selectLogo.options.length > 0) this.selectLogo.selectedIndex = 0;
    if (this.selectMainbar.options.length > 0) this.selectMainbar.selectedIndex = 0;
    if (this.selectHeadbar.options.length > 0) this.selectHeadbar.selectedIndex = 0;

    this.dataFieldsList.innerHTML = '';
    this.handleItemTypeChange('');
    this.dialog.showModal();
  }

  openForEdit(index) {
    this.populateSelectOptions(this.store.getState().config);

    const items = this.store.getState().items;
    if (index < 0 || index >= items.length) return;

    const item = items[index];
    this.inputIndex.value = index.toString();
    this.dialogTitle.textContent = `แก้ไขรายการ CG #${index + 1}`;

    const itemID = item.itemID || 'mainbar';
    this.selectId.value = itemID;

    this.inputHead.value = item.head !== undefined ? item.head : '';
    this.inputTopic.value = item.topic !== undefined ? item.topic : '';
    this.inputLine1.value = item.line1 !== undefined ? item.line1 : '';
    this.inputLine2Bar2line.value = item.line2 !== undefined ? item.line2 : '';
    this.inputName1.value = item.name1 !== undefined ? item.name1 : '';
    this.inputName2.value = item.name2 !== undefined ? item.name2 : '';
    this.inputLine2Bar2name.value = item.line2 !== undefined ? item.line2 : '';

    if (item.logo) this.selectLogo.value = item.logo;
    if (item.mainbar) this.selectMainbar.value = item.mainbar;
    if (item.headbar !== undefined) this.selectHeadbar.value = item.headbar;

    this.inputTemplate.value = item.relpath || 'Example/New-bar4.html';
    this.inputLayer.value = item.webplayout || '1';
    this.inputOut.value = item.out || 'manual';

    this.dataFieldsList.innerHTML = '';
    if (item.DataFields && Array.isArray(item.DataFields)) {
      const standardKeys = ['f0', 'f1', 'line1', 'line2', 'name1', 'name2', 'logo', 'mainbar', 'headbar'];
      item.DataFields.forEach(f => {
        if (!standardKeys.includes(f.field)) {
          this.addFieldRow(f.field, f.value);
        }
      });
    }

    this.handleItemTypeChange(itemID);
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
    const itemID = this.selectId.value;

    if (!itemID) {
      this.showToast('กรุณาเลือกประเภทของ CG ก่อนบันทึก', 'warning');
      return;
    }

    const head = this.inputHead.value.trim();
    const template = this.inputTemplate.value.trim() || 'Example/New-bar4.html';
    const mainbar = this.selectMainbar.value || './assets/bar/BAR.png';
    const headbar = this.selectHeadbar.value;
    const layer = this.inputLayer.value.trim() || '1';
    const out = this.inputOut.value;

    let itemData = {
      itemID,
      relpath: template,
      webplayout: layer,
      out
    };

    if (itemID === 'logo') {
      const logo = this.selectLogo.value;
      if (!logo) {
        this.showToast('กรุณาเลือก Logo', 'warning');
        return;
      }
      itemData.logo = logo;
      itemData.topic = `Logo: ${logo.split('/').pop()}`;
    } else if (itemID === 'mainbar') {
      const topic = this.inputTopic.value.trim();
      if (!topic) {
        this.showToast('กรุณากรอก Topic (ประเด็น)', 'warning');
        return;
      }
      itemData.head = head;
      itemData.topic = topic;
      itemData.mainbar = mainbar;
      itemData.headbar = headbar;
    } else if (itemID === 'bar2line') {
      const line1 = this.inputLine1.value.trim();
      const line2 = this.inputLine2Bar2line.value.trim();
      if (!line1 || !line2) {
        this.showToast('กรุณากรอก Line Top และ Line Bottom ให้ครบถ้วน', 'warning');
        return;
      }
      itemData.head = head;
      itemData.line1 = line1;
      itemData.line2 = line2;
      itemData.topic = `${line1} / ${line2}`;
      itemData.mainbar = mainbar;
      itemData.headbar = headbar;
    } else if (itemID === 'bar2name') {
      const name1 = this.inputName1.value.trim();
      const name2 = this.inputName2.value.trim();
      const line2 = this.inputLine2Bar2name.value.trim();
      if (!name1 || !name2 || !line2) {
        this.showToast('กรุณากรอก Name Left, Name Right และ ตำแหน่งพิธีกร ให้ครบถ้วน', 'warning');
        return;
      }
      itemData.head = head;
      itemData.name1 = name1;
      itemData.name2 = name2;
      itemData.line2 = line2;
      itemData.topic = `${name1} & ${name2} (${line2})`;
      itemData.mainbar = mainbar;
      itemData.headbar = headbar;
    }

    const customFields = [];
    const rows = this.dataFieldsList.querySelectorAll('.datafield-row');
    rows.forEach(r => {
      const k = r.querySelector('.df-key').value.trim();
      const v = r.querySelector('.df-val').value.trim();
      if (k) customFields.push({ field: k, value: v });
    });
    itemData.customFields = customFields;

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
