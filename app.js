(function(){
  "use strict";

  /* ============ storage ============ */
  const LS = {
    profile:'ditapp_profile',
    projects:'ditapp_projects',
    reports:'ditapp_reports',
    photos:'ditapp_photos',
    activeProject:'ditapp_active_project'
  };

  function load(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  }
  function save(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ console.error('save failed', key, e); return false; }
  }
  function uid(p){ return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

  let profile = load(LS.profile, { name:'', role:'DIT', phone:'', email:'', studio:'' });
  let projects = load(LS.projects, []);
  let reports  = load(LS.reports, []);
  let photos   = load(LS.photos, []);
  let activeProjectId = load(LS.activeProject, projects[0] ? projects[0].id : null);

  function getProject(id){ return projects.find(p => p.id === id) || null; }
  function projectName(id){ const p = getProject(id); return p ? (p.name || 'Untitled') : 'No project'; }

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
      favorite:false,
      updatedAt: Date.now()
    };
  }

  /* ============ navigation state ============ */
  const NAV_MAIN = ['home','calendar','photos','reports','profile'];
  let currentScreen = 'home';
  let backTarget = null;
  let currentReportId = null;

  let homeSelectedDate = null;
  let calProjectFilter = 'all';
  let calYear, calMonth, calSelectedDate = todayISO();
  { const t = new Date(); calYear = t.getFullYear(); calMonth = t.getMonth(); }
  let listProjectFilter = 'all';
  let photoProjectFilter = 'all';
  let crewSelectedProjectId = activeProjectId;
  let openPhotoId = null;
  let listFavOnly = false;
  let photoFavOnly = false;

  const screenTitles = { home:'DIT Report', calendar:'Calendar', photos:'Photos', reports:'All reports', editor:'Report editor', crew:'Crew & projects', profile:'Profile' };

  function showScreen(name){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    if(NAV_MAIN.includes(name)){
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
    }
    document.getElementById('topbarTitle').textContent = screenTitles[name] || 'DIT Report';
    const isSub = !NAV_MAIN.includes(name);
    document.getElementById('backBtn').style.display = isSub ? 'flex' : 'none';
    document.querySelector('.bottom-nav').style.display = isSub ? 'none' : 'flex';
    document.getElementById('fabNew').style.display = (name === 'home' || name === 'calendar' || name === 'reports') ? 'flex' : 'none';
    currentScreen = name;
    if(name === 'home') renderHome();
    if(name === 'calendar') renderCalendarScreen();
    if(name === 'photos') renderPhotosScreen();
    if(name === 'reports') renderReportsScreen();
    if(name === 'crew') renderCrewScreen();
    if(name === 'profile') renderProfileScreen();
  }

  function openSubScreen(name){
    backTarget = currentScreen;
    showScreen(name);
  }

  /* ============ HOME ============ */
  function renderHome(){
    document.getElementById('homeGreeting').textContent = profile.name ? ('Hi, ' + profile.name.split(' ')[0]) : 'Hi there';
    document.getElementById('homeToday').textContent = fmtDateLabel(todayISO());
    document.getElementById('activeProjectChip').textContent = activeProjectId ? projectName(activeProjectId) : 'No project — add one in Crew & projects';

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
    if(!homeSelectedDate) list = list.slice(0, 8);

    const container = document.getElementById('recentReports');
    container.innerHTML = '';
    document.getElementById('homeEmpty').style.display = list.length ? 'none' : 'block';
    list.forEach(r => container.appendChild(reportCardEl(r)));
  }

  function starIconSvg(){
    return '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3.5l2.6 5.6 6 .7-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6-4.4-4.2 6-.7z"/></svg>';
  }

  function reportCardEl(r){
    const div = document.createElement('div');
    div.className = 'report-card';
    div.innerHTML = `
      <div class="rc-top-row">
        <div class="rc-top">
          <div>
            <div class="rc-project">${escapeHtml(projectName(r.projectId))}</div>
            <div class="rc-date">${fmtDateLabel(r.date)}</div>
          </div>
          <div class="badge ${r.mediaType === 'RAW' ? 'badge-raw' : 'badge-offline'}">${r.mediaType}</div>
        </div>
        <button class="star-btn${r.favorite ? ' favorited' : ''}" data-id="${r.id}" aria-label="Toggle favorite">${starIconSvg()}</button>
      </div>
      <div class="rc-meta">
        <span>Cards: ${r.rows.length}</span>
        <span>Storage: ${escapeHtml(r.hardDisk || '—')}</span>
      </div>
    `;
    div.querySelector('.star-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleReportFavorite(r.id, e.currentTarget);
    });
    div.addEventListener('click', () => openEditor(r.id, currentScreen));
    return div;
  }

  function toggleReportFavorite(id, btnEl){
    const rep = reports.find(r => r.id === id);
    if(!rep) return;
    rep.favorite = !rep.favorite;
    save(LS.reports, reports);
    if(btnEl){
      btnEl.classList.toggle('favorited', rep.favorite);
      btnEl.classList.remove('pop'); void btnEl.offsetWidth; btnEl.classList.add('pop');
    }
    // Re-render whichever list screen is active so sorting/filtering stays correct
    if(currentScreen === 'home') renderHome();
    else if(currentScreen === 'calendar') renderCalendarScreen();
    else if(currentScreen === 'reports') renderReportsScreen();
  }

  /* ============ shared project switcher ============ */
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

  /* ============ CALENDAR ============ */
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
    let nextMonthDay = 1;
    while(cells.length % 7 !== 0) cells.push({ day: nextMonthDay++, muted:true });

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
    if(!pid){ alert('Create a project first, then add a report.'); openSubScreen('crew'); return; }
    createAndOpenReport(pid, calSelectedDate, 'calendar');
  });

  /* ============ PHOTOS ============ */
  function renderPhotosScreen(){
    renderProjectSwitcher(document.getElementById('projectSwitcherPhotos'), photoProjectFilter, (id) => {
      photoProjectFilter = id;
      renderPhotosScreen();
    });
    document.getElementById('favFilterPhotos').classList.toggle('active', photoFavOnly);
    let list = photos.filter(p => photoProjectFilter === 'all' || p.projectId === photoProjectFilter);
    if(photoFavOnly) list = list.filter(p => p.favorite);
    list.sort((a,b) => (b.favorite === a.favorite ? 0 : b.favorite ? 1 : -1) || b.createdAt - a.createdAt);
    const grid = document.getElementById('photoGrid');
    grid.innerHTML = '';
    document.getElementById('photosEmpty').style.display = list.length ? 'none' : 'block';
    list.forEach(p => {
      const thumb = document.createElement('div');
      thumb.className = 'photo-thumb';
      thumb.innerHTML = `<img src="${p.dataUrl}" alt=""><div class="pt-star${p.favorite ? ' favorited' : ''}">${starIconSvg()}</div><div class="pt-date">${fmtDateLabel(p.date)}</div>`;
      thumb.addEventListener('click', () => openLightbox(p.id));
      grid.appendChild(thumb);
    });
  }
  document.getElementById('favFilterPhotos').addEventListener('click', () => {
    photoFavOnly = !photoFavOnly;
    renderPhotosScreen();
  });

  function resizeImage(file, maxDim, quality){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let w = img.width, h = img.height;
          if(w > h && w > maxDim){ h = Math.round(h * maxDim / w); w = maxDim; }
          else if(h > maxDim){ w = Math.round(w * maxDim / h); h = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  document.getElementById('addPhotoBtn').addEventListener('click', () => {
    document.getElementById('photoInput').click();
  });
  document.getElementById('photoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if(!file) return;
    try{
      const dataUrl = await resizeImage(file, 1280, 0.72);
      const caption = prompt('Add a caption (optional):', '') || '';
      const pid = photoProjectFilter !== 'all' ? photoProjectFilter : activeProjectId;
      const photo = { id: uid('photo'), date: todayISO(), projectId: pid, caption, dataUrl, favorite:false, createdAt: Date.now() };
      photos.push(photo);
      const ok = save(LS.photos, photos);
      if(!ok){
        photos.pop();
        alert("Couldn't save that photo — storage is full. Try deleting some older photos first.");
        return;
      }
      renderPhotosScreen();
    }catch(err){
      console.error(err);
      alert('Could not read that photo. Please try again.');
    }
  });

  function openLightbox(photoId){
    const p = photos.find(x => x.id === photoId);
    if(!p) return;
    openPhotoId = photoId;
    document.getElementById('lightboxImg').src = p.dataUrl;
    document.getElementById('lightboxCaption').textContent = [fmtDateLabel(p.date), projectName(p.projectId), p.caption].filter(Boolean).join(' · ');
    document.getElementById('lightboxStar').classList.toggle('favorited', !!p.favorite);
    document.getElementById('photoLightbox').classList.add('open');
  }
  function closeLightbox(){
    document.getElementById('photoLightbox').classList.remove('open');
    openPhotoId = null;
  }
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('photoLightbox').addEventListener('click', (e) => {
    if(e.target.id === 'photoLightbox') closeLightbox();
  });
  document.getElementById('lightboxStar').addEventListener('click', (e) => {
    if(!openPhotoId) return;
    const p = photos.find(x => x.id === openPhotoId);
    if(!p) return;
    p.favorite = !p.favorite;
    save(LS.photos, photos);
    e.currentTarget.classList.toggle('favorited', p.favorite);
    e.currentTarget.classList.remove('pop'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('pop');
  });
  document.getElementById('lightboxShare').addEventListener('click', async () => {
    if(!openPhotoId) return;
    const p = photos.find(x => x.id === openPhotoId);
    if(!p) return;
    try{
      const res = await fetch(p.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      if(navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({
          files:[file],
          title:'DIT Report photo',
          text:[fmtDateLabel(p.date), projectName(p.projectId), p.caption].filter(Boolean).join(' · ')
        });
      } else if(navigator.share){
        await navigator.share({ title:'DIT Report photo', text:'Photo from ' + projectName(p.projectId) });
      } else {
        const a = document.createElement('a');
        a.href = p.dataUrl; a.download = 'dit-photo-' + p.date + '.jpg'; a.click();
      }
    }catch(err){
      if(err && err.name !== 'AbortError') console.error('Photo share failed', err);
    }
  });
  document.getElementById('lightboxDelete').addEventListener('click', () => {
    if(!openPhotoId) return;
    if(!confirm('Delete this photo?')) return;
    photos = photos.filter(p => p.id !== openPhotoId);
    save(LS.photos, photos);
    closeLightbox();
    renderPhotosScreen();
  });

  /* ============ REPORTS LIST ============ */
  function renderReportsScreen(){
    renderProjectSwitcher(document.getElementById('projectSwitcherList'), listProjectFilter, (id) => {
      listProjectFilter = id;
      renderReportsScreen();
    });
    document.getElementById('favFilterList').classList.toggle('active', listFavOnly);
    filterAndRenderList();
  }
  document.getElementById('favFilterList').addEventListener('click', () => {
    listFavOnly = !listFavOnly;
    renderReportsScreen();
  });
  document.getElementById('reportSearch').addEventListener('input', filterAndRenderList);
  function filterAndRenderList(){
    const q = document.getElementById('reportSearch').value.trim().toLowerCase();
    let list = reports.filter(r => listProjectFilter === 'all' || r.projectId === listProjectFilter);
    if(listFavOnly) list = list.filter(r => r.favorite);
    if(q){
      list = list.filter(r => {
        const hay = [r.date, r.hardDisk, r.camera, r.studioName, r.remarks, projectName(r.projectId)]
          .concat(r.rows.map(row => row.storage + ' ' + row.cardNo + ' ' + row.remarks))
          .join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    list.sort((a,b) => (b.favorite === a.favorite ? 0 : b.favorite ? 1 : -1) || (b.date||'').localeCompare(a.date||'') || b.updatedAt - a.updatedAt);
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
    if(!pid){ alert('Create a project first, then add a report.'); openSubScreen('crew'); return; }
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
        <div class="row-remarks"><label>Remarks</label><input data-field="remarks" data-idx="${idx}" value="${escapeHtml(row.remarks)}"></div>
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
    const sortedProjects = projects.slice().sort((a,b) => (b.favorite === a.favorite ? 0 : b.favorite ? 1 : -1));
    sortedProjects.forEach(p => {
      const item = document.createElement('div');
      item.className = 'project-item' + (p.id === crewSelectedProjectId ? ' active' : '');
      item.innerHTML = `
        <div><div class="pi-name">${escapeHtml(p.name || 'Untitled')}</div><div class="pi-sub">${escapeHtml(p.director || '—')} · ${p.crew.length} crew</div></div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${p.id === activeProjectId ? '<div class="pi-badge">ACTIVE</div>' : ''}
          <button class="star-btn${p.favorite ? ' favorited' : ''}" data-pid="${p.id}" aria-label="Toggle favorite">${starIconSvg()}</button>
        </div>
      `;
      item.querySelector('.star-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        p.favorite = !p.favorite;
        save(LS.projects, projects);
        e.currentTarget.classList.toggle('favorited', p.favorite);
        e.currentTarget.classList.remove('pop'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('pop');
        renderCrewScreen();
      });
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
          <div class="crew-actions"><button data-idx="${idx}" class="crew-del">&times;</button></div>
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
      favorite:false,
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
      (profile.phone ? escapeHtml(profile.phone) + '<br>' : '') +
      (profile.email ? escapeHtml(profile.email) + '<br>' : '') +
      (profile.studio ? escapeHtml(profile.studio) : '');
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
  document.getElementById('manageCrewBtn').addEventListener('click', () => openSubScreen('crew'));

  /* ============ NAV BINDINGS ============ */
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.nav));
  });
  document.querySelectorAll('[data-nav]').forEach(el => {
    if(!el.classList.contains('nav-btn')){
      el.addEventListener('click', () => {
        if(el.dataset.nav === 'crew'){ openSubScreen('crew'); }
        else { showScreen(el.dataset.nav); }
      });
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

  /* ============ PDF EXPORT (pure vector — no canvas involved anywhere) ============ */
  // Deliberately avoids html2canvas/screenshot-based PDF generation entirely.
  // Rasterizing a page to a canvas depends on canvas-read APIs that browsers'
  // anti-fingerprinting protections (Brave Shields, Firefox strict mode) and
  // some ad-blockers routinely block or blank out — which produced blank PDFs
  // no matter how the capture itself was tuned. Drawing text/lines straight
  // into the PDF with jsPDF's own API sidesteps that whole failure class, and
  // also yields a smaller file with real selectable text instead of an image.
  document.getElementById('exportPdfBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const originalLabel = btn.textContent;
    btn.textContent = 'Preparing…';
    btn.disabled = true;

    try{
      if(!window.jspdf || !window.jspdf.jsPDF){
        throw new Error('LIBS_NOT_LOADED');
      }

      const project = getProject(currentReport.projectId) || {};
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit:'pt', format:'a4', orientation:'portrait' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      const inkColor = [17, 24, 39];
      const mutedColor = [107, 114, 128];
      const borderColor = [231, 231, 234];
      const headerFillColor = [17, 24, 39];

      let y = margin;

      function ensureSpace(needed){
        if(y + needed > pageHeight - margin){
          doc.addPage();
          y = margin;
        }
      }

      // ---- Title ----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...inkColor);
      doc.text('D.I.T Report', margin, y + 16);
      y += 26;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...mutedColor);
      const subtitle = `${project.name || 'Untitled project'} — ${fmtDateLabel(currentReport.date)} — Page ${currentReport.pageNo || '1'} of ${currentReport.pageOf || '1'}`;
      doc.text(subtitle, margin, y);
      y += 18;
      doc.setDrawColor(...inkColor);
      doc.setLineWidth(1.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 20;

      // ---- Meta grid (two columns) ----
      const metaPairs = [
        ['Production house', project.productionHouse || ''],
        ['Director', project.director || ''],
        ['DOP', project.dop || ''],
        ['Camera', currentReport.camera || ''],
        ['Studio', currentReport.studioName || ''],
        ['Hard disk', currentReport.hardDisk || ''],
        ['Media type', currentReport.mediaType + (currentReport.mediaType === 'OFFLINE' ? ` (${currentReport.format || ''} / ${currentReport.codec || ''})` : '')],
        ['Remarks', currentReport.remarks || '']
      ];
      const colWidth = contentWidth / 2;
      const baseRowHeight = 26;
      const metaLineHeight = 12;
      for(let i = 0; i < metaPairs.length; i += 2){
        const pairA = metaPairs[i];
        const pairB = metaPairs[i + 1];
        const linesA = doc.splitTextToSize(pairA[1] || '—', colWidth - 14);
        const linesB = pairB ? doc.splitTextToSize(pairB[1] || '—', colWidth - 14) : [];
        const maxLines = Math.max(1, linesA.length, linesB.length);
        const rowHeight = baseRowHeight + (maxLines - 1) * metaLineHeight;
        ensureSpace(rowHeight);
        [[pairA, linesA], [pairB, linesB]].forEach(([pair, lines], col) => {
          if(!pair) return;
          const x = margin + col * colWidth;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(...mutedColor);
          doc.text(pair[0].toUpperCase(), x, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(...inkColor);
          doc.text(lines, x, y + 13);
        });
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.75);
        doc.line(margin, y + rowHeight - 7, pageWidth - margin, y + rowHeight - 7);
        y += rowHeight;
      }
      y += 12;

      // ---- Card log table ----
      const columns = [
        { label:'Sl.No', width:32 },
        { label:'Date', width:52 },
        { label:'Card no', width:58 },
        { label:'Clip from', width:62 },
        { label:'Clip to', width:62 },
        { label:'Storage', width:70 }
      ];
      const fixedWidth = columns.reduce((sum, c) => sum + c.width, 0);
      columns.push({ label:'Remarks', width: contentWidth - fixedWidth });

      function drawTableHeader(){
        doc.setFillColor(...headerFillColor);
        doc.rect(margin, y, contentWidth, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        let cx = margin;
        columns.forEach((col) => {
          doc.text(col.label, cx + 5, y + 13.5);
          cx += col.width;
        });
        y += 20;
      }

      ensureSpace(40);
      drawTableHeader();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const cellPad = 5;
      const lineHeight = 11;

      currentReport.rows.forEach((row, idx) => {
        const values = [
          String(idx + 1), row.date || '', row.cardNo || '',
          row.clipFrom || '', row.clipTo || '', row.storage || '', row.remarks || ''
        ];
        const wrapped = values.map((v, i) => doc.splitTextToSize(v || '', columns[i].width - cellPad * 2));
        const linesNeeded = Math.max(1, ...wrapped.map(w => w.length));
        const thisRowHeight = linesNeeded * lineHeight + 6;

        if(y + thisRowHeight > pageHeight - margin){
          doc.addPage();
          y = margin;
          drawTableHeader();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
        }

        doc.setTextColor(...inkColor);
        let cx = margin;
        columns.forEach((col, i) => {
          doc.text(wrapped[i], cx + cellPad, y + 12);
          cx += col.width;
        });
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.75);
        doc.line(margin, y + thisRowHeight, pageWidth - margin, y + thisRowHeight);
        y += thisRowHeight;
      });
      y += 26;

      // ---- Signatures ----
      ensureSpace(40);
      const sigColWidth = contentWidth / 2;
      doc.setDrawColor(...inkColor);
      doc.setLineWidth(1);
      doc.line(margin, y, margin + sigColWidth - 20, y);
      doc.line(margin + sigColWidth, y, margin + sigColWidth + sigColWidth - 20, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...inkColor);
      doc.text('1st AC / DIT: ' + (currentReport.signAC || ''), margin, y);
      doc.text('Ast. Director: ' + (currentReport.signDirector || ''), margin + sigColWidth, y);

      const filename = (projectName(currentReport.projectId) + '_' + currentReport.date + '_DIT-Report.pdf').replace(/[^a-z0-9_.\-]+/gi,'_');
      doc.save(filename);
    }catch(err){
      console.error('PDF export failed', err);
      if(err && err.message === 'LIBS_NOT_LOADED'){
        alert("Couldn't load the PDF tool. Check your internet connection and try again — if it keeps happening, an ad blocker or firewall may be blocking cdnjs.cloudflare.com.");
      } else {
        alert("Couldn't generate the PDF. Please try again.");
      }
    }finally{
      btn.textContent = originalLabel;
      btn.disabled = false;
    }
  });

  /* ============ EXCEL EXPORT ============ */
  function reportSheetRows(r){
    const header = ['Sl.No','Date','Project','Card No','Clip From','Clip To','Storage','Remarks'];
    return [header].concat(reportToCsvRows(r));
  }

  function downloadXlsx(filename, sheets){
    const wb = XLSX.utils.book_new();
    sheets.forEach(s => {
      const ws = XLSX.utils.aoa_to_sheet(s.rows);
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
  }

  document.getElementById('exportXlsxBtn').addEventListener('click', () => {
    try{
      downloadXlsx(
        (projectName(currentReport.projectId) + '_' + currentReport.date + '.xlsx').replace(/[^a-z0-9_.\-]+/gi,'_'),
        [{ name:'Card Log', rows: reportSheetRows(currentReport) }]
      );
    }catch(err){
      console.error('Excel export failed', err);
      alert("Couldn't generate the Excel file. Please try again.");
    }
  });

  document.getElementById('exportAllXlsxBtn').addEventListener('click', () => {
    try{
      const header = ['Sl.No','Date','Project','Card No','Clip From','Clip To','Storage','Remarks'];
      let rows = [];
      reports.slice().sort((a,b) => (a.date||'').localeCompare(b.date||'')).forEach(r => { rows = rows.concat(reportToCsvRows(r)); });

      const projectRows = [['Project','Director','DOP','Production House','Crew Count']]
        .concat(projects.map(p => [p.name || 'Untitled', p.director || '', p.dop || '', p.productionHouse || '', p.crew.length]));

      const crewRows = [['Project','Role','Name','Phone']];
      projects.forEach(p => p.crew.forEach(c => crewRows.push([p.name || 'Untitled', c.role, c.name, c.phone || ''])));

      downloadXlsx('all_dit_reports.xlsx', [
        { name:'All Reports', rows: [header].concat(rows) },
        { name:'Projects', rows: projectRows },
        { name:'Crew', rows: crewRows }
      ]);
    }catch(err){
      console.error('Excel export failed', err);
      alert("Couldn't generate the Excel file. Please try again.");
    }
  });

  /* ============ CONTACT PICKER ============ */
  function contactPickerSupported(){
    return 'contacts' in navigator && 'ContactsManager' in window;
  }

  // Asks the phone's native contact picker (Android Chrome/Edge only, HTTPS
  // required) for one contact's phone number. The browser shows its own
  // permission/selection UI each time — this app never gets standing access
  // to the address book, only whichever single contact the person taps.
  async function pickPhoneNumber(defaultNumber){
    if(contactPickerSupported()){
      try{
        const contacts = await navigator.contacts.select(['tel','name'], { multiple:false });
        if(contacts && contacts.length && contacts[0].tel && contacts[0].tel.length){
          return contacts[0].tel[0];
        }
        return null; // picker opened but nothing usable was chosen
      }catch(err){
        if(err && err.name === 'SecurityError') return null; // permission denied
        // Any other failure: fall through to the manual prompt below
      }
    }
    return prompt('Enter a phone number (with country code):', defaultNumber || '');
  }

  document.getElementById('pickProfileContactBtn').addEventListener('click', async () => {
    const num = await pickPhoneNumber(document.getElementById('pPhone').value);
    if(num) document.getElementById('pPhone').value = num;
  });
  document.getElementById('pickCrewContactBtn').addEventListener('click', async () => {
    const num = await pickPhoneNumber(document.getElementById('newCrewPhone').value);
    if(num) document.getElementById('newCrewPhone').value = num;
  });

  /* ============ REPORT SHARE (same mechanism as photo sharing) ============ */
  document.getElementById('shareWaBtn').addEventListener('click', async () => {
    const project = getProject(currentReport.projectId) || {};
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

    // Primary path: the same native share sheet used for photos, so sharing a
    // report feels identical to sharing a photo — pick WhatsApp, SMS, email,
    // anything installed, then pick the person inside that app.
    if(navigator.share){
      try{
        await navigator.share({ title: 'DIT Report', text });
        return;
      }catch(err){
        if(err && err.name === 'AbortError') return; // user cancelled the sheet
        // Any other failure: fall through to the WhatsApp-direct fallback below
      }
    }

    // Fallback for browsers without the Web Share API (desktop Safari/Firefox,
    // most desktop browsers): pick a number (from contacts on Android Chrome,
    // typed in elsewhere) and open WhatsApp directly with the text pre-filled.
    const number = await pickPhoneNumber(profile.phone || '');
    if(!number) return;
    const clean = number.replace(/[^\d+]/g,'').replace(/^\+/,'');
    window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(text), '_blank');
  });

  /* ============ PWA INSTALL ============ */
  let deferredInstallPrompt = null;
  const installBtn = document.getElementById('installAppBtn');
  const iosHint = document.getElementById('iosInstallHint');
  const installedHint = document.getElementById('installedHint');

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if(!isStandalone()) installBtn.style.display = 'block';
  });

  installBtn.addEventListener('click', async () => {
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    iosHint.style.display = 'none';
  });

  if(isStandalone()){
    installedHint.style.display = 'block';
  } else {
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    if(isIos) iosHint.style.display = 'block';
  }

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        // A worker may already be waiting from a previous visit
        if(reg.waiting) showUpdateToast(reg);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if(!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
              showUpdateToast(reg);
            }
          });
        });
      }).catch(() => {});

      // Reload once the new worker actually takes control
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if(refreshed) return;
        refreshed = true;
        window.location.reload();
      });
    });
  }

  function showUpdateToast(reg){
    const toast = document.getElementById('updateToast');
    toast.classList.add('show');
    document.getElementById('updateToastBtn').onclick = () => {
      const worker = reg.waiting || reg.installing;
      if(worker) worker.postMessage({ type:'SKIP_WAITING' });
      toast.classList.remove('show');
    };
  }

  /* ============ INIT ============ */
  showScreen('home');
})();
