/* Gym Pro – botón de radio/música. Se carga después de gympro-fixes.js */
(function () {
  if (typeof document === 'undefined') return;
  const STATIONS = [
    ['🎧 LOS40', 'https://los40.com/'],
    ['🔥 Kiss FM', 'https://kissfm.es/'],
    ['🎸 Rock FM', 'https://www.rockfm.fm/'],
    ['🌍 Radio Garden (todo el mundo)', 'https://radio.garden/'],
    ['📻 TuneIn', 'https://tunein.com/']
  ];
  const KEY = 'gymPro_radio_url';
  const audio = new Audio(); audio.preload = 'none';
  const toast = m => (window.showToast ? showToast(m) : alert(m));
  const get = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const set = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const validUrl = u => /^https?:\/\/\S+$/i.test(u);

  const fab = document.createElement('button');
  fab.id = 'radio-fab'; fab.innerText = '🎵'; fab.setAttribute('aria-label', 'Radio');
  fab.style.cssText = 'position:fixed;right:14px;bottom:84px;width:48px;height:48px;border-radius:50%;border:none;font-size:1.4rem;background:var(--primary);color:#000;z-index:150;box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer';
  document.body.appendChild(fab);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay hidden'; modal.id = 'radio-modal';
  modal.innerHTML = `<div class="modal-content">
    <div class="card-title"><span>🎵 Música para entrenar</span><span id="radio-close" style="cursor:pointer">✖</span></div>
    <div id="radio-list"></div>
    <label style="font-size:.8rem;color:var(--text-sec)">Tu emisora (enlace de la web o de un stream directo):</label>
    <input type="url" id="radio-url" placeholder="https://...">
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline" id="radio-open" style="margin-top:0">↗ Abrir</button>
      <button class="btn btn-success" id="radio-play" style="margin-top:0">▶ Reproducir aquí</button>
    </div>
    <button class="btn btn-danger" id="radio-stop" style="display:none">⏹ Parar</button>
    <p style="font-size:.72rem;color:var(--text-sec);margin-top:10px;line-height:1.4">“Abrir” abre la emisora en otra pestaña. “Reproducir aquí” solo sirve con enlaces directos de audio (mp3/aac/stream) y mantiene la música dentro de la app.</p>
  </div>`;
  document.body.appendChild(modal);

  const list = modal.querySelector('#radio-list'), input = modal.querySelector('#radio-url'), stop = modal.querySelector('#radio-stop');
  STATIONS.forEach(([name, url]) => {
    const b = document.createElement('button');
    b.className = 'btn btn-outline'; b.style.marginTop = '0'; b.style.marginBottom = '8px'; b.innerText = name;
    b.onclick = () => window.open(url, '_blank', 'noopener');
    list.appendChild(b);
  });

  const close = () => modal.classList.add('hidden');
  fab.onclick = () => { input.value = get(); modal.classList.remove('hidden'); };
  modal.querySelector('#radio-close').onclick = close;
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  const current = () => {
    const u = input.value.trim();
    if (!validUrl(u)) { toast('⚠️ Escribe un enlace que empiece por http:// o https://'); return null; }
    set(u); return u;
  };
  modal.querySelector('#radio-open').onclick = () => { const u = current(); if (u) window.open(u, '_blank', 'noopener'); };
  modal.querySelector('#radio-play').onclick = () => {
    const u = current(); if (!u) return;
    audio.src = u;
    audio.play().then(() => { stop.style.display = 'flex'; fab.innerText = '⏸'; toast('▶ Reproduciendo'); })
      .catch(() => toast('⚠️ No se pudo reproducir. Usa "Abrir" o prueba otro enlace.'));
  };
  stop.onclick = () => { audio.pause(); audio.removeAttribute('src'); audio.load(); stop.style.display = 'none'; fab.innerText = '🎵'; };
  audio.addEventListener('error', () => { if (audio.src) { stop.onclick(); toast('⚠️ La emisora no responde.'); } });
})();
