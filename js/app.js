/**
 * SPX Graphics Controller Front-End Application Bootstrapper
 */
import { SPXClient } from './api.js';
import { Store } from './store.js';
import { EditorComponent } from './components/editor.js';
import { MainRundownView } from './views/mainRundown.js';
import { CreateRundownView } from './views/createRundown.js';
import { ControllerView } from './views/controller.js';
import { SettingsView } from './views/settings.js';

class App {
  constructor() {
    this.store = new Store();
    const { apiUrl, apiKey } = this.store.getState();
    this.api = new SPXClient(apiUrl, apiKey);
    this.store.setApiClient(this.api);

    this.initToastSystem();
    this.initScreenNavigation();
    this.initComponents();
    this.subscribeAutoSaveUI();
    this.startPollingLoop();
  }

  initToastSystem() {
    this.toastContainer = document.getElementById('toast-container');

    this.showToast = (message, type = 'info', duration = 3500) => {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      const iconMap = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        danger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
      };

      toast.innerHTML = `
        ${iconMap[type] || iconMap.info}
        <span>${message}</span>
      `;

      this.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    };
  }

  initScreenNavigation() {
    const screenBtns = document.querySelectorAll('.nav-screen-btn');
    const screenViews = document.querySelectorAll('.screen-view');

    screenBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetViewId = btn.dataset.view;
        screenBtns.forEach(b => b.classList.remove('active'));
        screenViews.forEach(v => v.classList.remove('active'));

        btn.classList.add('active');
        const targetView = document.getElementById(targetViewId);
        if (targetView) targetView.classList.add('active');

        this.store.setState({ activeView: targetViewId });
      });
    });
  }

  initComponents() {
    this.statusDot = document.getElementById('status-dot');
    this.statusLabel = document.getElementById('status-label');
    this.btnStopAll = document.getElementById('btn-stop-all-layers');
    this.btnPanic = document.getElementById('btn-panic');

    // Emergency Controls
    this.btnPanic.addEventListener('click', async () => {
      if (confirm('🚨 EMERGENCY PANIC!\n\nคุณต้องการล้างกราฟิกบนหน้าจอทั้งหมดทันทีหรือไม่?')) {
        try {
          await this.api.panic();
          this.store.setState({ activeOnAirItem: null });
          this.showToast('PANIC: ล้างกราฟิกบนหน้าจอเรียบร้อยแล้ว', 'warning');
        } catch (err) {
          this.showToast(`Panic ล้มเหลว: ${err.message}`, 'danger');
        }
      }
    });

    this.btnStopAll.addEventListener('click', async () => {
      try {
        await this.api.stopAllLayers();
        this.store.setState({ activeOnAirItem: null });
        this.showToast('Stop All: สั่งหยุดแสดงผลกราฟิกแบบนุ่มนวล', 'info');
      } catch (err) {
        this.showToast(`Stop All ล้มเหลว: ${err.message}`, 'danger');
      }
    });

    // Editor Dialog Component
    this.editorDialog = new EditorComponent(this.store, this.showToast);

    // Instantiate 4 Screen Views
    this.view1 = new MainRundownView(document.getElementById('view-main-rundown'), this.api, this.store, this.showToast);
    this.view2 = new CreateRundownView(document.getElementById('view-create-rundown'), this.api, this.store, this.editorDialog, this.showToast);
    this.view3 = new ControllerView(document.getElementById('view-controller'), this.api, this.store, this.showToast);
    this.view4 = new SettingsView(document.getElementById('view-settings'), this.api, this.store, this.showToast);

    this.checkConnection();
  }

  subscribeAutoSaveUI() {
    this.autoSavePill = document.getElementById('autosave-pill');
    this.autoSaveText = document.getElementById('autosave-text');

    this.store.subscribe('autoSaveStatus', (status) => {
      if (!this.autoSavePill || !this.autoSaveText) return;

      if (status === 'saving') {
        this.autoSavePill.className = 'autosave-status-pill saving';
        this.autoSaveText.textContent = 'Saving...';
      } else if (status === 'saved') {
        this.autoSavePill.className = 'autosave-status-pill saved';
        this.autoSaveText.textContent = 'Auto-Saved';
      } else if (status === 'error') {
        this.autoSavePill.className = 'autosave-status-pill error';
        this.autoSaveText.textContent = 'Save Failed';
      }
    });
  }

  async checkConnection() {
    this.statusDot.className = 'status-dot checking';
    this.statusLabel.textContent = 'Connecting...';
    try {
      const info = await this.api.getVersion();
      this.store.setState({ isConnected: true, serverInfo: info });
      this.statusDot.className = 'status-dot connected';
      this.statusLabel.textContent = info ? `${info.product} (v${info.version})` : 'Connected';
    } catch (err) {
      this.store.setState({ isConnected: false, serverInfo: null });
      this.statusDot.className = 'status-dot disconnected';
      this.statusLabel.textContent = 'Disconnected';
    }
  }

  startPollingLoop() {
    setInterval(() => this.checkConnection(), 5000);
  }
}

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.spxApp = new App();
});
