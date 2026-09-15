/**
 * SPX Graphics Controller - Store & Central State Management with Auto-Save
 */
export class Store {
  constructor() {
    this.listeners = new Map();
    this.autoSaveTimer = null;
    this.api = null; // SPX API Client reference

    this.state = {
      apiUrl: localStorage.getItem('spx_api_url') || 'http://localhost:5656/api/v1',
      apiKey: localStorage.getItem('spx_api_key') || '',
      isConnected: false,
      serverInfo: null,
      autoSaveStatus: 'saved',
      
      activeView: 'view-main-rundown',
      currentProject: 'Nation',
      currentRundownName: 'MainRundown',

      config: {
        itemTypes: [
          { label: "บาร์ประเด็น (mainbar)", value: "mainbar" },
          { label: "บาร์ชื่อ-ตำแหน่ง (bar2line)", value: "bar2line" }
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
        ]
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
      }
    } catch (e) {
      console.warn('Could not load backend config:', e.message);
    }
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

  addItem(itemData) {
    const newItem = {
      itemID: itemData.itemID || 'mainbar',
      relpath: itemData.relpath || 'Example/New-bar4.html',
      webplayout: itemData.webplayout || '1',
      out: itemData.out || 'manual',
      head: itemData.head !== undefined ? itemData.head : '',
      topic: itemData.topic !== undefined ? itemData.topic : '',
      mainbar: itemData.mainbar !== undefined ? itemData.mainbar : './assets/bar/MAIN BAR.png',
      headbar: itemData.headbar !== undefined ? itemData.headbar : '',
      DataFields: itemData.DataFields || [
        { field: 'f0', value: itemData.head !== undefined ? itemData.head : '' },
        { field: 'f1', value: itemData.topic !== undefined ? itemData.topic : '' },
        { field: 'mainbar', value: itemData.mainbar !== undefined ? itemData.mainbar : './assets/bar/MAIN BAR.png' },
        { field: 'headbar', value: itemData.headbar !== undefined ? itemData.headbar : '' }
      ]
    };

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

    newItems[index].DataFields = [
      { field: 'f0', value: newItems[index].head },
      { field: 'f1', value: newItems[index].topic },
      { field: 'mainbar', value: newItems[index].mainbar },
      { field: 'headbar', value: newItems[index].headbar },
      ...(updatedFields.customFields || [])
    ];

    this.setState({ items: newItems });
  }

  deleteItem(index) {
    if (index < 0 || index >= this.state.items.length) return;
    const newItems = this.state.items.filter((_, i) => i !== index);
    this.setState({ items: newItems });
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
