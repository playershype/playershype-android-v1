(() => {
  'use strict';
  if (!window.HypeNative || window.__hpNativeInstalled) return;
  window.__hpNativeInstalled = true;
  const requests = new Map(), blobs = new Map();
  let nextId = 0;
  function request(action, args = {}) {
    return new Promise((resolve, reject) => {
      const id = String(++nextId);
      const timer = setTimeout(() => { requests.delete(id); reject(new Error('La operación tardó demasiado. Inténtalo otra vez.')); }, 300000);
      requests.set(id, { resolve, reject, timer });
      try { HypeNative.postMessage(JSON.stringify({ id, action, ...args })); }
      catch (err) { clearTimeout(timer); requests.delete(id); reject(err); }
    });
  }
  window.HypeAndroid = Object.freeze({ request });
  HypeNative.onmessage = event => {
    const m = JSON.parse(event.data), r = requests.get(m.id);
    if (!r) return;
    clearTimeout(r.timer); requests.delete(m.id);
    if (m.ok) r.resolve(m.value);
    else { const err = new Error(m.error || 'No se pudo completar la operación.'); if (m.cancelled) err.name = 'AbortError'; r.reject(err); }
  };
  const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = blob => { const url = create(blob); blobs.set(url, blob); return url; };
  URL.revokeObjectURL = url => { blobs.delete(url); revoke(url); };
  async function saveBlob(blob, name, extra = {}) {
    let transfer;
    try {
      transfer = await request('begin', { name: name || 'HypePredict-export', mime: blob.type || 'application/octet-stream', size: blob.size });
      for (let start = 0; start < blob.size; start += 196608) {
        const bytes = new Uint8Array(await blob.slice(start, start + 196608).arrayBuffer());
        let binary = '';
        for (let k = 0; k < bytes.length; k += 8192) binary += String.fromCharCode(...bytes.subarray(k, k + 8192));
        await request('chunk', { transfer, data: btoa(binary) });
      }
      await request('finish', { transfer, ...extra });
    } catch (err) {
      if (transfer) request('abort', { transfer }).catch(() => {});
      throw err;
    }
  }
  function report(err) { if (err.name !== 'AbortError') alert('No pude exportar el archivo: ' + err.message); }
  function handleAnchor(a) {
    const url = a.href;
    if (!a.hasAttribute('download') || (!url.startsWith('blob:') && !url.startsWith('data:'))) return false;
    const blob = blobs.get(url);
    (blob ? saveBlob(blob, a.download) : fetch(url).then(r => r.blob()).then(b => saveBlob(b, a.download))).catch(report);
    return true;
  }
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (!handleAnchor(this)) click.call(this); };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[download]');
    if (a && handleAnchor(a)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  window.showSaveFilePicker = async (options = {}) => {
    const name = options.suggestedName || 'HypePredict.html';
    const mime = Object.keys(options.types?.[0]?.accept || {})[0] || 'text/html';
    return { name, async createWritable() {
      let parts = [], closed = false;
      return {
        async write(data) { if (closed) throw new Error('Archivo cerrado'); parts.push(data); },
        async close() { if (closed) return; closed = true; await saveBlob(new Blob(parts, { type: mime }), name, { directSave: true }); parts = []; },
        async abort() { closed = true; parts = []; }
      };
    } };
  };
  const open = window.open.bind(window);
  window.open = (url, target, features) => {
    const blob = blobs.get(String(url));
    if (blob) { saveBlob(blob, 'HypePredict-Broadcast.html', { preview: true }).catch(report); return { closed: false, focus() {}, close() {} }; }
    if (/^https?:|^mailto:|^tel:/i.test(String(url))) { request('external', { url: String(url) }).catch(report); return { closed: false, focus() {} }; }
    return open(url, target, features);
  };
  window.__hpAndroidBack = () => {
    const visible = e => e && e.getAttribute('aria-hidden') !== 'true' && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    for (const selector of ['#hpResultDetailModal .hp-result-sheet-close', '#hpTailModal #hpTailClose', '#drawer[aria-hidden="false"] #drawerClose', '#loadModal #closeModal', '#manageCardsModal #closeManageCards', '#liveTrackModal #closeLiveTrack', '#trackAdminModal #closeTrackAdmin', '#trackHistoryModal #closeTrackHistory']) {
      const e = document.querySelector(selector);
      if (visible(e) && visible(e.closest('[aria-hidden]') || e)) { e.click(); return true; }
    }
    const menu = document.getElementById('toolsMenu');
    if (menu && menu.classList.contains('open')) { document.getElementById('menuToggle')?.click(); return true; }
    return false;
  };
})();
// Explicit user file selection is mediated natively; WebView content/file access stays disabled.
document.addEventListener('click', async event => {
  const input=event.target.closest?.('input[type=file]');
  if(!input||!window.HypeAndroid)return;
  event.preventDefault();event.stopImmediatePropagation();
  try {
    const selected=JSON.parse(await window.HypeAndroid.request('pick'));
    const transfer=new DataTransfer();
    for(const item of selected){const raw=atob(item.data);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));transfer.items.add(new File([bytes],item.name,{type:item.mime}));}
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  }catch(error){if(!String(error.message).includes('Cancelado'))alert('No se pudo importar el archivo.');}
},true);
