/**
 * Rundown Workspace Component - Item cards rendering, control actions, export/import
 */
export class RundownComponent {
  constructor(api, store, editorComponent, showToast) {
    this.api = api;
    this.store = store;
    this.editorComponent = editorComponent;
    this.showToast = showToast;

    this.initElements();
    this.bindEvents();
    this.subscribeStore();
  }

  initElements() {
    this.rundownNameEl = document.getElementById('current-rundown-name');
    this.projectNameEl = document.getElementById('current-project-name');
    this.itemCountEl = document.getElementById('current-item-count');
    this.itemsListContainer = document.getElementById('rundown-items-list');

    // Toolbar Buttons
    this.btnAddItem = document.getElementById('btn-add-item');
    this.btnEmptyAddItem = document.getElementById('btn-empty-add-item');
    this.btnLoadToSpx = document.getElementById('btn-load-to-spx');
    this.btnSaveSpx = document.getElementById('btn-save-spx');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnImportJson = document.getElementById('btn-import-json');
    this.fileImportInput = document.getElementById('file-import-input');
    this.btnClearRundown = document.getElementById('btn-clear-rundown');

    // Dropdown menu
    this.btnRundownMore = document.getElementById('btn-rundown-more');
    this.rundownMenu = document.getElementById('rundown-menu');

    // Focus Controls
    this.btnFocusFirst = document.getElementById('btn-focus-first');
    this.btnFocusPrev = document.getElementById('btn-focus-prev');
    this.btnFocusNext = document.getElementById('btn-focus-next');
    this.btnFocusLast = document.getElementById('btn-focus-last');
    this.focusedItemLabel = document.getElementById('focused-item-label');
  }

  bindEvents() {
    // Add Item
    const handleAddItem = () => {
      this.editorComponent.openForNew();
    };
    this.btnAddItem.addEventListener('click', handleAddItem);
    if (this.btnEmptyAddItem) {
      this.btnEmptyAddItem.addEventListener('click', handleAddItem);
    }

    // Dropdown Toggle
    this.btnRundownMore.addEventListener('click', (e) => {
      e.stopPropagation();
      this.rundownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      this.rundownMenu.classList.remove('show');
    });

    // Load Rundown into SPX Controller
    this.btnLoadToSpx.addEventListener('click', async () => {
      const { currentProject, currentRundownName } = this.store.getState();
      if (!currentProject || !currentRundownName) {
        this.showToast('Select or save a project/rundown file first.', 'warning');
        return;
      }
      try {
        const fileParam = `${currentProject}/${currentRundownName}`;
        await this.api.loadRundown(fileParam);
        this.showToast(`Loaded "${fileParam}" into SPX Controller!`, 'success');
      } catch (err) {
        this.showToast(`Load failed: ${err.message}`, 'danger');
      }
    });

    // Save JSON to SPX Server
    this.btnSaveSpx.addEventListener('click', async () => {
      let { currentProject, currentRundownName, items, rundownData } = this.store.getState();
      if (!currentProject) {
        currentProject = prompt('Enter Project Name to save under:', 'MyFirstProject');
        if (!currentProject) return;
        this.store.setState({ currentProject });
      }
      if (currentRundownName === 'Untitled Rundown' || !currentRundownName) {
        currentRundownName = prompt('Enter Rundown Filename:', 'NewRundown');
        if (!currentRundownName) return;
        this.store.setState({ currentRundownName });
      }

      const content = {
        ...rundownData,
        templates: items
      };

      try {
        await this.api.saveRundownJSON(currentProject, currentRundownName, content);
        this.showToast(`Saved "${currentRundownName}" to SPX server!`, 'success');
      } catch (err) {
        this.showToast(`Save to SPX failed: ${err.message}`, 'danger');
      }
    });

    // Export Local JSON
    this.btnExportJson.addEventListener('click', () => {
      const { currentRundownName, items, rundownData } = this.store.getState();
      const exportContent = {
        ...rundownData,
        templates: items
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportContent, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${currentRundownName.replace(/\.json$/, '')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      this.showToast('Exported JSON file to computer', 'info');
    });

    // Import Local JSON
    this.btnImportJson.addEventListener('click', () => {
      this.fileImportInput.click();
    });

    this.fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          let items = [];
          if (Array.isArray(parsed)) {
            items = parsed;
          } else if (parsed.templates && Array.isArray(parsed.templates)) {
            items = parsed.templates;
          }

          const filename = file.name.replace(/\.json$/i, '');
          this.store.setState({
            currentRundownName: filename,
            rundownData: parsed,
            items: items
          });

          this.showToast(`Imported "${filename}" with ${items.length} items`, 'success');
        } catch (err) {
          this.showToast(`Invalid JSON file: ${err.message}`, 'danger');
        }
      };
      reader.readAsText(file);
    });

    // Clear Rundown
    this.btnClearRundown.addEventListener('click', () => {
      if (confirm('Clear all items from current rundown?')) {
        this.store.setState({ items: [] });
        this.showToast('Rundown items cleared', 'info');
      }
    });

    // Focus Controls
    this.btnFocusFirst.addEventListener('click', async () => {
      try {
        await this.api.focusFirst();
        this.updateFocusIndicator('First Item');
      } catch (err) { console.error(err); }
    });
    this.btnFocusPrev.addEventListener('click', async () => {
      try {
        await this.api.focusPrev();
        this.updateFocusIndicator('Previous Item');
      } catch (err) { console.error(err); }
    });
    this.btnFocusNext.addEventListener('click', async () => {
      try {
        await this.api.focusNext();
        this.updateFocusIndicator('Next Item');
      } catch (err) { console.error(err); }
    });
    this.btnFocusLast.addEventListener('click', async () => {
      try {
        await this.api.focusLast();
        this.updateFocusIndicator('Last Item');
      } catch (err) { console.error(err); }
    });
  }

  updateFocusIndicator(label) {
    this.focusedItemLabel.textContent = `Focus: ${label}`;
  }

  subscribeStore() {
    this.store.subscribe('currentRundownName', (name) => {
      this.rundownNameEl.textContent = name || 'Untitled Rundown';
    });

    this.store.subscribe('currentProject', (proj) => {
      this.projectNameEl.textContent = proj || 'No Project';
    });

    this.store.subscribe('items', (items) => {
      this.itemCountEl.textContent = `${items.length} items`;
      this.renderItems(items);
    });

    this.store.subscribe('playingItemIds', () => {
      this.renderItems(this.store.getState().items);
    });
  }

  renderItems(items) {
    if (!items || items.length === 0) {
      this.itemsListContainer.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="9"></line>
            <line x1="9" y1="13" x2="15" y2="13"></line>
            <line x1="9" y1="17" x2="11" y2="17"></line>
          </svg>
          <h3>Rundown is empty</h3>
          <p>Add a new item or pick a template from the left sidebar to start building your CG graphics sequence.</p>
          <button class="btn btn-primary mt-2" id="btn-empty-add-item-dynamic">Add First Item</button>
        </div>
      `;
      const btn = document.getElementById('btn-empty-add-item-dynamic');
      if (btn) btn.addEventListener('click', () => this.editorComponent.openForNew());
      return;
    }

    this.itemsListContainer.innerHTML = '';
    const playingSet = this.store.getState().playingItemIds;

    items.forEach((item, index) => {
      const isPlaying = playingSet.has(item.itemID);
      const card = document.createElement('div');
      card.className = `rundown-item-card ${isPlaying ? 'is-playing' : ''}`;

      // 1. Index Column
      const indexCol = document.createElement('div');
      indexCol.className = 'item-index-badge';
      indexCol.textContent = `#${index + 1}`;

      // 2. Status Badge Column
      const statusCol = document.createElement('div');
      statusCol.className = 'item-status-col';
      statusCol.innerHTML = `
        <span class="badge ${isPlaying ? 'badge-success' : 'badge-neutral'}">
          ${isPlaying ? '● ON-AIR' : 'STOPPED'}
        </span>
        <span class="badge badge-info fs-xs">Layer ${item.webplayout || item.playlayer || '1'}</span>
      `;

      // 3. Main Info Column
      const mainCol = document.createElement('div');
      mainCol.className = 'item-main-col';
      
      const titleEl = document.createElement('div');
      titleEl.className = 'item-title';
      titleEl.textContent = item.description || item.title || 'Graphic Item';

      const metaEl = document.createElement('div');
      metaEl.className = 'item-meta';
      metaEl.innerHTML = `
        <span><strong class="text-secondary">Template:</strong> ${item.relpath || '-'}</span>
        <span><strong class="text-secondary">Out:</strong> ${item.out === 'manual' ? 'Manual' : item.out + ' ms'}</span>
      `;

      // Data fields preview
      const fieldsPreview = document.createElement('div');
      fieldsPreview.className = 'item-fields-preview';
      if (item.DataFields && Array.isArray(item.DataFields) && item.DataFields.length > 0) {
        item.DataFields.forEach(f => {
          const pill = document.createElement('span');
          pill.className = 'field-pill';
          pill.innerHTML = `<span class="field-key">${f.field}:</span> <span>${f.value}</span>`;
          fieldsPreview.appendChild(pill);
        });
      } else {
        fieldsPreview.innerHTML = '<span class="text-muted fs-xs">No data fields</span>';
      }

      mainCol.appendChild(titleEl);
      mainCol.appendChild(metaEl);
      mainCol.appendChild(fieldsPreview);

      // 4. Action Buttons Column
      const actionsCol = document.createElement('div');
      actionsCol.className = 'item-actions-col';

      // Play Button
      const btnPlay = document.createElement('button');
      btnPlay.className = 'btn btn-xs btn-play';
      btnPlay.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> PLAY`;
      btnPlay.title = 'Play graphics on air';
      btnPlay.addEventListener('click', async () => {
        try {
          if (item.itemID) {
            await this.api.playItem(item.itemID);
          } else {
            await this.api.playItem();
          }
          this.store.setItemPlaying(item.itemID, true);
          this.showToast(`PLAY: ${item.description}`, 'success');
        } catch (err) {
          this.showToast(`Play failed: ${err.message}`, 'danger');
        }
      });

      // Continue/Next Button
      const btnNext = document.createElement('button');
      btnNext.className = 'btn btn-xs btn-warning';
      btnNext.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg> NEXT`;
      btnNext.title = 'Continue step';
      btnNext.addEventListener('click', async () => {
        try {
          if (item.itemID) {
            await this.api.continueItem(item.itemID);
          } else {
            await this.api.continueItem();
          }
          this.showToast(`NEXT: ${item.description}`, 'warning');
        } catch (err) {
          this.showToast(`Next failed: ${err.message}`, 'danger');
        }
      });

      // Stop Button
      const btnStop = document.createElement('button');
      btnStop.className = 'btn btn-xs btn-stop';
      btnStop.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"></rect></svg> STOP`;
      btnStop.title = 'Stop graphics animation out';
      btnStop.addEventListener('click', async () => {
        try {
          if (item.itemID) {
            await this.api.stopItem(item.itemID);
          } else {
            await this.api.stopItem();
          }
          this.store.setItemPlaying(item.itemID, false);
          this.showToast(`STOP: ${item.description}`, 'info');
        } catch (err) {
          this.showToast(`Stop failed: ${err.message}`, 'danger');
        }
      });

      // Edit Button
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-icon';
      btnEdit.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
      btnEdit.title = 'Edit Item';
      btnEdit.addEventListener('click', () => {
        this.editorComponent.openForEdit(index);
      });

      // Duplicate Button
      const btnDup = document.createElement('button');
      btnDup.className = 'btn-icon';
      btnDup.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      btnDup.title = 'Duplicate Item';
      btnDup.addEventListener('click', () => {
        this.store.duplicateItem(index);
        this.showToast('Item duplicated', 'info');
      });

      // Move Up Button
      const btnUp = document.createElement('button');
      btnUp.className = 'btn-icon';
      btnUp.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
      btnUp.disabled = index === 0;
      btnUp.title = 'Move Up';
      btnUp.addEventListener('click', () => {
        this.store.moveItem(index, index - 1);
      });

      // Move Down Button
      const btnDown = document.createElement('button');
      btnDown.className = 'btn-icon';
      btnDown.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
      btnDown.disabled = index === items.length - 1;
      btnDown.title = 'Move Down';
      btnDown.addEventListener('click', () => {
        this.store.moveItem(index, index + 1);
      });

      // Delete Button
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-icon text-danger';
      btnDel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      btnDel.title = 'Delete Item';
      btnDel.addEventListener('click', () => {
        if (confirm(`Delete "${item.description}"?`)) {
          this.store.deleteItem(index);
          this.showToast('Item deleted', 'info');
        }
      });

      actionsCol.appendChild(btnPlay);
      actionsCol.appendChild(btnNext);
      actionsCol.appendChild(btnStop);
      actionsCol.appendChild(btnEdit);
      actionsCol.appendChild(btnDup);
      actionsCol.appendChild(btnUp);
      actionsCol.appendChild(btnDown);
      actionsCol.appendChild(btnDel);

      card.appendChild(indexCol);
      card.appendChild(statusCol);
      card.appendChild(mainCol);
      card.appendChild(actionsCol);

      this.itemsListContainer.appendChild(card);
    });
  }
}
