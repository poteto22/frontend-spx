/**
 * SPX Graphics Controller - REST API v1 Client & JSON Data Provider
 */
export class SPXClient {
  constructor(baseUrl = 'http://localhost:5656/api/v1', apiKey = '') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  setApiKey(key) {
    this.apiKey = key || '';
  }

  async _request(endpoint, options = {}) {
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    if (this.apiKey && !endpoint.startsWith('/api/config')) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}apikey=${encodeURIComponent(this.apiKey)}`;
    }

    const headers = {
      'Accept': 'application/json',
      ...options.headers
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json().catch(() => null);
      return data;
    } catch (error) {
      console.error(`API fetch error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Frontend Config & Active Item APIs
  async getConfig() {
    return fetch('/api/config').then(res => res.json());
  }

  async saveConfig(configPayload) {
    return fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configPayload)
    }).then(res => res.json());
  }

  async setActiveItem(item) {
    return fetch('/api/active-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemID: item.itemID,
        head: item.head,
        topic: item.topic,
        mainbar: item.mainbar,
        headbar: item.headbar
      })
    }).then(res => res.json()).catch(() => null);
  }

  // Common SPX API
  async getVersion() {
    return this._request('/version');
  }

  async panic() {
    return this._request('/panic');
  }

  // Item Playout Controls
  async playItem(id = 'mainbar') {
    return this._request(id ? `/item/play/${id}` : '/item/play');
  }

  async continueItem(id = 'mainbar') {
    return this._request(id ? `/item/continue/${id}` : '/item/continue');
  }

  async stopItem(id = 'mainbar') {
    return this._request(id ? `/item/stop/${id}` : '/item/stop');
  }

  // Focus Navigation Controls
  async focusFirst() { return this._request('/rundown/focusFirst'); }
  async focusNext() { return this._request('/rundown/focusNext'); }
  async focusPrev() { return this._request('/rundown/focusPrevious'); }
  async focusLast() { return this._request('/rundown/focusLast'); }
  async focusByID(id) { return this._request(`/rundown/focusByID/${id}`); }

  // Direct Playout with JSON DataFields
  async directPlayout(payload) {
    return this._request('/directplayout', {
      method: 'POST',
      body: payload
    });
  }

  // Rundown Controls
  async loadRundown(projectRundownFile) {
    return this._request(`/rundown/load?file=${encodeURIComponent(projectRundownFile)}`);
  }

  async stopAllLayers() {
    return this._request('/rundown/stopAllLayers');
  }

  // Data Listing API
  async getProjects() { return this._request('/getprojects'); }
  async getRundowns(project) { return this._request(`/getrundowns?project=${encodeURIComponent(project)}`); }
  async getAllRundowns() { return this._request('/allrundowns'); }
  async getTemplates(project) { return this._request(`/gettemplates?project=${encodeURIComponent(project)}`); }
  async getLayerState() { return this._request('/getlayerstate'); }

  // JSON Management API
  async getRundownJSON(project, rundown) {
    return this._request(`/rundown/json?project=${encodeURIComponent(project)}&rundown=${encodeURIComponent(rundown)}`);
  }

  async saveRundownJSON(project, filename, content) {
    return this._request('/rundown/json', {
      method: 'POST',
      body: {
        project,
        file: filename.endsWith('.json') ? filename : `${filename}.json`,
        content
      }
    });
  }
}
