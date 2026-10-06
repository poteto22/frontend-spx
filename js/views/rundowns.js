/**
 * VIEW 5: SPX All Rundowns List (หน้าจอแสดงรายการ Rundown ทั้งหมด)
 * ดึงข้อมูลจาก SPX REST API /api/v1/allrundowns
 * มีปุ่ม Load เพื่อสั่ง SPX โหลด rundown ด้วย API /api/v1/rundown/load?file=project/rundown
 * 
 * ข้อตกลงสำคัญ:
 * - การโหลดในหน้านี้เป็นการสั่ง SPX Controller โหลดไฟล์เข้า RAM ของ SPX เท่านั้น
 * - แยกอิสระจากรายการ CG Rundown ที่สร้างไว้ในเว็บแอป (ห้ามดึง items มาทับ rundown ที่ผู้ใช้สร้างไว้เด็ดขาด)
 */

const STORAGE_KEY_LOADED_RUNDOWN = 'spx_loaded_rundown';

export class RundownsView {
  constructor(container, api, store, showToast) {
    this.container = container;
    this.api = api;
    this.store = store;
    this.showToast = showToast || (() => {});

    this.projectsData = [];
    this.isLoading = false;
    this.searchTerm = '';
    this.loadingRundownKey = null; // 'project/rundown' currently being loaded in SPX

    this.render();
    this.subscribeStore();
    this.fetchAllRundowns();
  }

  subscribeStore() {
    this.store.subscribe('spxLoadedRundown', () => this.renderList());
    this.store.subscribe('isConnected', (connected) => {
      if (connected && this.projectsData.length === 0) {
        this.fetchAllRundowns();
      }
    });
    this.store.subscribe('activeView', (view) => {
      if (view === 'view-rundowns') {
        this.fetchAllRundowns();
      }
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="rundowns-container">
        <!-- Top Control Bar -->
        <div class="card p-3 mb-4">
          <div class="flex-between flex-wrap gap-3">
            <div>
              <div class="flex-center gap-2 mb-1" style="justify-content: flex-start;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2.2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  <line x1="12" y1="11" x2="12" y2="17"></line>
                  <line x1="9" y1="14" x2="15" y2="14"></line>
                </svg>
                <h3 class="fs-lg fw-700 m-0">รายการ Rundown ในระบบ SPX (All Rundowns)</h3>
              </div>
              <p class="text-muted fs-xs m-0">
                ดึงข้อมูลจาก SPX REST API <code>/api/v1/allrundowns</code> เพื่อสั่งให้ SPX Controller โหลด rundown เข้าสู่หน่วยความจำด้วย <code>/v1/rundown/load?file=...</code> (ไม่กระทบรายการ CG ที่สร้างไว้ในเว็บแอป)
              </p>
            </div>

            <div class="flex-center gap-2">
              <div class="rundown-search-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="rundown-search-input" class="form-control form-control-sm" placeholder="ค้นหา Project หรือ Rundown...">
              </div>
              <button class="btn btn-sm btn-outline flex-center gap-1" id="btn-refresh-rundowns">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                <span>รีเฟรชรายการ</span>
              </button>
            </div>
          </div>

          <!-- Active Rundown Banner -->
          <div class="rundown-active-banner mt-3" id="rundown-active-banner">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Rundowns Content Area -->
        <div id="rundowns-list-content">
          <div class="text-center p-4 text-muted">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    `;

    // Bind Search Input
    const searchInput = document.getElementById('rundown-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this.renderList();
      });
    }

    // Bind Refresh Button
    const btnRefresh = document.getElementById('btn-refresh-rundowns');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.fetchAllRundowns(true);
      });
    }

    this.updateActiveBanner();
  }

  updateActiveBanner() {
    const banner = document.getElementById('rundown-active-banner');
    if (!banner) return;

    const { spxLoadedRundown = '' } = this.store.getState();
    const isLoaded = Boolean(spxLoadedRundown);

    banner.innerHTML = `
      <div class="flex-between flex-wrap gap-2 p-2 bg-slate-50 border rounded-md">
        <div class="flex-center gap-2">
          <span class="badge ${isLoaded ? 'badge-success' : 'badge-neutral'}">${isLoaded ? '● LOADED IN SPX' : 'OFF-AIR'}</span>
          <span class="fs-xs fw-600 text-muted">Rundown ที่โหลดใน SPX Controller:</span>
          <span class="fs-sm fw-700 font-mono text-primary">${isLoaded ? spxLoadedRundown : '(ยังไม่มีการโหลด)'}</span>
        </div>
        <div class="fs-xs text-muted">
          * การโหลดในหน้านี้เป็นการสั่ง SPX Controller โดยตรง โดยแยกอิสระจากรายการ CG Rundown ที่สร้างไว้
        </div>
      </div>
    `;
  }

  async fetchAllRundowns(showToastOnManual = false) {
    this.isLoading = true;
    const content = document.getElementById('rundowns-list-content');
    if (content && (!this.projectsData || this.projectsData.length === 0)) {
      content.innerHTML = `
        <div class="text-center p-5 text-muted">
          <div class="spinner mb-2" style="display:inline-block; width:28px; height:28px; border:3px solid #cbd5e1; border-top-color:#2563eb; border-radius:50%; animation:spin 1s linear infinite;"></div>
          <div>กำลังดึงรายการ Rundown จาก SPX Controller...</div>
        </div>
      `;
    }

    try {
      const data = await this.api.getAllRundowns();
      if (Array.isArray(data)) {
        this.projectsData = data;
      } else if (data && typeof data === 'object') {
        this.projectsData = Object.keys(data).map(proj => ({
          project: proj,
          rundowns: Array.isArray(data[proj]) ? data[proj] : []
        }));
      } else {
        this.projectsData = [];
      }

      this.renderList();
      if (showToastOnManual) {
        this.showToast(`ดึงรายการ Rundown จาก SPX สำเร็จ (${this.projectsData.length} Projects)`, 'success');
      }
    } catch (err) {
      console.error('Error fetching all rundowns:', err);
      if (content) {
        content.innerHTML = `
          <div class="card p-4 text-center">
            <div class="text-danger mb-2">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h4 class="fw-700 text-danger mb-1">ไม่สามารถดึงข้อมูล Rundown จาก SPX ได้</h4>
            <p class="text-muted fs-xs mb-3">${err.message || 'SPX Server ไม่ได้รันอยู่ หรือ URL/API Key ไม่ถูกต้อง'}</p>
            <div>
              <button class="btn btn-sm btn-primary" id="btn-retry-fetch-rd">
                ลองใหม่อีกครั้ง (Retry)
              </button>
            </div>
          </div>
        `;
        const retryBtn = document.getElementById('btn-retry-fetch-rd');
        if (retryBtn) retryBtn.addEventListener('click', () => this.fetchAllRundowns(true));
      }
      if (showToastOnManual) {
        this.showToast(`ดึงรายการ Rundown ล้มเหลว: ${err.message}`, 'danger');
      }
    } finally {
      this.isLoading = false;
    }
  }

  renderList() {
    this.updateActiveBanner();
    const content = document.getElementById('rundowns-list-content');
    if (!content) return;

    const { spxLoadedRundown = '' } = this.store.getState();

    if (!this.projectsData || this.projectsData.length === 0) {
      content.innerHTML = `
        <div class="card p-5 text-center text-muted">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" class="mb-2" style="display:inline-block;">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <div class="fw-600 fs-md">ไม่พบ Rundown ในระบบ SPX</div>
          <div class="fs-xs text-muted mt-1">กรุณาตรวจสอบว่าสร้าง Rundown ใน SPX Controller เรียบร้อยแล้ว</div>
        </div>
      `;
      return;
    }

    // Filter by search term
    const filteredProjects = this.projectsData
      .map(projObj => {
        const projName = projObj.project || '';
        const rundowns = Array.isArray(projObj.rundowns) ? projObj.rundowns : [];

        if (!this.searchTerm) return projObj;

        const matchProj = projName.toLowerCase().includes(this.searchTerm);
        if (matchProj) return projObj;

        const matchedRundowns = rundowns.filter(rd => {
          const rdName = typeof rd === 'string' ? rd : (rd.name || rd.file || '');
          return rdName.toLowerCase().includes(this.searchTerm);
        });

        if (matchedRundowns.length > 0) {
          return { ...projObj, rundowns: matchedRundowns };
        }
        return null;
      })
      .filter(Boolean);

    if (filteredProjects.length === 0) {
      content.innerHTML = `
        <div class="card p-4 text-center text-muted">
          <div class="fw-600">ไม่พบ Rundown ที่ตรงกับ "${this.searchTerm}"</div>
          <div class="fs-xs mt-1">ลองเปลี่ยนคำค้นหาใหม่</div>
        </div>
      `;
      return;
    }

    // Render Grid of Projects
    let html = `<div class="rundown-projects-grid">`;

    filteredProjects.forEach(projObj => {
      const projName = projObj.project || 'Default';
      const rundowns = Array.isArray(projObj.rundowns) ? projObj.rundowns : [];

      html += `
        <div class="card rundown-project-card mb-3">
          <div class="card-header flex-between p-3 border-b bg-slate-50">
            <div class="flex-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="fw-700 fs-md text-primary font-mono">${projName}</span>
            </div>
            <span class="badge badge-info fs-xs">${rundowns.length} Rundown${rundowns.length !== 1 ? 's' : ''}</span>
          </div>

          <div class="card-body p-0">
            <div class="rundown-items-list">
      `;

      if (rundowns.length === 0) {
        html += `<div class="p-3 text-muted fs-xs text-center">ไม่มี Rundown ใน Project นี้</div>`;
      } else {
        rundowns.forEach(rd => {
          const rdName = typeof rd === 'string' ? rd : (rd.name || rd.file || 'Unnamed');
          const fileIdentifier = `${projName}/${rdName}`;
          const isLoaded = (fileIdentifier === spxLoadedRundown);
          const isCurrentlyLoading = (this.loadingRundownKey === fileIdentifier);

          html += `
            <div class="rundown-item-row flex-between p-3 border-b ${isLoaded ? 'is-active-rundown' : ''}">
              <div class="flex-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isLoaded ? 'var(--accent-play)' : '#64748b'}" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <div>
                  <div class="fw-700 fs-sm ${isLoaded ? 'text-success' : 'text-primary'}">${rdName}</div>
                  <div class="fs-xs font-mono text-muted">${fileIdentifier}</div>
                </div>
              </div>

              <div class="flex-center gap-2">
                ${isLoaded ? `
                  <span class="badge badge-success flex-center gap-1">
                    ● LOADED IN SPX
                  </span>
                ` : `
                  <span class="badge badge-neutral">Ready</span>
                `}

                <button 
                  class="btn btn-sm ${isLoaded ? 'btn-outline' : 'btn-primary'} btn-load-rundown flex-center gap-1" 
                  data-project="${projName}" 
                  data-rundown="${rdName}"
                  data-file="${fileIdentifier}"
                  ${isCurrentlyLoading ? 'disabled' : ''}
                >
                  ${isCurrentlyLoading ? `
                    <div class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #ffffff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
                    <span>กำลังส่งคำสั่ง...</span>
                  ` : `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>${isLoaded ? 'Reload ใน SPX' : 'Load เข้า SPX'}</span>
                  `}
                </button>
              </div>
            </div>
          `;
        });
      }

      html += `
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    content.innerHTML = html;

    // Bind Load Buttons
    content.querySelectorAll('.btn-load-rundown').forEach(btn => {
      btn.addEventListener('click', async () => {
        const project = btn.dataset.project;
        const rundown = btn.dataset.rundown;
        const file = btn.dataset.file;
        await this.handleLoadRundown(project, rundown, file);
      });
    });
  }

  async handleLoadRundown(project, rundown, file) {
    this.loadingRundownKey = file;
    this.renderList();

    try {
      // 1. Call SPX API /api/v1/rundown/load?file=Project/Rundown
      await this.api.loadRundown(file);

      // 2. Persist loaded rundown state in localStorage and Store
      try {
        localStorage.setItem(STORAGE_KEY_LOADED_RUNDOWN, file);
      } catch (e) {}

      this.store.setState({
        spxLoadedRundown: file
      });

      this.showToast(`✅ สั่ง SPX โหลด Rundown "${file}" เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error('Failed to load rundown in SPX:', err);
      this.showToast(`สั่ง SPX โหลด Rundown "${file}" ล้มเหลว: ${err.message}`, 'danger');
    } finally {
      this.loadingRundownKey = null;
      this.renderList();
    }
  }
}
