/**
 * VIEW 4: System Settings (หน้าจอตั้งค่า) - SPX API & Config.json Management
 */
export class SettingsView {
  constructor(container, api, store, showToast) {
    this.container = container;
    this.api = api;
    this.store = store;
    this.showToast = showToast;

    this.render();
    this.subscribeStore();
  }

  subscribeStore() {
    this.store.subscribe('config', (config) => {
      this.renderConfigEditor(config);
    });
  }

  render() {
    const { apiUrl, apiKey, config } = this.store.getState();

    const currentHost = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
    const currentPort = (typeof window !== 'undefined' && window.location && window.location.port) ? window.location.port : '8080';
    const defaultEndpointUrl = `http://${currentHost}:${currentPort}/mainbar`;

    this.container.innerHTML = `
      <div class="settings-container">
        <!-- Card 1: Config.json Options Management -->
        <div class="card">
          <div class="card-header flex-between">
            <div>
              <h3>การตั้งค่าตัวเลือก CG & ไฟล์ config.json</h3>
              <p class="text-muted fs-xs">จัดการตัวเลือก ชนิด CG (itemID), ข้อความใช้บ่อย (Presets) และไฟล์รูปภาพ Assets</p>
            </div>
            <button class="btn btn-xs btn-outline" id="btn-reload-config">
              🔄 โหลดข้อมูลล่าสุด
            </button>
          </div>
          <div class="card-body">
            <!-- 1. Item Types Section -->
            <div class="mb-4">
              <div class="flex-between mb-2">
                <label class="form-label mb-0">รายการชนิด CG (itemID Options)</label>
                <button type="button" class="btn btn-xs btn-outline" id="btn-add-itemtype">+ เพิ่มชนิด CG</button>
              </div>
              <div class="datafields-list" id="itemtypes-container">
                <!-- Dynamically rendered -->
              </div>
            </div>

            <!-- 2. Quick Preset Tags Section -->
            <div class="mb-4">
              <div class="flex-between mb-2">
                <label class="form-label mb-0">รายการข้อความ Top Bar ที่ใช้บ่อย (Quick Presets)</label>
                <button type="button" class="btn btn-xs btn-outline" id="btn-add-preset-head">+ เพิ่มข้อความ</button>
              </div>
              <div class="datafields-list" id="presets-container">
                <!-- Dynamically rendered -->
              </div>
            </div>

            <!-- 3. Asset Choices Section (3 Columns: Mainbar, Headbar, Logo) -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="form-label mb-1">Main Bar (./assets/bar)</label>
                <ul class="fs-xs font-mono p-2 bg-slate-100 rounded border" style="max-height: 150px; overflow-y: auto;" id="mainbar-assets-list"></ul>
              </div>
              <div>
                <label class="form-label mb-1">Head Bar (./assets/head)</label>
                <ul class="fs-xs font-mono p-2 bg-slate-100 rounded border" style="max-height: 150px; overflow-y: auto;" id="headbar-assets-list"></ul>
              </div>
              <div>
                <label class="form-label mb-1">Logo (./assets/logo)</label>
                <ul class="fs-xs font-mono p-2 bg-slate-100 rounded border" style="max-height: 150px; overflow-y: auto;" id="logo-assets-list"></ul>
              </div>
            </div>

            <div class="mt-4 flex-between">
              <button class="btn btn-secondary btn-sm" id="btn-rescan-assets">
                🔍 สแกนไฟล์รูปภาพใน Assets ใหม่
              </button>
              <button class="btn btn-primary" id="btn-save-config-file">
                💾 บันทึกลงไฟล์ data/config.json
              </button>
            </div>
          </div>
        </div>

        <!-- Card 2: SPX API Server Configuration -->
        <div class="card">
          <div class="card-header">
            <h3>การตั้งค่าการเชื่อมต่อ SPX Server API</h3>
            <p class="text-muted fs-xs">กำหนด URL ของ SPX Graphics Controller</p>
          </div>
          <div class="card-body">
            <form id="settings-form" onsubmit="return false;">
              <div class="form-group">
                <label class="form-label" for="cfg-api-url">SPX Server API Base URL</label>
                <input type="url" class="form-control" id="cfg-api-url" value="${apiUrl}" required>
                <span class="text-muted fs-xs">ค่าเริ่มต้นมาตรฐาน: http://${currentHost}:5656/api/v1 (หรือใช้ Reverse Proxy อัตโนมัติ)</span>
              </div>

              <div class="form-group mt-3">
                <label class="form-label" for="cfg-api-key">API Key (ถ้ามี)</label>
                <input type="password" class="form-control" id="cfg-api-key" value="${apiKey}" placeholder="ป้อน API Key หากเปิดใช้งาน">
              </div>

              <div class="form-group mt-3">
                <label class="form-label" for="cfg-endpoint-url">Frontend JSON Endpoint Path (สำหรับให้ SPX ดึงข้อมูล)</label>
                <input type="text" class="form-control font-mono" id="cfg-endpoint-url" value="${defaultEndpointUrl}">
              </div>

              <div class="flex-between mt-4">
                <button type="button" class="btn btn-secondary" id="btn-test-spx-conn">
                  ทดสอบการเชื่อมต่อ API
                </button>
                <button type="button" class="btn btn-primary" id="btn-save-spx-cfg">
                  บันทึกการตั้งค่า API
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="card hidden" id="settings-diag-box">
          <div class="card-header">
            <h4>ผลการวินิจฉัยเซิร์ฟเวอร์ (SPX Server Diagnostics)</h4>
          </div>
          <div class="card-body">
            <pre class="json-preview-box" id="settings-diag-content"></pre>
          </div>
        </div>
      </div>
    `;

    // Bind Controls
    document.getElementById('btn-add-itemtype').addEventListener('click', () => {
      this.addItemTypeRow('ชนิดใหม่', 'new_item');
    });

    document.getElementById('btn-add-preset-head').addEventListener('click', () => {
      this.addPresetHeadRow('ข้อความใหม่');
    });

    document.getElementById('btn-reload-config').addEventListener('click', async () => {
      await this.store.loadConfigFromBackend();
      this.showToast('โหลดข้อมูล config.json เรียบร้อยแล้ว', 'info');
    });

    document.getElementById('btn-rescan-assets').addEventListener('click', async () => {
      const config = await this.store.rescanAssets();
      this.renderConfigEditor(config);
      this.showToast('สแกนไฟล์รูปภาพใน Assets สำเร็จ! อัปเดตรายการรูปภาพใหม่เรียบร้อยแล้ว', 'success');
    });

    document.getElementById('btn-save-config-file').addEventListener('click', async () => {
      await this.saveConfigFile();
    });

    document.getElementById('btn-test-spx-conn').addEventListener('click', async () => {
      const url = document.getElementById('cfg-api-url').value.trim();
      const key = document.getElementById('cfg-api-key').value.trim();
      const tempApi = new (this.api.constructor)(url, key);

      const diagBox = document.getElementById('settings-diag-box');
      const diagContent = document.getElementById('settings-diag-content');

      try {
        const res = await tempApi.getVersion();
        diagBox.classList.remove('hidden');
        diagContent.textContent = JSON.stringify(res, null, 2);
        this.showToast('เชื่อมต่อกับ SPX Server API สำเร็จ!', 'success');
      } catch (err) {
        diagBox.classList.remove('hidden');
        diagContent.textContent = `Error connecting to SPX: ${err.message}`;
        this.showToast('ไม่สามารถเชื่อมต่อกับ SPX Server ได้', 'danger');
      }
    });

    document.getElementById('btn-save-spx-cfg').addEventListener('click', () => {
      const url = document.getElementById('cfg-api-url').value.trim();
      const key = document.getElementById('cfg-api-key').value.trim();

      localStorage.setItem('spx_api_url', url);
      localStorage.setItem('spx_api_key', key);

      this.api.setBaseUrl(url);
      this.api.setApiKey(key);
      this.store.setState({ apiUrl: url, apiKey: key });

      this.showToast('บันทึกการตั้งค่า API เรียบร้อยแล้ว', 'success');
    });

    this.renderConfigEditor(config);
  }

  renderConfigEditor(config) {
    const itemTypesContainer = document.getElementById('itemtypes-container');
    const presetsContainer = document.getElementById('presets-container');
    const mainbarList = document.getElementById('mainbar-assets-list');
    const headbarList = document.getElementById('headbar-assets-list');
    const logoList = document.getElementById('logo-assets-list');

    if (!itemTypesContainer) return;

    // Render itemTypes rows
    itemTypesContainer.innerHTML = '';
    if (config && config.itemTypes && Array.isArray(config.itemTypes)) {
      config.itemTypes.forEach(t => this.addItemTypeRow(t.label, t.value));
    } else {
      this.addItemTypeRow('Logo บาร์', 'logo');
      this.addItemTypeRow('บาร์ประเด็น', 'mainbar');
      this.addItemTypeRow('บาร์ 2 บรรทัด', 'bar2line');
      this.addItemTypeRow('บาร์พิธีกร 2 คน', 'bar2name');
    }

    // Render Preset Heads rows
    if (presetsContainer) {
      presetsContainer.innerHTML = '';
      const presets = (config && config.presetHeads && Array.isArray(config.presetHeads)) ? config.presetHeads : ["ประเด็นร้อน", "สถานการณ์เด่น", "สัมภาษณ์ทางโทรศัพท์"];
      presets.forEach(p => this.addPresetHeadRow(p));
    }

    // Render Assets Lists
    if (mainbarList && config && config.mainbarOptions) {
      mainbarList.innerHTML = config.mainbarOptions.map(o => `<li>• ${o.label}</li>`).join('') || '<li class="text-muted">ไม่มีไฟล์</li>';
    }
    if (headbarList && config && config.headbarOptions) {
      headbarList.innerHTML = config.headbarOptions.map(o => `<li>• ${o.label}</li>`).join('') || '<li class="text-muted">ไม่มีไฟล์</li>';
    }
    if (logoList && config && config.logoOptions) {
      logoList.innerHTML = config.logoOptions.length > 0
        ? config.logoOptions.map(o => `<li>• ${o.label}</li>`).join('')
        : '<li class="text-muted">ไม่มีไฟล์ใน assets/logo</li>';
    }
  }

  addItemTypeRow(label = '', value = '') {
    const container = document.getElementById('itemtypes-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'datafield-row';
    row.innerHTML = `
      <input type="text" class="form-control it-label" placeholder="ชื่อเรียก (e.g. บาร์ประเด็น)" value="${label}">
      <input type="text" class="form-control font-mono it-value" placeholder="itemID (e.g. mainbar)" value="${value}">
      <button type="button" class="btn-icon text-danger btn-remove-it" title="Remove">&times;</button>
    `;

    row.querySelector('.btn-remove-it').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  addPresetHeadRow(text = '') {
    const container = document.getElementById('presets-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'datafield-row';
    row.style.gridTemplateColumns = '1fr 32px';
    row.innerHTML = `
      <input type="text" class="form-control preset-val" placeholder="ข้อความที่ใช้บ่อย (e.g. ประเด็นร้อน)" value="${text}">
      <button type="button" class="btn-icon text-danger btn-remove-preset" title="Remove">&times;</button>
    `;

    row.querySelector('.btn-remove-preset').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  async saveConfigFile() {
    const itemContainer = document.getElementById('itemtypes-container');
    const presetContainer = document.getElementById('presets-container');

    const itemTypes = [];
    if (itemContainer) {
      const rows = itemContainer.querySelectorAll('.datafield-row');
      rows.forEach(r => {
        const label = r.querySelector('.it-label').value.trim();
        const value = r.querySelector('.it-value').value.trim();
        if (label && value) {
          itemTypes.push({ label, value });
        }
      });
    }

    const presetHeads = [];
    if (presetContainer) {
      const rows = presetContainer.querySelectorAll('.datafield-row');
      rows.forEach(r => {
        const val = r.querySelector('.preset-val').value.trim();
        if (val) presetHeads.push(val);
      });
    }

    const currentConfig = this.store.getState().config || {};
    const newConfig = {
      ...currentConfig,
      itemTypes,
      presetHeads
    };

    try {
      const res = await this.api.saveConfig(newConfig);
      if (res && res.config) {
        this.store.setState({ config: res.config });
      } else {
        this.store.setState({ config: newConfig });
      }
      this.showToast('บันทึกการตั้งค่าลง data/config.json สำเร็จ!', 'success');
    } catch (err) {
      this.showToast(`บันทึกล้มเหลว: ${err.message}`, 'danger');
    }
  }
}
