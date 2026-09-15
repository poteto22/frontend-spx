/**
 * Sidebar Component - Project Explorer, Rundown list & Template Browser
 */
export class SidebarComponent {
  constructor(api, store, showToast) {
    this.api = api;
    this.store = store;
    this.showToast = showToast;

    this.initElements();
    this.bindEvents();
    this.subscribeStore();
  }

  initElements() {
    this.projectTree = document.getElementById('project-tree');
    this.templateList = document.getElementById('template-list');
    this.btnRefreshServer = document.getElementById('btn-refresh-server');
  }

  bindEvents() {
    this.btnRefreshServer.addEventListener('click', () => {
      this.loadServerProjects();
    });
  }

  subscribeStore() {
    this.store.subscribe('isConnected', (isConnected) => {
      if (isConnected) {
        this.loadServerProjects();
      } else {
        this.projectTree.innerHTML = '<div class="empty-state-sm">Connect to SPX Server to view projects</div>';
        this.templateList.innerHTML = '<div class="empty-state-sm">Select a project to load available templates</div>';
      }
    });

    this.store.subscribe('currentProject', (project) => {
      if (project) {
        this.loadTemplates(project);
      }
    });
  }

  async loadServerProjects() {
    if (!this.store.getState().isConnected) return;

    try {
      const allRundowns = await this.api.getAllRundowns();
      this.store.setState({ allRundowns });
      this.renderProjectTree(allRundowns);
      this.showToast('Projects refreshed from SPX Server', 'info');
    } catch (err) {
      this.projectTree.innerHTML = `<div class="empty-state-sm text-danger">Error loading projects: ${err.message}</div>`;
    }
  }

  renderProjectTree(projectsData) {
    if (!projectsData || !Array.isArray(projectsData) || projectsData.length === 0) {
      this.projectTree.innerHTML = '<div class="empty-state-sm">No projects found on server</div>';
      return;
    }

    this.projectTree.innerHTML = '';

    projectsData.forEach((item) => {
      const projContainer = document.createElement('div');
      projContainer.className = 'project-item';

      const projHeader = document.createElement('div');
      projHeader.className = 'project-header';
      projHeader.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>${item.project}</span>
      `;

      projHeader.addEventListener('click', () => {
        this.store.setState({ currentProject: item.project });
        const rundownListEl = projContainer.querySelector('.rundown-list');
        if (rundownListEl) {
          rundownListEl.classList.toggle('hidden');
        }
      });

      const rundownList = document.createElement('div');
      rundownList.className = 'rundown-list';

      if (item.rundowns && item.rundowns.length > 0) {
        item.rundowns.forEach((rd) => {
          const rdBtn = document.createElement('button');
          rdBtn.className = 'rundown-item-btn';
          rdBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            </svg>
            <span>${rd}</span>
          `;

          rdBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Highlight active rundown
            document.querySelectorAll('.rundown-item-btn').forEach(b => b.classList.remove('active'));
            rdBtn.classList.add('active');
            
            this.openServerRundown(item.project, rd);
          });

          rundownList.appendChild(rdBtn);
        });
      } else {
        rundownList.innerHTML = '<div class="fs-xs text-muted p-1">No rundowns</div>';
      }

      projContainer.appendChild(projHeader);
      projContainer.appendChild(rundownList);
      this.projectTree.appendChild(projContainer);
    });
  }

  async openServerRundown(project, rundownName) {
    try {
      const json = await this.api.getRundownJSON(project, rundownName);
      if (json) {
        let items = [];
        if (Array.isArray(json)) {
          items = json;
        } else if (json.templates && Array.isArray(json.templates)) {
          items = json.templates;
        }

        this.store.setState({
          currentProject: project,
          currentRundownName: rundownName,
          rundownData: json,
          items: items
        });

        this.showToast(`Loaded rundown "${rundownName}" (${items.length} items)`, 'success');
      }
    } catch (err) {
      this.showToast(`Failed to fetch rundown JSON: ${err.message}`, 'danger');
    }
  }

  async loadTemplates(project) {
    try {
      const templates = await this.api.getTemplates(project);
      this.store.setState({ currentTemplates: templates });
      this.renderTemplates(templates);
    } catch (err) {
      this.templateList.innerHTML = `<div class="empty-state-sm text-danger">Error loading templates: ${err.message}</div>`;
    }
  }

  renderTemplates(templatesData) {
    let tList = [];
    if (Array.isArray(templatesData)) {
      tList = templatesData;
    } else if (templatesData && templatesData.templates) {
      tList = templatesData.templates;
    }

    if (tList.length === 0) {
      this.templateList.innerHTML = '<div class="empty-state-sm">No templates defined for this project</div>';
      return;
    }

    this.templateList.innerHTML = '';

    tList.forEach((tmpl) => {
      const card = document.createElement('div');
      card.className = 'template-card';

      const info = document.createElement('div');
      info.className = 'template-info';

      const name = tmpl.description || tmpl.name || tmpl.relpath || 'Template';
      const relpath = tmpl.relpath || tmpl.path || '';

      info.innerHTML = `
        <div class="template-name">${name}</div>
        <div class="template-relpath">${relpath}</div>
      `;

      const btnAdd = document.createElement('button');
      btnAdd.className = 'btn btn-xs btn-outline';
      btnAdd.innerHTML = '+ Add';
      btnAdd.title = 'Add this template to current rundown';

      btnAdd.addEventListener('click', () => {
        this.store.addItem({
          title: name,
          relpath: relpath,
          layer: tmpl.webplayout || tmpl.playlayer || '1',
          out: tmpl.out || 'manual',
          DataFields: tmpl.DataFields || [
            { field: 'f0', value: 'Title' },
            { field: 'f1', value: 'Subtitle' }
          ]
        });
        this.showToast(`Added "${name}" to rundown`, 'info');
      });

      card.appendChild(info);
      card.appendChild(btnAdd);
      this.templateList.appendChild(card);
    });
  }
}
