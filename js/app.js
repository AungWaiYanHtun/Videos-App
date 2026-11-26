// =====================================================
// App - UI logic
// =====================================================
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const state = {
    titles: [],
    current: null,      // open title
    videos: [],
    editing: null,      // title being edited (null = new)
    coverFile: null,
    videoFile: null,
    playing: null,      // video being played
    view: 'titles',
    editMode: false,
    allVideos: [],
  };

  /* ---------- Utils ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtSize = (b) => (!b ? '' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(1) + ' MB');
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDur = (s) => (!isFinite(s) ? '' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'));
  const GRADIENTS = ['#ff9a56,#ff5e62', '#43cea2,#185a9d', '#a18cd1,#fbc2eb', '#f6d365,#fda085', '#30cfd0,#330867', '#5ee7df,#b490ca'];
  const gradientFor = (id) => 'linear-gradient(135deg,' + GRADIENTS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length] + ')';

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
    haptic('notification');
  }

  /* ---------- Telegram Mini App ---------- */
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTelegram = !!(tg && tg.initData);
  if (inTelegram) {
    tg.ready();
    tg.expand();
    document.body.classList.add('in-telegram');
    tg.BackButton.onClick(() => {
      if (document.querySelector('.sheet.show')) closeSheets();
      else showView('titles');
    });
  }
  function haptic(type) {
    if (!inTelegram || !tg.HapticFeedback) return;
    if (type === 'notification') tg.HapticFeedback.notificationOccurred('success');
    else tg.HapticFeedback.impactOccurred('light');
  }

  /* ---------- Admin ---------- */
  function setAdmin(on) {
    document.body.classList.toggle('is-admin', on);
    $('#loginBox').classList.toggle('hidden', on);
    $('#logoutBox').classList.toggle('hidden', !on);
    if (!on) setEditMode(false);
    updateFab();
  }
  const isAdmin = () => document.body.classList.contains('is-admin');

  /* ---------- Views ---------- */
  function showView(name) {
    state.view = name;
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === (name === 'detail' ? 'titles' : name)));
    updateFab();
    if (name === 'videos') loadAllVideos();
    if (name !== 'titles') setEditMode(false);
    if (inTelegram) name === 'detail' ? tg.BackButton.show() : tg.BackButton.hide();
    window.scrollTo(0, 0);
  }
  function updateFab() {
    $('#fab').classList.toggle('hidden', state.view !== 'titles');
  }

  /* ---------- Sheets ---------- */
  function openSheet(id) {
    $('#dim').classList.add('show');
    $('#' + id).classList.add('show');
    if (inTelegram) tg.BackButton.show();
  }
  function closeSheets() {
    $$('.sheet').forEach((s) => s.classList.remove('show'));
    $('#dim').classList.remove('show');
    const p = $('#player');
    p.pause();
    p.removeAttribute('src');
    p.load();
    if (inTelegram && state.view !== 'detail') tg.BackButton.hide();
  }

  /* ---------- Titles ---------- */
  async function loadTitles() {
    $('#titlesLoading').classList.remove('hidden');
    try {
      const { titles } = await Api.getTitles();
      state.titles = titles;
      renderGrid();
    } catch (e) {
      toast('Could not load: ' + e.message);
    } finally {
      $('#titlesLoading').classList.add('hidden');
    }
  }

  function renderGrid() {
    const q = $('#search').value.trim().toLowerCase();
    const list = state.titles.filter((t) => t.name.toLowerCase().includes(q));
    $('#grid').innerHTML = list
      .map(
        (t) => `
      <button class="card${state.editMode ? ' editing' : ''}" data-id="${t.id}">
        ${state.editMode ? '<span class="edit-badge">✎</span>' : ''}
        ${t.cover_url
          ? `<img class="card-cover" src="${esc(t.cover_url)}" alt="" loading="lazy" />`
          : `<div class="card-placeholder" style="background:${gradientFor(t.id)}">${esc([...t.name][0] || '?')}</div>`}
        <div class="card-name">${esc(t.name)}${t.is_public ? '' : '<span class="lock">🔒</span>'}</div>
        <div class="card-sub">${t.video_count} video${t.video_count === 1 ? '' : 's'}</div>
      </button>`
      )
      .join('');
    $('#titlesEmpty').classList.toggle('hidden', list.length > 0);
  }

  /* ---------- Edit mode (Titles) ---------- */
  function setEditMode(on) {
    state.editMode = !!on;
    const b = $('#editModeBtn');
    if (!b.dataset.pen) b.dataset.pen = b.innerHTML;
    b.classList.toggle('on', !!on);
    b.innerHTML = on
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
      : b.dataset.pen;
    renderGrid();
  }

  /* ---------- All Videos ---------- */
  async function loadAllVideos() {
    $('#allVideosLoading').classList.toggle('hidden', state.allVideos.length > 0);
    try {
      const { videos } = await Api.getAllVideos();
      state.allVideos = videos;
      renderAllVideos();
    } catch (e) {
      toast('Could not load: ' + e.message);
    } finally {
      $('#allVideosLoading').classList.add('hidden');
    }
  }

  function renderAllVideos() {
    const box = $('#allVideoList');
    box.innerHTML = state.allVideos.map((v) => videoRow(v, v.title_name)).join('');
    box.classList.toggle('hidden', state.allVideos.length === 0);
    $('#allVideosEmpty').classList.toggle('hidden', state.allVideos.length > 0);
    bindDurations(box);
  }

  function videoRow(v, sub) {
    return `
      <button class="row" data-id="${v.id}">
        <div class="thumb"><video src="${esc(v.url)}#t=0.5" preload="metadata" muted playsinline></video><span class="dur"></span></div>
        <div class="row-text">
          <div class="row-title">${esc(v.name)}</div>
          <div class="row-sub">${sub ? esc(sub) + ' · ' : ''}${fmtDate(v.created_at)}${v.size ? ' · ' + fmtSize(v.size) : ''}</div>
        </div>
        <span class="chev">›</span>
      </button>`;
  }

  function bindDurations(box) {
    box.querySelectorAll('video').forEach((vid) => {
      vid.addEventListener('loadedmetadata', () => {
        vid.parentElement.querySelector('.dur').textContent = fmtDur(vid.duration);
      });
    });
  }

  /* ---------- Detail ---------- */
  async function openTitle(id) {
    showView('detail');
    const cached = state.titles.find((t) => t.id === id);
    if (cached) renderHero(cached, cached.video_count);
    $('#videoList').innerHTML = '<div class="loading">Loading…</div>';
    try {
      const { title, videos } = await Api.getTitle(id);
      state.current = title;
      state.videos = videos;
      renderHero(title, videos.length);
      renderVideos();
    } catch (e) {
      toast(e.message);
      showView('titles');
    }
  }

  function renderHero(t, count) {
    const img = $('#heroImg');
    if (t.cover_url) { img.src = t.cover_url; img.style.display = ''; $('.hero').style.background = '#333'; }
    else { img.removeAttribute('src'); img.style.display = 'none'; $('.hero').style.background = gradientFor(t.id); }
    $('#heroName').textContent = t.name;
    $('#heroCount').textContent = count + ' video' + (count === 1 ? '' : 's');
  }

  function renderVideos() {
    const box = $('#videoList');
    box.innerHTML = state.videos.map((v) => videoRow(v, '')).join('');
    box.classList.toggle('hidden', state.videos.length === 0);
    $('#videosEmpty').classList.toggle('hidden', state.videos.length > 0);
    bindDurations(box);
  }

  /* ---------- New / Edit Title sheet ---------- */
  function openTitleSheet(title) {
    state.editing = title || null;
    state.coverFile = null;
    $('#titleSheetHeading').textContent = title ? 'Edit Title' : 'New Title';
    $('#titleSaveBtn').textContent = title ? 'Save Changes' : 'Create Title';
    $('#titleName').value = title ? title.name : '';
    $('#titlePublic').checked = title ? title.is_public : true;
    $('#titleDeleteBtn').classList.toggle('hidden', !title);
    $('#coverInput').value = '';
    setCoverPreview(title && title.cover_url);
    $('#titleProgress').classList.add('hidden');
    openSheet('sheet-title');
  }

  function setCoverPreview(url) {
    const p = $('#coverPreview');
    p.style.backgroundImage = url ? `url("${url}")` : '';
    p.classList.toggle('has-img', !!url);
    $('#coverLabel').textContent = url ? 'Change Photo' : 'Choose Photo';
  }

  // Shrink cover image to max 1000px and convert to JPEG
  function resizeImage(file, max = 1000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('Image error'))), 'image/jpeg', 0.85);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error('Could not open image'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function saveTitle() {
    const name = $('#titleName').value.trim();
    if (!name) return toast('Enter a title name');
    const btns = [$('#titleSaveBtn'), $('#titleSaveTop')];
    btns.forEach((b) => (b.disabled = true));
    const prog = $('#titleProgress');
    prog.classList.remove('hidden');
    const bar = prog.querySelector('.bar i');
    bar.style.width = '10%';
    try {
      const data = { name, is_public: $('#titlePublic').checked };
      if (state.coverFile) {
        const blob = await resizeImage(state.coverFile);
        const up = await Api.upload(blob, 'covers', 'cover.jpg', 'image/jpeg', (p) => (bar.style.width = Math.max(10, p * 0.9) + '%'));
        data.cover_key = up.key;
        data.cover_url = up.publicUrl;
      }
      bar.style.width = '95%';
      if (state.editing) {
        const { title } = await Api.updateTitle(state.editing.id, data);
        state.current = title;
        renderHero(title, state.videos.length);
        toast('Saved ✓');
      } else {
        await Api.createTitle(data);
        toast('Title created ✓');
      }
      bar.style.width = '100%';
      closeSheets();
      loadTitles();
    } catch (e) {
      toast('Failed: ' + e.message);
    } finally {
      btns.forEach((b) => (b.disabled = false));
      prog.classList.add('hidden');
    }
  }

  async function deleteTitle() {
    if (!state.editing) return;
    if (!confirm(`Delete "${state.editing.name}" and all its videos?`)) return;
    try {
      await Api.deleteTitle(state.editing.id);
      closeSheets();
      showView('titles');
      toast('Deleted');
      loadTitles();
    } catch (e) {
      toast(e.message);
    }
  }

  /* ---------- Upload Video sheet ---------- */
  function openUploadSheet() {
    state.videoFile = null;
    $('#videoName').value = '';
    $('#videoInput').value = '';
    $('#videoFileLabel').textContent = 'Choose Video';
    $('#videoFileSub').textContent = 'MP4, MOV, WebM';
    $('#uploadProgress').classList.add('hidden');
    $('#uploadBar').style.width = '0';
    openSheet('sheet-upload');
  }

  async function uploadVideo() {
    const file = state.videoFile;
    if (!file) return toast('Choose a video');
    if (!state.current) return;
    const name = $('#videoName').value.trim() || file.name.replace(/\.[^.]+$/, '');
    const btn = $('#uploadBtn');
    btn.disabled = true;
    $('#uploadProgress').classList.remove('hidden');
    try {
      const up = await Api.upload(file, 'videos', file.name, file.type || 'video/mp4', (p) => {
        $('#uploadBar').style.width = p + '%';
        $('#uploadPct').textContent = p + '%';
      });
      await Api.addVideo({ title_id: state.current.id, name, key: up.key, size: file.size, content_type: file.type });
      closeSheets();
      toast('Upload complete ✓');
      openTitle(state.current.id);
      loadTitles();
    } catch (e) {
      toast('Upload failed: ' + e.message);
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- Player ---------- */
  function openPlayer(id) {
    const v = state.videos.find((x) => x.id === id) || state.allVideos.find((x) => x.id === id);
    if (!v) return;
    state.playing = v;
    $('#playerName').textContent = v.name;
    $('#playerMeta').textContent = fmtDate(v.created_at) + (v.size ? ' · ' + fmtSize(v.size) : '');
    $('#player').src = v.url;
    openSheet('sheet-player');
  }

  async function renameVideo() {
    const v = state.playing;
    const name = prompt('New video name', v.name);
    if (!name || !name.trim() || name === v.name) return;
    try {
      await Api.renameVideo(v.id, name.trim());
      v.name = name.trim();
      $('#playerName').textContent = v.name;
      renderVideos();
      renderAllVideos();
      toast('Saved ✓');
    } catch (e) {
      toast(e.message);
    }
  }

  async function deleteVideo() {
    const v = state.playing;
    if (!confirm(`Delete "${v.name}"?`)) return;
    try {
      await Api.deleteVideo(v.id);
      closeSheets();
      toast('Deleted');
      state.allVideos = state.allVideos.filter((x) => x.id !== v.id);
      if (state.view === 'videos') renderAllVideos();
      else if (state.current) openTitle(state.current.id);
      loadTitles();
    } catch (e) {
      toast(e.message);
    }
  }

  /* ---------- Settings ---------- */
  async function login() {
    const pw = $('#pwInput').value;
    if (!pw) return toast('Enter the password');
    Api.setPassword(pw);
    try {
      await Api.check();
      setAdmin(true);
      $('#pwInput').value = '';
      toast('Signed in ✓');
      loadTitles();
    } catch (e) {
      Api.setPassword('');
      toast('Wrong password');
    }
  }
  function logout() {
    Api.setPassword('');
    setAdmin(false);
    toast('Signed out');
    loadTitles();
  }

  /* ---------- Events ---------- */
  $('#appTitle').textContent = window.APP_CONFIG.APP_TITLE || 'Titles';
  $('#search').addEventListener('input', renderGrid);
  $('#grid').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    haptic();
    if (state.editMode) openTitleSheet(state.titles.find((t) => t.id === card.dataset.id));
    else openTitle(card.dataset.id);
  });
  $('#editModeBtn').addEventListener('click', () => { haptic(); setEditMode(!state.editMode); });
  $('#allVideoList').addEventListener('click', (e) => {
    const row = e.target.closest('.row');
    if (row) openPlayer(row.dataset.id);
  });
  $('#videoList').addEventListener('click', (e) => {
    const row = e.target.closest('.row');
    if (row) openPlayer(row.dataset.id);
  });
  $('#backBtn').addEventListener('click', () => showView('titles'));
  $$('.tab').forEach((t) => t.addEventListener('click', () => { haptic(); showView(t.dataset.tab); }));

  $('#fab').addEventListener('click', () => { haptic(); openTitleSheet(null); });
  $('#editTitleBtn').addEventListener('click', () => openTitleSheet(state.current));
  $('#openUploadBtn').addEventListener('click', openUploadSheet);

  $('#dim').addEventListener('click', closeSheets);
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeSheets));

  $('#coverInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    state.coverFile = f;
    setCoverPreview(URL.createObjectURL(f));
  });
  $('#titleSaveBtn').addEventListener('click', saveTitle);
  $('#titleSaveTop').addEventListener('click', saveTitle);
  $('#titleDeleteBtn').addEventListener('click', deleteTitle);

  $('#videoInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    state.videoFile = f;
    $('#videoFileLabel').textContent = f.name;
    $('#videoFileSub').textContent = fmtSize(f.size);
  });
  $('#uploadBtn').addEventListener('click', uploadVideo);

  $('#renameVideoBtn').addEventListener('click', renameVideo);
  $('#deleteVideoBtn').addEventListener('click', deleteVideo);

  $('#loginBtn').addEventListener('click', login);
  $('#pwInput').addEventListener('keydown', (e) => e.key === 'Enter' && login());
  $('#logoutBtn').addEventListener('click', logout);

  /* ---------- Start ---------- */
  (async function init() {
    if (Api.getPassword()) {
      try { await Api.check(); setAdmin(true); } catch { Api.setPassword(''); setAdmin(false); }
    } else {
      setAdmin(false);
    }
    loadTitles();
  })();
})();
