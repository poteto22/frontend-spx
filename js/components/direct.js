/**
 * Direct Playout Component - Instant playout trigger without creating rundown items
 */
export class DirectPlayoutComponent {
  constructor(api, store, showToast) {
    this.api = api;
    this.store = store;
    this.showToast = showToast;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.inputPath = document.getElementById('dp-template-path');
    this.inputLayer = document.getElementById('dp-layer');
    this.inputOut = document.getElementById('dp-out');
    this.btnAddField = document.getElementById('btn-dp-add-field');
    this.dataFieldsList = document.getElementById('dp-datafields-list');

    this.btnPlay = document.getElementById('btn-dp-play');
    this.btnNext = document.getElementById('btn-dp-next');
    this.btnStop = document.getElementById('btn-dp-stop');

    // Add default initial data field rows
    this.addFieldRow('f0', 'Direct Playout Title');
    this.addFieldRow('f1', 'Subtitle Details');
  }

  bindEvents() {
    this.btnAddField.addEventListener('click', () => {
      const count = this.dataFieldsList.querySelectorAll('.datafield-row').length;
      this.addFieldRow(`f${count}`, '');
    });

    this.btnPlay.addEventListener('click', () => this.sendDirectPlayout('play'));
    this.btnNext.addEventListener('click', () => this.sendDirectPlayout('next'));
    this.btnStop.addEventListener('click', () => this.sendDirectPlayout('stop'));
  }

  addFieldRow(key = '', val = '') {
    const row = document.createElement('div');
    row.className = 'datafield-row';
    row.innerHTML = `
      <input type="text" class="form-control font-mono df-key" placeholder="Key e.g. f0" value="${key}">
      <input type="text" class="form-control df-val" placeholder="Value" value="${val}">
      <button type="button" class="btn-icon text-danger btn-remove-field" title="Remove">&times;</button>
    `;

    row.querySelector('.btn-remove-field').addEventListener('click', () => row.remove());
    this.dataFieldsList.appendChild(row);
  }

  async sendDirectPlayout(command) {
    const path = this.inputPath.value.trim();
    const layer = this.inputLayer.value.trim() || '1';
    const out = this.inputOut.value.trim() || 'manual';

    if (!path) {
      this.showToast('Please specify a Relative Template Path!', 'warning');
      return;
    }

    const DataFields = [];
    const rows = this.dataFieldsList.querySelectorAll('.datafield-row');
    rows.forEach(r => {
      const k = r.querySelector('.df-key').value.trim();
      const v = r.querySelector('.df-val').value.trim();
      if (k) DataFields.push({ field: k, value: v });
    });

    const payload = {
      command: command,
      relativeTemplatePath: path,
      webplayoutLayer: layer,
      out: out,
      DataFields: DataFields
    };

    try {
      await this.api.directPlay(payload);
      this.showToast(`Direct ${command.toUpperCase()} sent on Layer ${layer}`, 'success');
    } catch (err) {
      // Fallback method call
      try {
        await this.api.directPlayout(payload);
        this.showToast(`Direct ${command.toUpperCase()} sent on Layer ${layer}`, 'success');
      } catch (err2) {
        this.showToast(`Direct Playout error: ${err2.message}`, 'danger');
      }
    }
  }
}
