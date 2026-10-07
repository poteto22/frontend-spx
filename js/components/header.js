/**
 * Header Component - Handles API connection UI, settings modal, Emergency Panic, Stop All
 */
export class HeaderComponent {
  constructor(api, store, showToast) {
    this.api = api;
    this.store = store;
    this.showToast = showToast;

    this.initElements();
    this.bindEvents();
    this.subscribeStore();
  }

  initElements() {
    this.statusDot = document.getElementById('status-dot');
    this.statusLabel = document.getElementById('status-label');
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.btnStopAll = document.getElementById('btn-stop-all-layers');
    this.btnPanic = document.getElementById('btn-panic');

    // Settings Modal
    this.settingsDialog = document.getElementById('settings-dialog');
    this.btnCloseSettings = document.getElementById('btn-close-settings-modal');
    this.settingApiUrl = document.getElementById('setting-api-url');
    this.settingApiKey = document.getElementById('setting-api-key');
    this.btnTestConn = document.getElementById('btn-test-connection');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.serverInfoBox = document.getElementById('server-info-box');
    this.serverInfoJson = document.getElementById('server-info-json');
  }

  bindEvents() {
    // Open Settings Modal
    this.btnOpenSettings.addEventListener('click', () => {
      const { apiUrl, apiKey } = this.store.getState();
      this.settingApiUrl.value = apiUrl;
      this.settingApiKey.value = apiKey;
      this.settingsDialog.showModal();
    });

    this.btnCloseSettings.addEventListener('click', () => {
      this.settingsDialog.close();
    });

    // Test Connection
    this.btnTestConn.addEventListener('click', async () => {
      const url = this.settingApiUrl.value.trim();
      const key = this.settingApiKey.value.trim();

      const tempApi = new (this.api.constructor)(url, key);
      try {
        const info = await tempApi.getVersion();
        this.serverInfoBox.classList.remove('hidden');
        this.serverInfoJson.textContent = JSON.stringify(info, null, 2);
        this.showToast('Connection test successful!', 'success');
      } catch (err) {
        this.serverInfoBox.classList.remove('hidden');
        this.serverInfoJson.textContent = `Error: ${err.message}`;
        this.showToast('Failed to connect to SPX server.', 'danger');
      }
    });

    // Save Settings
    this.btnSaveSettings.addEventListener('click', async () => {
      const url = this.settingApiUrl.value.trim();
      const key = this.settingApiKey.value.trim();

      localStorage.setItem('spx_api_url', url);
      localStorage.setItem('spx_api_key', key);

      this.api.setBaseUrl(url);
      this.api.setApiKey(key);
      this.store.setState({ apiUrl: url, apiKey: key });

      this.settingsDialog.close();
      this.showToast('SPX API settings updated.', 'info');
      this.checkConnection();
    });

    // Emergency Panic
    this.btnPanic.addEventListener('click', async () => {
      if (confirm('🚨 EMERGENCY PANIC!\n\nAre you sure you want to clear ALL graphic layers immediately without out-animations?')) {
        this.store.stopAllGraphics();
        try {
          const res = await this.api.panic();
          this.showToast(res.info || 'Panic executed. All layers cleared!', 'warning');
        } catch (err) {
          this.showToast(`Panic action failed: ${err.message}`, 'danger');
        }
      }
    });

    // Stop All Layers
    this.btnStopAll.addEventListener('click', async () => {
      this.store.stopAllGraphics();
      try {
        const state = this.store.getState();
        const items = state.items || [];
        const additionalIDs = items.map(it => it.itemID).filter(Boolean);
        const rundownFile = state.spxLoadedRundown || (state.config && state.config.spxRundownFile) || 'Inside_Thailand/Live';
        await this.api.stopAllLayers(rundownFile, additionalIDs);
        this.showToast('⏹ STOP ALL: สั่งหยุดแสดงผลกราฟิกทั้งหมดเรียบร้อยแล้ว', 'info');
      } catch (err) {
        this.showToast(`Stop All failed: ${err.message}`, 'danger');
      }
    });
  }

  subscribeStore() {
    this.store.subscribe('isConnected', (isConnected) => {
      this.updateStatusUI(isConnected);
    });
  }

  async checkConnection() {
    this.statusDot.className = 'status-dot checking';
    this.statusLabel.textContent = 'Connecting...';
    try {
      const info = await this.api.getVersion();
      this.store.setState({ isConnected: true, serverInfo: info });
    } catch (err) {
      this.store.setState({ isConnected: false, serverInfo: null });
    }
  }

  updateStatusUI(isConnected) {
    if (isConnected) {
      this.statusDot.className = 'status-dot connected';
      const info = this.store.getState().serverInfo;
      this.statusLabel.textContent = info ? `${info.product} (v${info.version})` : 'Connected';
    } else {
      this.statusDot.className = 'status-dot disconnected';
      this.statusLabel.textContent = 'Disconnected';
    }
  }
}
