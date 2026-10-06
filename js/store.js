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

      config: (() => {
        const defaultCfg = {
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
        };
        try {
          const cached = localStorage.getItem('spx_cached_config');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
              return { ...defaultCfg, ...parsed };
            }
          }
        } catch (e) {}
        return defaultCfg;
      })(),
      
      blocks: [],
      items: [],

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
        try {
          localStorage.setItem('spx_cached_config', JSON.stringify(config));
        } catch (e) {}
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
        const data = await res.json();
        if (Array.isArray(data)) {
          if (data.length > 0) {
            // Check if any items have blockId, if not, create initial block
            const blocks = this.state.blocks && this.state.blocks.length > 0
              ? this.state.blocks
              : [{ id: 'block-1', title: 'ข่าวที่ 1: สถานการณ์น้ำท่วมและภัยพิบัติ', collapsed: false }];
            const items = data.map(it => ({ ...it, blockId: it.blockId || 'block-1' }));
            this.setState({ items, blocks });
          } else {
            this.setState({ items: [], blocks: [] });
          }
        } else if (data && data.items) {
          let blocks = data.blocks || [];
          if (blocks.length === 0 && data.items.length > 0) {
            blocks = [{ id: 'block-1', title: 'ข่าวที่ 1: สถานการณ์น้ำท่วมและภัยพิบัติ', collapsed: false }];
          }
          const items = (data.items || []).map(it => ({
            ...it,
            blockId: it.blockId || (blocks[0] ? blocks[0].id : null)
          }));
          this.setState({ items, blocks });
        } else {
          this.setState({ items: [], blocks: [] });
        }
      }
    } catch (e) {
      console.warn('Could not load backend items:', e.message);
    }
  }

  getState() {
    return this.state;
  }

  stopAllGraphics() {
    try {
      localStorage.removeItem('spx_active_onair_item');
    } catch (e) {}
    this.setState({
      activeOnAirItem: null,
      stopAllTriggeredAt: Date.now()
    });
  }

  clearAllPlaying() {
    this.stopAllGraphics();
  }

  setState(partialState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...partialState };

    if (partialState.items || partialState.blocks) {
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
    const { items, blocks, isConnected, currentProject, currentRundownName } = this.state;

    try {
      const payload = {
        blocks: blocks || [],
        items: items || []
      };

      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (isConnected && this.api && currentProject && currentRundownName) {
        const spxPayload = {
          comment: 'Auto-saved from SPX Front-End Workspace',
          templates: items
        };
        await this.api.saveRundownJSON(currentProject, currentRundownName, spxPayload).catch(() => null);
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
      blockId: itemData.blockId !== undefined ? itemData.blockId : null,
      relpath: itemData.relpath || 'Example/New-bar4.html',
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
    const prevItem = newItems[index];
    newItems[index] = { ...newItems[index], ...updatedFields };

    newItems[index].head = newItems[index].head !== undefined ? newItems[index].head : '';
    newItems[index].headbar = newItems[index].headbar !== undefined ? newItems[index].headbar : '';
    newItems[index].DataFields = this.generateDataFields(newItems[index], updatedFields.customFields || []);

    let activeOnAirItem = this.state.activeOnAirItem;
    if (activeOnAirItem && (activeOnAirItem === prevItem || (activeOnAirItem.itemID === prevItem.itemID && activeOnAirItem.head === prevItem.head && activeOnAirItem.topic === prevItem.topic))) {
      activeOnAirItem = newItems[index];
      if (this.apiClient) {
        this.apiClient.setActiveItem(newItems[index]).catch(() => null);
      }
    }

    this.setState({ items: newItems, activeOnAirItem });
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
    
    // Inherit the target position's blockId if dropped on/adjacent to an item
    const targetItem = newItems[toIndex];
    if (targetItem && targetItem.blockId !== undefined) {
      moved.blockId = targetItem.blockId;
    }
    
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

  // --- News Block Management Methods ---

  addBlock(title, insertAtIndex = -1) {
    const id = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newBlock = {
      id,
      title: title && title.trim() ? title.trim() : `บล็อกข่าวที่ ${(this.state.blocks || []).length + 1}`,
      collapsed: false
    };

    const blocks = [...(this.state.blocks || [])];
    if (insertAtIndex >= 0 && insertAtIndex <= blocks.length) {
      blocks.splice(insertAtIndex, 0, newBlock);
    } else {
      blocks.push(newBlock);
    }

    this.setState({ blocks });
    return newBlock;
  }

  updateBlock(id, fields) {
    const blocks = (this.state.blocks || []).map(b => {
      if (b.id === id) {
        return { ...b, ...fields };
      }
      return b;
    });
    this.setState({ blocks });
  }

  deleteBlock(id, deleteItemsInside = false) {
    const blocks = (this.state.blocks || []).filter(b => b.id !== id);
    let items = [...this.state.items];

    if (deleteItemsInside) {
      items = items.filter(item => item.blockId !== id);
    } else {
      items = items.map(item => {
        if (item.blockId === id) {
          return { ...item, blockId: null };
        }
        return item;
      });
    }

    this.setState({ blocks, items });
  }

  moveBlock(fromIndex, toIndex) {
    const blocks = [...(this.state.blocks || [])];
    if (fromIndex < 0 || fromIndex >= blocks.length || toIndex < 0 || toIndex >= blocks.length) return;

    const [movedBlock] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, movedBlock);

    // Reorder flat items sequence so items in blocks follow the new block order
    const reorderedItems = [];
    blocks.forEach(b => {
      const blockItems = this.state.items.filter(it => it.blockId === b.id);
      reorderedItems.push(...blockItems);
    });
    const unassignedItems = this.state.items.filter(it => !it.blockId || !blocks.some(b => b.id === it.blockId));
    reorderedItems.push(...unassignedItems);

    this.setState({ blocks, items: reorderedItems });
  }

  toggleBlockCollapse(id) {
    const blocks = (this.state.blocks || []).map(b => {
      if (b.id === id) {
        return { ...b, collapsed: !b.collapsed };
      }
      return b;
    });
    this.setState({ blocks });
  }

  moveItemToBlock(itemIndex, targetBlockId, targetIndexWithinBlock = -1) {
    if (itemIndex < 0 || itemIndex >= this.state.items.length) return;
    const items = [...this.state.items];
    const [item] = items.splice(itemIndex, 1);
    item.blockId = targetBlockId;

    if (targetBlockId) {
      const blockItemsIndices = [];
      items.forEach((it, idx) => {
        if (it.blockId === targetBlockId) blockItemsIndices.push(idx);
      });

      if (blockItemsIndices.length === 0) {
        const blocks = this.state.blocks || [];
        const currentBlockIdx = blocks.findIndex(b => b.id === targetBlockId);
        let insertPos = items.length;
        for (let i = currentBlockIdx - 1; i >= 0; i--) {
          const prevBlockId = blocks[i].id;
          const lastIdxOfPrev = items.map(it => it.blockId).lastIndexOf(prevBlockId);
          if (lastIdxOfPrev !== -1) {
            insertPos = lastIdxOfPrev + 1;
            break;
          }
        }
        items.splice(insertPos, 0, item);
      } else {
        if (targetIndexWithinBlock >= 0 && targetIndexWithinBlock < blockItemsIndices.length) {
          items.splice(blockItemsIndices[targetIndexWithinBlock], 0, item);
        } else {
          const lastIndex = blockItemsIndices[blockItemsIndices.length - 1];
          items.splice(lastIndex + 1, 0, item);
        }
      }
    } else {
      items.push(item);
    }

    this.setState({ items });
  }

  moveItemOutOfBlock(itemIndex) {
    if (itemIndex < 0 || itemIndex >= this.state.items.length) return;
    const items = [...this.state.items];
    items[itemIndex] = { ...items[itemIndex], blockId: null };
    this.setState({ items });
  }
}
