/**
 * Layer Monitor Component - Fetches and displays live active graphic layers on SPX Server
 */
export class LayerMonitorComponent {
  constructor(api, store, showToast) {
    this.api = api;
    this.store = store;
    this.showToast = showToast;

    this.initElements();
    this.bindEvents();
    this.subscribeStore();
  }

  initElements() {
    this.btnRefresh = document.getElementById('btn-refresh-layers');
    this.layerGridContainer = document.getElementById('layer-grid-container');
    this.activeLayerCountBadge = document.getElementById('active-layer-count');
  }

  bindEvents() {
    this.btnRefresh.addEventListener('click', () => this.fetchLayerState());
  }

  subscribeStore() {
    this.store.subscribe('isConnected', (isConnected) => {
      if (isConnected) {
        this.fetchLayerState();
      } else {
        this.layerGridContainer.innerHTML = '<div class="empty-state-sm">Connect to SPX Server to monitor layers</div>';
        this.activeLayerCountBadge.textContent = '0';
      }
    });
  }

  async fetchLayerState() {
    if (!this.store.getState().isConnected) return;
    try {
      const state = await this.api.getLayerState();
      this.store.setState({ layerStates: state });
      this.renderLayers(state);
    } catch (err) {
      this.layerGridContainer.innerHTML = `<div class="empty-state-sm text-danger">Error fetching layers: ${err.message}</div>`;
    }
  }

  renderLayers(layerData) {
    if (!layerData || typeof layerData !== 'object' || Object.keys(layerData).length === 0) {
      this.layerGridContainer.innerHTML = '<div class="empty-state-sm">No active layers currently rendering on-air</div>';
      this.activeLayerCountBadge.textContent = '0';
      return;
    }

    const keys = Object.keys(layerData);
    let activeCount = 0;
    this.layerGridContainer.innerHTML = '';

    keys.forEach(layerNum => {
      const info = layerData[layerNum];
      const isActive = info && info.relpath;
      if (isActive) activeCount++;

      const card = document.createElement('div');
      card.className = `layer-card ${isActive ? 'active' : ''}`;

      card.innerHTML = `
        <div class="layer-header">
          <span class="layer-number">Layer ${layerNum}</span>
          <span class="badge ${isActive ? 'badge-success' : 'badge-neutral'}">
            ${isActive ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
        <div class="layer-body fs-xs">
          <div><strong class="text-secondary">Template:</strong> ${info.relpath || 'None'}</div>
          <div><strong class="text-secondary">Status:</strong> ${info.status || (isActive ? 'Playing' : 'Stopped')}</div>
        </div>
      `;

      this.layerGridContainer.appendChild(card);
    });

    this.activeLayerCountBadge.textContent = activeCount.toString();
  }
}
