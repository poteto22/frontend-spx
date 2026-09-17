/**
 * SPX Graphics Controller - Store & Central State Management with Auto-Save
 */
export class Store {
  constructor() {
    this.listeners = new Map();
    this.autoSaveTimer = null;
    this.api = null; // SPX API Client reference

    const defaultHost = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
    const initialApiUrl = localStorage.getItem('spx_api_url') || `http://${defaultHost}:5656/api/v1`;

    this.state = {
      apiUrl: initialApiUrl,
      apiKey: localStorage.getItem('spx_api_key') || '',
      isConnected: false,
      serverInfo: null,
      autoSaveStatus: 'saved',
      
      activeView: 'view-main-rundown',
      currentProject: 'Nation',
      currentRundownName: 'MainRundown',

      config: {
        itemTypes: [
          { label: "Logo บาร์ (logo)", value: "logo" },
          { label: "บาร์ประเด็น (mainbar)", value: "mainbar" },
          { label: "บาร์ 2 บรรทัด (bar2line)", value: "bar2line" },
          { label: "บาร์พิธีกร 2 คน (bar2name)", value: "bar2name" }
        ],
        presetHeads: [
          "ประเด็นร้อน",
          "สถานการณ์เด่น",
          "สัมภาษณ์ทางโทรศัพท์"
        ],
        mainbarOptions: [
          { label: "MAIN BAR.png", value: "./assets/bar/MAIN BAR.png" }
        ],
        headbarOptions: [
          { label: "none (ไม่เลือก)", value: "" },
          { label: "top-bar-1.png", value: "./assets/head/top-bar-1.png" },
          { label: "top-bar-2.png", value: "./assets/head/top-bar-2.png" },
          { label: "top-bar-3.png", value: "./assets/head/top-bar-3.png" },
          { label: "top-bar-4.png", value: "./assets/head/top-bar-4.png" }
        ],
        logoOptions: []
      },
      
      items: [
        {
          itemID: 'mainbar',
          relpath: 'Example/New-bar4.html',
          webplayout: '1',
          out: 'manual',
          head: 'หัวเรื่อง',
          topic: 'มอบทุนศึกษา-อุปกรณ์กีฬา รร.ผลิตนักตบทีมชาติ',
          mainbar: './assets/bar/MAIN BAR.png',
          headbar: './assets/head/top-bar-1.png',
          DataFields: [
            { field: 'f0', value: 'หัวเรื่อง' },
            { field: 'f1', value: 'มอบทุนศึกษา-อุปกรณ์กีฬา รร.ผลิตนักตบทีมชาติ' },
            { field: 'mainbar', value: './assets/bar/MAIN BAR.png' },
            { field: 'headbar', value: './assets/head/top-bar-1.png' }
          ]
        },
        {
          itemID: 'bar2line',
          relpath: 'Example/New-bar4.html',
          webplayout: '1',
          out: 'manual',
          head: '',
          topic: 'รายงานสดสถานการณ์น้ำท่วมและมาตรการช่วยเหลือประชาชน',
          mainbar: './assets/bar/MAIN BAR.png',
          headbar: '',
          DataFields: [
            { field: 'f0', value: '' },
            { field: 'f1', value: 'รายงานสดสถานการณ์น้ำท่วมและมาตรการช่วยเหลือประชาชน' },
            { field: 'mainbar', value: './assets/bar/MAIN BAR.png' },
            { field: 'headbar', value: '' }
          ]
        }
      ],

      activeOnAirItem: null,
      layerStates: {}
    };

    this.loadInitialData();
  }

  setApiClient(api) {
    this.api = api;
  }

  async loadInitialData() {
    await this.loadConfigFromBackend();
    await this.loadItemsFromBackend();
  }

  async loadConfigFromBackend() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        this.setState({ config });
        return config;
      }
    } catch (e) {
      console.warn('Could not load backend config:', e.message);
    }
  }

  async rescanAssets() {
    try {
      const res = await fetch('/api/rescan-assets', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          this.setState({ config: data.config });
          return data.config;
        }
      }
    } catch (e) {
      console.warn('Could not rescan assets:', e.message);
    }
    return await this.loadConfigFromBackend();
  }

  async loadItemsFromBackend() {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          this.setState({ items });
        }
      }
    } catch (e) {
      console.warn('Could not load backend items:', e.message);
    }
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...partialState };

    if (partialState.items) {
      this.triggerAutoSave();
    }

    Object.keys(partialState).forEach((key) => {
      this.emit(key, this.state[key], prevState[key]);
    });
    this.emit('state-changed', this.state);
  }

  triggerAutoSave() {
    this.setState({ autoSaveStatus: 'saving' });

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.performAutoSave();
    }, 400);
  }

  async performAutoSave() {
    const { items, isConnected, currentProject, currentRundownName } = this.state;

    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });

      if (isConnected && this.api && currentProject && currentRundownName) {
        const payload = {
          comment: 'Auto-saved from SPX Front-End Workspace',
          templates: items
        };
        await this.api.saveRundownJSON(currentProject, currentRundownName, payload).catch(() => null);
      }

      this.setState({ autoSaveStatus: 'saved' });
    } catch (err) {
      console.error('Auto-save error:', err);
      this.setState({ autoSaveStatus: 'error' });
    }
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      const set = this.listeners.get(event);
      if (set) set.delete(callback);
    };
  }

  emit(event, payload, prevPayload) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => cb(payload, prevPayload, this.state));
    }
  }

  generateDataFields(item, customFields = []) {
    const itemID = item.itemID || 'mainbar';
    let fields = [];

    if (itemID === 'logo') {
      fields.push({ field: 'logo', value: item.logo || '' });
    } else if (itemID === 'bar2line') {
      fields.push({ field: 'f0', value: item.head || '' });
      fields.push({ field: 'line1', value: item.line1 || '' });
      fields.push({ field: 'line2', value: item.line2 || '' });
      fields.push({ field: 'mainbar', value: item.mainbar || './assets/bar/MAIN BAR.png' });
      fields.push({ field: 'headbar', value: item.headbar || '' });
    } else if (itemID === 'bar2name') {
      fields.push({ field: 'f0', value: item.head || '' });
      fields.push({ field: 'name1', value: item.name1 || '' });
      fields.push({ field: 'name2', value: item.name2 || '' });
      fields.push({ field: 'line2', value: item.line2 || '' });
      fields.push({ field: 'mainbar', value: item.mainbar || './assets/bar/MAIN BAR.png' });
      fields.push({ field: 'headbar', value: item.headbar || '' });
    } else {
      // Default: mainbar
      fields.push({ field: 'f0', value: item.head || '' });
      fields.push({ field: 'f1', value: item.topic || '' });
      fields.push({ field: 'mainbar', value: item.mainbar || './assets/bar/MAIN BAR.png' });
      fields.push({ field: 'headbar', value: item.headbar || '' });
    }

    return [...fields, ...customFields];
  }

  addItem(itemData) {
    const newItem = {
      itemID: itemData.itemID || 'mainbar',
      relpath: itemData.relpath || 'Example/New-bar4.html',
      webplayout: itemData.webplayout || '1',
      out: itemData.out || 'manual',
      head: itemData.head !== undefined ? itemData.head : '',
      topic: itemData.topic !== undefined ? itemData.topic : '',
      line1: itemData.line1 !== undefined ? itemData.line1 : '',
      line2: itemData.line2 !== undefined ? itemData.line2 : '',
      name1: itemData.name1 !== undefined ? itemData.name1 : '',
      name2: itemData.name2 !== undefined ? itemData.name2 : '',
      logo: itemData.logo !== undefined ? itemData.logo : '',
      mainbar: itemData.mainbar !== undefined ? itemData.mainbar : './assets/bar/MAIN BAR.png',
      headbar: itemData.headbar !== undefined ? itemData.headbar : '',
    };
    newItem.DataFields = itemData.DataFields || this.generateDataFields(newItem, itemData.customFields || []);

    const newItems = [...this.state.items, newItem];
    this.setState({ items: newItems });
    return newItem;
  }

  updateItem(index, updatedFields) {
    if (index < 0 || index >= this.state.items.length) return;
    const newItems = [...this.state.items];
    newItems[index] = { ...newItems[index], ...updatedFields };

    newItems[index].head = newItems[index].head !== undefined ? newItems[index].head : '';
    newItems[index].headbar = newItems[index].headbar !== undefined ? newItems[index].headbar : '';
    newItems[index].DataFields = this.generateDataFields(newItems[index], updatedFields.customFields || []);

    this.setState({ items: newItems });
  }

  deleteItem(index) {
    if (index < 0 || index >= this.state.items.length) return;
    const itemToDelete = this.state.items[index];
    const newItems = this.state.items.filter((_, i) => i !== index);

    let activeOnAirItem = this.state.activeOnAirItem;
    if (activeOnAirItem && (activeOnAirItem === itemToDelete || (activeOnAirItem.itemID === itemToDelete.itemID && activeOnAirItem.head === itemToDelete.head && activeOnAirItem.topic === itemToDelete.topic))) {
      activeOnAirItem = null;
    }

    this.setState({ items: newItems, activeOnAirItem });
  }

  moveItem(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.state.items.length) return;
    if (toIndex < 0 || toIndex >= this.state.items.length) return;
    const newItems = [...this.state.items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    this.setState({ items: newItems });
  }

  duplicateItem(index) {
    if (index < 0 || index >= this.state.items.length) return;
    const original = this.state.items[index];
    const copy = JSON.parse(JSON.stringify(original));
    copy.head = copy.head ? `${copy.head} (สำเนา)` : '';

    const newItems = [...this.state.items];
    newItems.splice(index + 1, 0, copy);
    this.setState({ items: newItems });
  }
}
