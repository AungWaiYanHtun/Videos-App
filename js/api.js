// =====================================================
// API - talks to the Worker
// =====================================================
(function () {
  const BASE = String(window.APP_CONFIG.API_URL || '').replace(/\/+$/, '');
  // File links saved as <worker>/f/... are shown through this site's /f/ proxy
  const WORKER = String(window.APP_CONFIG.WORKER_URL || '').replace(/\/+$/, '');
  const localize = (txt) => (WORKER ? txt.split(WORKER + '/f/').join('/f/') : txt);
  const PW_KEY = 'video_app_admin_pw';

  const getPassword = () => localStorage.getItem(PW_KEY) || '';
  const setPassword = (pw) => (pw ? localStorage.setItem(PW_KEY, pw) : localStorage.removeItem(PW_KEY));

  async function request(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const pw = getPassword();
    if (pw) headers['X-Admin-Password'] = pw;
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(localize(text)); } catch {}
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    return data;
  }

  // Upload the file straight to storage (with progress)
  async function upload(file, kind, filename, contentType, onProgress) {
    const signed = await request('/api/sign', {
      method: 'POST',
      body: { filename, contentType, kind },
    });
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signed.uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error('Upload failed (' + xhr.status + ')')));
      xhr.onerror = () => reject(new Error('Upload network error - sign out and sign in again, then retry'));
      xhr.send(file);
    });
    return signed; // { key, publicUrl }
  }

  window.Api = {
    getPassword,
    setPassword,
    check: () => request('/api/check', { method: 'POST' }),
    getTitles: () => request('/api/titles'),
    getTitle: (id) => request('/api/titles/' + id),
    createTitle: (data) => request('/api/titles', { method: 'POST', body: data }),
    updateTitle: (id, data) => request('/api/titles/' + id, { method: 'PATCH', body: data }),
    deleteTitle: (id) => request('/api/titles/' + id, { method: 'DELETE' }),
    getAllVideos: () => request('/api/videos'),
    addVideo: (data) => request('/api/videos', { method: 'POST', body: data }),
    renameVideo: (id, name) => request('/api/videos/' + id, { method: 'PATCH', body: { name } }),
    deleteVideo: (id) => request('/api/videos/' + id, { method: 'DELETE' }),
    upload,
  };
})();
