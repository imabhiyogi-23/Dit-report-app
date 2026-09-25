(function(){
  "use strict";

  /* ============ storage ============ */
  const LS = {
    profile:'ditapp_profile',
    projects:'ditapp_projects',
    reports:'ditapp_reports',
    activeProject:'ditapp_active_project'
  };

  function load(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  }
  function save(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }
    catch(e){ console.error('save failed', key, e); }
  }
  function uid(p){ return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

  let profile = load(LS.profile, { name:'', role:'DIT', phone:'', email:'', studio:'' });
  let projects = load(LS.projects, []);
  let reports  = load(LS.reports, []);
  let activeProjectId = load(LS.activeProject, projects[0] ? projects[0].id : null);

  function persistAll(){
    save(LS.profile, profile);
    save(LS.projects, projects);
    save(LS.reports, reports);
    save(LS.activeProject, activeProjectId);
  }

  function getProject(id){ return projects.find(p => p.id === id) || null; }
  function projectName(id){ const p = getProject(id); return p ? p.name : 'No project'; }

  function todayISO(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function fmtDateLabel(iso){
    if(!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday:'short', day:'numeric', month:'short' });
  }
  function escapeHtml(v){
    return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function blankRow(){ return { date:'', cardNo:'', clipFrom:'', clipTo:'', storage:'', remarks:'' }; }
  function blankReport(projectId, date){
    return {
      id: uid('rep'),
      projectId: projectId || null,
      date: date || todayISO(),
      pageNo:'1', pageOf:'1',
      camera:'', studioName:'', hardDisk:'',
      mediaType:'RAW', format:'', codec:'',
      remarks:'',
      rows:[ blankRow() ],
      signAC:'', signDirector:'',
      updatedAt: Date.now()
    };
  }

  /* ============ navigation state ============ */
  let currentScreen = 'home';
  let backTarget = null;
  let currentReportId = null;

  let homeSelectedDate = null;
  let calProjectFilter = 'all';
  let calYear, calMonth, calSelectedDate = todayISO();
  { const t = new Date(); calYear = t.getFullYear(); calMonth = t.getMonth(); }
  let listProjectFilter = 'all';
  let crewSelectedProjectId = activeProjectId;

  const screenTitles = { home:'DIT Report', calendar:'Calendar', reports:'All reports', editor:'Report editor', crew:'Crew & projects', profile:'Profile' };

  function showScreen(name, opts){
    opts = opts || {};
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
    document.getElementById('topbarTitle').textContent = screenTitles[name] || 'DIT Report';
    document.getElementById('backBtn').style.display = (name === 'editor' && opts.showBack !== false) ? 'flex' : 'none';
    document.querySelector('.bottom-nav').style.display = name === 'editor' ? 'none' : 'flex';
    document.getElementById('fabNew').style.display = name === 'editor' ? 'none' : 'flex';
    currentScreen = name;
    if(name === 'home') renderHome();
    if(name === 'calendar') renderCalendarScreen();
    if(name === 'reports') renderReportsScreen();
    if(name === 'crew') renderCrewScreen();
    if(name === 'profile') renderProfileScreen();
  }

  /* ============ HOME ============ */
  function renderHome(){
    document.getElementById('homeGreeting').textContent = profile.name ? ('Hi, ' + profile.name.split(' ')[0]) : 'Hi there';
    document.getElementById('homeToday').textContent = fmtDateLabel(todayISO());
    document.getElementById('activeProjectChip').textContent = activeProjectId ? projectName(activeProjectId) : 'No project — add one in Crew';

    const strip = document.getElementById('dateStrip');
    strip.innerHTML = '';
    const base = new Date();
    for(let i=-3;i<=3;i++){
      const d = new Date(base);
      d.setDate(base.getDate()+i);
      const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      const hasReports = reports.some(r => r.date === iso && (!activeProjectId || r.projectId === activeProjectId));
      const chip = document.createElement('div');
      chip.className = 'date-chip' + (iso === todayISO() ? ' today' : '') + (iso === homeSelectedDate ? ' selected' : '');
      chip.innerHTML = `<div class="dow">${d.toLocaleDateString(undefined,{weekday:'short'})}</div><div class="dnum">${d.getDate()}</div>${hasReports ? '<div class="dot"></div>' : ''}`;
      chip.addEventListener('click', () => {
        homeSelectedDate = (homeSelectedDate === iso) ? null : iso;
        renderHome();
      });
      strip.appendChild(chip);
    }

    let list = reports.slice();
    if(homeSelectedDate) list = list.filter(r => r.date === homeSelectedDate);
    list.sort((a,b) => (b.date||'').localeCompare(a.date||'') || b.updatedAt - a.updatedAt);
    list = list.slice(0, homeSelectedDate ? list.length : 8);

    const container = document.getElementById('recentReports');
    container.innerHTML = '';
    document.getElementById('homeEmpty').style.display = list.length ? 'none' : 'block';
    list.forEach(r => container.appendChild(reportCardEl(r)));
  }

  function reportCardEl(r){
    const div = document.createElement('div');
    div.className = 'report-card';
    div.innerHTML = `
      <div class="rc-top">
        <div>
          <div class="rc-project">${escapeHtml(projectName(r.projectId))}</div>
          <div class="rc-date">${fmtDateLabel(r.date)}</div>
        </div>
        <div class="badge ${r.mediaType === 'RAW' ? 'badge-raw' : 'badge-offline'}">${r.mediaType}</div>
      </div>
      <div class="rc-meta">
        <span>🎬 ${r.rows.length} card${r.rows.length===1?'':'s'}</span>
        <span>💾 ${escapeHtml(r.hardDisk || '—')}</span>
      </div>
    `;
    div.addEventListener('click', () => openEditor(r.id, currentScreen));
    return div;
  }

  /* ============ CALENDAR ============ */
  function renderProjectSwitcher(el, activeFilter, onPick){
    el.innerHTML = '';
    const allChip = document.createElement('div');
    allChip.className = 'ps-chip' + (activeFilter === 'all' ? ' active' : '');
    allChip.textContent = 'All projects';
    allChip.addEventListener('click', () => onPick('all'));
    el.appendChild(allChip);
    projects.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'ps-chip' + (activeFilter === p.id ? ' active' : '');
      chip.textContent = p.name || 'Untitled';
      chip.addEventListener('click', () => onPick(p.id));
      el.appendChild(chip);
    });
  }

  function renderCalendarScreen(){
    renderProjectSwitcher(document.getElementById('projectSwitcherCal'), calProjectFilter, (id) => {
      calProjectFilter = id;
      renderCalendarScreen();
    });

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calMonthLabel').textContent = monthNames[calMonth] + ' ' + calYear;

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    ['S','M','T','W','T','F','S'].forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = d;
      grid.appendChild(el);
    });

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const cells = [];
    for(let i=firstDay-1;i>=0;i--) cells.push({ day: daysInPrevMonth-i, muted:true });
    for(let d=1; d<=daysInMonth; d++) cells.push({ day:d, muted:false });
    while(cells.length % 7 !== 0) cells.push({ day: cells.length, muted:true });

    cells.forEach(c => {
      const cell = document.createElement('div');
      let iso = null;
      if(!c.muted){
        iso = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(c.day).padStart(2,'0');
      }
      cell.className = 'cal-cell' + (c.muted ? ' muted' : '') + (iso === todayISO() ? ' today' : '') + (iso === calSelectedDate ? ' selected' : '');
      const hasReports = iso && reports.some(r => r.date === iso && (calProjectFilter === 'all' || r.projectId === calProjectFilter));
      cell.innerHTML = c.day + (hasReports ? '<div class="dot"></div>' : '');
      if(!c.muted){
        cell.addEventListener('click', () => { calSelectedDate = iso; renderCalendarScreen(); });
      }
      grid.appendChild(cell);
    });

    document.getElementById('calSelectedDateLabel').textContent = fmtDateLabel(calSelectedDate);
    const dayReports = reports.filter(r => r.date === calSelectedDate && (calProjectFilter === 'all' || r.projectId === calProjectFilter))
      .sort((a,b) => b.updatedAt - a.updatedAt);
    const dayList = document.getElementById('calDayReports');
    dayList.innerHTML = '';
    dayReports.forEach(r => dayList.appendChild(reportCardEl(r)));
  }

  document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--; if(calMonth < 0){ calMonth = 11; calYear--; }
    renderCalendarScreen();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calMonth++; if(calMonth > 11){ calMonth = 0; calYear++; }
    renderCalendarScreen();
  });
  document.getElementById('calAddForDay').addEventListener('click', () => {
    const pid = calProjectFilter !== 'all' ? calProjectFilter : activeProjectId;
    if(!pid){ alert('Create a project first (Crew tab), then add a report.'); showScreen('crew'); return; }
    createAndOpenReport(pid, calSelectedDate, 'calendar');
  });

  /* ============ REPORTS LIST ============ */
  function renderReportsScreen(){
    renderProjectSwitcher(document.getElementById('projectSwitcherList'), listProjectFilter, (id) => {
      listProjectFilter = id;
      renderReportsScreen();
    });
    filterAndRenderList();
  }
  document.getElementById('reportSearch').addEventListener('input', filterAndRenderList);
  function filterAndRenderList(){
    const q = document.getElementById('reportSearch').value.trim().toLowerCase();
    let list = reports.filter(r => listProjectFilter === 'all' || r.projectId === listProjectFilter);
    if(q){
      list = list.filter(r => {
        const hay = [r.date, r.hardDisk, r.camera, r.studioName, r.remarks, projectName(r.projectId)]
          .concat(r.rows.map(row => row.storage + ' ' + row.cardNo + ' ' + row.remarks))
          .join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    list.sort((a,b) => (b.date||'').localeCompare(a.date||'') || b.updatedAt - a.updatedAt);
    const container = document.getElementById('allReports');
    container.innerHTML = '';
    document.getElementById('reportsEmpty').style.display = list.length ? 'none' : 'block';
    list.forEach(r => container.appendChild(reportCardEl(r)));
  }

  /* ============ EDITOR ============ */
  let currentReport = null;

  function openEditor(reportId, fromScreen){
    currentReport = reports.find(r => r.id === reportId);
    currentReportId = reportId;
    backTarget = fromScreen || 'home';
    populateEditorProjectSelect();
    renderEditorFields();
    showScreen('editor');
  }

  function createAndOpenReport(projectId, date, fromScreen){
    const rep = blankReport(projectId, date);
    reports.push(rep);
    save(LS.reports, reports);
    openEditor(rep.id, fromScreen);
  }

  document.getElementById('fabNew').addEventListener('click', () => {
    const pid = activeProjectId || (projects[0] && projects[0].id);
    if(!pid){ alert('Create a project first (Crew tab), then add a report.'); showScreen('crew'); return; }
    createAndOpenReport(pid, todayISO(), currentScreen);
  });
  document.querySelectorAll('[data-action="new-report"]').forEach(b => b.addEventListener('click', () => {
    document.getElementById('fabNew').click();
  }));

  document.getElementById('backBtn').addEventListener('click', () => {
    showScreen(backTarget || 'home');
  });

  function populateEditorProjectSelect(){
    const sel = document.getElementById('editorProjectSelect');
    sel.innerHTML = '';
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || 'Untitled';
      sel.appendChild(opt);
    });
    sel.value = currentReport.projectId || '';
  }
  document.getElementById('editorProjectSelect').addEventListener('change', (e) => {
    currentReport.projectId = e.target.value;
    persistReport();
  });

  const editorFieldMap = {
    fDate:'date', fPageNo:'pageNo', fPageOf:'pageOf', fCamera:'camera', fStudioName:'studioName',
    fHardDisk:'hardDisk', fRemarks:'remarks', fFormat:'format', fCodec:'codec',
    fSignAC:'signAC', fSignDirector:'signDirector'
  };
  Object.keys(editorFieldMap).forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
      currentReport[editorFieldMap[id]] = e.target.value;
      persistReport();
    });
  });

  function renderEditorFields(){
    Object.keys(editorFieldMap).forEach(id => {
      document.getElementById(id).value = currentReport[editorFieldMap[id]] || '';
    });
    setMediaType(currentReport.mediaType, false);
    renderRows();
  }

  function setMediaType(type, doSave){
    currentReport.mediaType = type;
    document.getElementById('pillRaw').classList.toggle('active', type === 'RAW');
    document.getElementById('pillOffline').classList.toggle('active', type === 'OFFLINE');
    document.getElementById('formatFields').style.display = type === 'OFFLINE' ? 'grid' : 'none';
    if(doSave !== false) persistReport();
  }
  document.getElementById('pillRaw').addEventListener('click', () => setMediaType('RAW'));
  document.getElementById('pillOffline').addEventListener('click', () => setMediaType('OFFLINE'));

  function renderRows(){
    const list = document.getElementById('rowsList');
    list.innerHTML = '';
    currentReport.rows.forEach((row, idx) => {
      const card = document.createElement('div');
      card.className = 'row-card';
      card.innerHTML = `
        <div class="row-num">#${idx+1}</div>
        <div class="row-grid">
          <div><label>Date</label><input data-field="date" data-idx="${idx}" value="${escapeHtml(row.date)}" placeholder="dd/mm"></div>
          <div><label>Card no</label><input data-field="cardNo" data-idx="${idx}" value="${escapeHtml(row.cardNo)}" placeholder="A001"></div>
          <div><label>Clip from</label><input data-field="clipFrom" data-idx="${idx}" value="${escapeHtml(row.clipFrom)}" placeholder="C001"></div>
          <div><label>Clip to</label><input data-field="clipTo" data-idx="${idx}" value="${escapeHtml(row.clipTo)}" placeholder="C012"></div>
          <div><label>Storage</label><input data-field="storage" data-idx="${idx}" value="${escapeHtml(row.storage)}" placeholder="Drive A"></div>
        </div>
        <div class="row-remarks"><label style="font-size:9.5px;text-transform:uppercase;color:var(--text-muted);font-weight:600;">Remarks</label><input data-field="remarks" data-idx="${idx}" value="${escapeHtml(row.remarks)}"></div>
        <button class="row-del-btn" data-idx="${idx}">Remove card</button>
      `;
      list.appendChild(card);
    });
    document.getElementById('rowCountBadge').textContent = currentReport.rows.length;
  }
  document.getElementById('rowsList').addEventListener('input', (e) => {
    const t = e.target;
    if(t.dataset.field){
      currentReport.rows[parseInt(t.dataset.idx,10)][t.dataset.field] = t.value;
      document.getElementById('rowCountBadge').textContent = currentReport.rows.length;
      persistReport();
    }
  });
  document.getElementById('rowsList').addEventListener('click', (e) => {
    if(e.target.classList.contains('row-del-btn')){
      const idx = parseInt(e.target.dataset.idx,10);
      if(currentReport.rows.length > 1) currentReport.rows.splice(idx,1);
      else currentReport.rows[0] = blankRow();
      renderRows();
      persistReport();
    }
  });
  document.getElementById('addRowBtn').addEventListener('click', () => {
    currentReport.rows.push(blankRow());
    renderRows();
    persistReport();
  });

  function persistReport(){
    currentReport.updatedAt = Date.now();
    const idx = reports.findIndex(r => r.id === currentReport.id);
    if(idx >= 0) reports[idx] = currentReport;
    save(LS.reports, reports);
  }

  document.getElementById('deleteReportBtn').addEventListener('click', () => {
    if(!confirm('Delete this report? This cannot be undone.')) return;
    reports = reports.filter(r => r.id !== currentReport.id);
    save(LS.reports, reports);
    showScreen(backTarget || 'home');
  });

  /* ============ PROJECTS & CREW ============ */
  function renderCrewScreen(){
    const list = document.getElementById('projectList');
    list.innerHTML = '';
    projects.forEach(p => {
      const item = document.createElement('div');
      item.className = 'project-item' + (p.id === crewSelectedProjectId ? ' active' : '');
      item.innerHTML = `<div><div class="pi-name">${escapeHtml(p.name || 'Untitled')}</div><div class="pi-sub">${escapeHtml(p.director || '—')} · ${p.crew.length} crew</div></div>${p.id === activeProjectId ? '<div class="pi-badge">ACTIVE</div>' : ''}`;
      item.addEventListener('click', () => {
        crewSelectedProjectId = p.id;
        activeProjectId = p.id;
        save(LS.activeProject, activeProjectId);
        renderCrewScreen();
      });
      list.appendChild(item);
    });

    const project = getProject(crewSelectedProjectId);
    document.getElementById('crewProjectName').textContent = project ? (project.name || 'Untitled') : 'select a project';
    const crewList = document.getElementById('crewList');
    crewList.innerHTML = '';
    if(project){
      project.crew.forEach((c, idx) => {
        const item = document.createElement('div');
        item.className = 'crew-item';
        item.innerHTML = `
          <div><div class="crew-role">${escapeHtml(c.role)}</div><div class="crew-name">${escapeHtml(c.name)}</div>${c.phone ? '<div class="crew-phone">'+escapeHtml(c.phone)+'</div>' : ''}</div>
          <div class="crew-actions"><button data-idx="${idx}" class="crew-del">✕</button></div>
        `;
        crewList.appendChild(item);
      });
    }
  }
  document.getElementById('crewList').addEventListener('click', (e) => {
    if(e.target.classList.contains('crew-del')){
      const project = getProject(crewSelectedProjectId);
      project.crew.splice(parseInt(e.target.dataset.idx,10), 1);
      save(LS.projects, projects);
      renderCrewScreen();
    }
  });
  document.getElementById('addProjectBtn').addEventListener('click', () => {
    const name = document.getElementById('newProjectName').value.trim();
    if(!name){ alert('Give the project a name first.'); return; }
    const p = {
      id: uid('proj'),
      name,
      director: document.getElementById('newProjectDirector').value.trim(),
      dop: document.getElementById('newProjectDop').value.trim(),
      productionHouse: document.getElementById('newProjectHouse').value.trim(),
      crew: [],
      createdAt: Date.now()
    };
    projects.push(p);
    activeProjectId = p.id;
    crewSelectedProjectId = p.id;
    save(LS.projects, projects);
    save(LS.activeProject, activeProjectId);
    ['newProjectName','newProjectDirector','newProjectDop','newProjectHouse'].forEach(id => document.getElementById(id).value = '');
    renderCrewScreen();
  });
  document.getElementById('addCrewBtn').addEventListener('click', () => {
    const project = getProject(crewSelectedProjectId);
    if(!project){ alert('Select or create a project first.'); return; }
    const role = document.getElementById('newCrewRole').value.trim();
    const name = document.getElementById('newCrewName').value.trim();
    const phone = document.getElementById('newCrewPhone').value.trim();
    if(!role || !name){ alert('Add both a role and a name.'); return; }
    project.crew.push({ id: uid('crew'), role, name, phone });
    save(LS.projects, projects);
    ['newCrewRole','newCrewName','newCrewPhone'].forEach(id => document.getElementById(id).value = '');
    renderCrewScreen();
  });

  /* ============ PROFILE ============ */
  function renderProfileScreen(){
    document.getElementById('profileAvatar').textContent = (profile.name || 'D').trim().charAt(0).toUpperCase();
    document.getElementById('profileNameView').textContent = profile.name || 'Add your name';
    document.getElementById('profileRoleView').textContent = profile.role || 'DIT';
    document.getElementById('profileMetaView').innerHTML =
      (profile.phone ? '📱 ' + escapeHtml(profile.phone) + '<br>' : '') +
      (profile.email ? '✉️ ' + escapeHtml(profile.email) + '<br>' : '') +
      (profile.studio ? '🎬 ' + escapeHtml(profile.studio) : '');
    document.getElementById('pName').value = profile.name || '';
    document.getElementById('pRole').value = profile.role || '';
    document.getElementById('pPhone').value = profile.phone || '';
    document.getElementById('pEmail').value = profile.email || '';
    document.getElementById('pStudio').value = profile.studio || '';
    document.getElementById('profileView').style.display = 'block';
    document.getElementById('profileEdit').style.display = 'none';
  }
  document.getElementById('editProfileBtn').addEventListener('click', () => {
    document.getElementById('profileView').style.display = 'none';
    document.getElementById('profileEdit').style.display = 'block';
  });
  document.getElementById('saveProfileBtn').addEventListener('click', () => {
    profile = {
      name: document.getElementById('pName').value.trim(),
      role: document.getElementById('pRole').value.trim() || 'DIT',
      phone: document.getElementById('pPhone').value.trim(),
      email: document.getElementById('pEmail').value.trim(),
      studio: document.getElementById('pStudio').value.trim()
    };
    save(LS.profile, profile);
    renderProfileScreen();
  });

  /* ============ NAV BINDINGS ============ */
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.nav));
  });
  document.querySelectorAll('[data-nav]').forEach(el => {
    if(!el.classList.contains('nav-btn')){
      el.addEventListener('click', () => showScreen(el.dataset.nav));
    }
  });
  document.getElementById('profileShortcut').addEventListener('click', () => showScreen('profile'));

  /* ============ CSV EXPORT ============ */
  function csvEscape(v){ return '"' + String(v || '').replace(/"/g,'""') + '"'; }

  function reportToCsvRows(r){
    return r.rows.map((row, idx) => [
      idx+1, r.date, projectName(r.projectId), row.cardNo, row.clipFrom, row.clipTo, row.storage, row.remarks
    ]);
  }
  function downloadCsv(filename, header, rows){
    const lines = [header.map(csvEscape).join(',')].concat(rows.map(r => r.map(csvEscape).join(',')));
    const blob = new Blob([lines.join('\n')], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    downloadCsv(
      (projectName(currentReport.projectId) + '_' + currentReport.date + '.csv').replace(/[^a-z0-9_.\-]+/gi,'_'),
      ['Sl.No','Date','Project','Card No','Clip From','Clip To','Storage','Remarks'],
      reportToCsvRows(currentReport)
    );
  });
  document.getElementById('exportAllCsvBtn').addEventListener('click', () => {
    let rows = [];
    reports.slice().sort((a,b) => (a.date||'').localeCompare(b.date||'')).forEach(r => { rows = rows.concat(reportToCsvRows(r)); });
    downloadCsv('all_dit_reports.csv', ['Sl.No','Date','Project','Card No','Clip From','Clip To','Storage','Remarks'], rows);
  });

  /* ============ PDF EXPORT ============ */
  document.getElementById('exportPdfBtn').addEventListener('click', () => {
    const project = getProject(currentReport.projectId) || {};
    const root = document.getElementById('printRoot');
    root.innerHTML = `
      <div class="pdf-sheet">
        <h1>D.I.T Report</h1>
        <div class="pdf-sub">${escapeHtml(project.name || 'Untitled project')} — ${fmtDateLabel(currentReport.date)} — Page ${escapeHtml(currentReport.pageNo)} of ${escapeHtml(currentReport.pageOf)}</div>
        <div class="pdf-grid">
          <div><b>Production house</b>${escapeHtml(project.productionHouse || '')}</div>
          <div><b>Director</b>${escapeHtml(project.director || '')}</div>
          <div><b>DOP</b>${escapeHtml(project.dop || '')}</div>
          <div><b>Camera</b>${escapeHtml(currentReport.camera || '')}</div>
          <div><b>Studio</b>${escapeHtml(currentReport.studioName || '')}</div>
          <div><b>Hard disk</b>${escapeHtml(currentReport.hardDisk || '')}</div>
          <div><b>Media type</b>${escapeHtml(currentReport.mediaType)}${currentReport.mediaType==='OFFLINE' ? ' ('+escapeHtml(currentReport.format||'')+' / '+escapeHtml(currentReport.codec||'')+')' : ''}</div>
          <div><b>Remarks</b>${escapeHtml(currentReport.remarks || '')}</div>
        </div>
        <table class="pdf-table">
          <thead><tr><th>Sl.No</th><th>Date</th><th>Card no</th><th>Clip from</th><th>Clip to</th><th>Storage</th><th>Remarks</th></tr></thead>
          <tbody>
            ${currentReport.rows.map((row,idx) => `<tr><td>${idx+1}</td><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.cardNo)}</td><td>${escapeHtml(row.clipFrom)}</td><td>${escapeHtml(row.clipTo)}</td><td>${escapeHtml(row.storage)}</td><td>${escapeHtml(row.remarks)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="pdf-sign">
          <div>1st AC / DIT: ${escapeHtml(currentReport.signAC || '')}</div>
          <div>Ast. Director: ${escapeHtml(currentReport.signDirector || '')}</div>
        </div>
      </div>
    `;
    const filename = (projectName(currentReport.projectId) + '_' + currentReport.date + '_DIT-Report.pdf').replace(/[^a-z0-9_.\-]+/gi,'_');
    html2pdf().set({ margin:10, filename, html2canvas:{ scale:2 } }).from(root).save();
  });

  /* ============ WHATSAPP SHARE ============ */
  document.getElementById('shareWaBtn').addEventListener('click', () => {
    const project = getProject(currentReport.projectId) || {};
    const defaultNumber = profile.phone || '';
    const number = prompt('Send to WhatsApp number (with country code):', defaultNumber);
    if(!number) return;
    const clean = number.replace(/[^\d+]/g,'').replace(/^\+/,'');
    const text = [
      `*D.I.T Report* — ${project.name || 'Untitled project'}`,
      `Date: ${fmtDateLabel(currentReport.date)}`,
      `Media: ${currentReport.mediaType}`,
      `Camera: ${currentReport.camera || '—'}`,
      `Hard disk: ${currentReport.hardDisk || '—'}`,
      `Cards logged: ${currentReport.rows.length}`,
      currentReport.remarks ? `Remarks: ${currentReport.remarks}` : null,
      '',
      '(Export the PDF or CSV from the app to attach the full log.)'
    ].filter(Boolean).join('\n');
    window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(text), '_blank');
  });

  /* ============ INIT ============ */
  showScreen('home');
})();
