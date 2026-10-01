/* Gym Pro – dibujos animados por ejercicio (figura de palos, vista lateral). Cargar después de gympro-fixes.js */
(function () {
  if (typeof window === 'undefined') return;
  const clean = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const R = Math.PI / 180, LEN = { t: 40, h: 13, u: 25, f: 24, th: 34, sh: 34 };
  // Ángulos desde "abajo" en sentido horario (0 abajo, 90 delante, 180 arriba). Frame = [torso, brazo, antebrazo, muslo, pierna, elevación, muslo2, pierna2]
    const P = [
    [/pullover/, 'Brazos casi rectos: baja en arco sin doblar los codos', 'h', [180, 170, 170, 90, 0], [180, 30, 30, 90, 0]],
    [/dips|fondos/, 'Baja flexionando codos y empuja hasta extender', 'h', [180, 0, 0, 90, 0, 0], [180, -45, 35, 90, 0, -20]],
    [/remo al menton/, 'Sube la barra pegada al cuerpo liderando con los codos', 'h', [180, 0, 0, 0, 0], [180, 110, 25, 0, 0]],
    [/cruce|apertura|pec deck|pajaro|mariposa|face pull/, 'Abre y cierra los brazos con codos ligeramente flexionados', 'h', [180, -70, -70, 90, 0], [180, 85, 85, 90, 0]],
    [/militar|press de hombro|press arnold|press.*hombro|trasnuca/, 'Empuja hacia arriba sin bloquear los codos', 'h', [180, 20, 175, 90, 0], [180, 175, 178, 90, 0]],
    [/jalon|dominada|pulldown|skierg/, 'Tira hacia el pecho llevando los codos abajo y atrás', 'h', [192, 170, 175, 90, 0], [192, -10, 165, 90, 0]],
    [/remo|row/, 'Tira llevando los codos atrás y junta los omóplatos', 'h', [180, 85, 88, 90, 0], [180, -70, 80, 90, 0]],
    [/curl femoral.*(tumbad|declinad|acostad)|curl femoral declinado/, 'Flexiona las rodillas llevando los talones a los glúteos', 'h', [270, 0, 0, 90, 90], [270, 0, 0, 90, 175]],
    [/curl femoral.*de pie|unilateral de pie/, 'Lleva el talón hacia el glúteo sin mover el muslo', 'a', [180, 0, 0, 0, 0], [180, 0, 0, 0, -100]],
    [/curl femoral/, 'Flexiona las rodillas llevando los talones abajo y atrás', 'h', [190, 0, 0, 90, 90], [190, 0, 0, 90, 5]],
    [/curl|biceps/, 'Flexiona el codo sin mover el brazo; baja controlado', 'h', [180, 0, 0, 0, 0], [180, 12, 155, 0, 0]],
    [/(over ?head|sobre la cabeza|katana|trasnuca)/, 'Extiende los codos sobre la cabeza sin abrirlos', 'h', [180, 175, -100, 0, 0], [180, 175, 178, 0, 0]],
    [/pushdown|triceps|frances|patada de triceps|press cerrado/, 'Extiende los codos pegados al cuerpo; solo se mueve el antebrazo', 'h', [180, 8, 100, 0, 0], [180, 5, 3, 0, 0]],
    [/elevacion.*(lateral|frontal)|y-raise|\blateral/, 'Sube los brazos hasta la altura de los hombros (vista lateral aproximada)', 'h', [180, 0, 0, 0, 0], [180, 90, 90, 0, 0]],
    [/extension.*cuadriceps|cuadriceps|sissy/, 'Extiende las rodillas y aprieta arriba', 'h', [185, 0, 0, 90, 0], [185, 0, 0, 90, 90]],
    [/prensa|reverse hack|belt/, 'Empuja la plataforma sin bloquear las rodillas', 'h', [215, 0, 0, 135, 60], [215, 0, 0, 113, 113]],
    [/sentadilla|hack|zancada|step|bulgara|pendular/, 'Baja con la espalda firme y empuja con toda la planta del pie', 'a', [180, 20, 20, 0, 0], [148, 80, 85, 88, -25]],
    [/peso muerto|rumano|good morning|buenos|hiperext|extension de espalda|pull through/, 'Lleva la cadera atrás con la espalda neutra y vuelve apretando glúteos', 'a', [180, 0, 0, 0, 0], [112, 0, 0, 12, -12]],
    [/hip thrust|glute lift|puente|frog/, 'Empuja con los talones y aprieta glúteos arriba', 'a', [262, 0, 0, 135, 8], [245, 0, 0, 95, 4]],
    [/patada de gluteo|kickback|patada.*gluteo/, 'Lleva el talón atrás apretando el glúteo sin arquear la espalda', 'a', [150, 80, 80, 0, 0], [150, 80, 80, -38, -38]],
    [/gemelo|soleo|talones|puntas/, 'Sube de puntillas al máximo y baja estirando', 'a', [180, 0, 0, 0, 0, 0], [180, 0, 0, 0, 0, 10]],
    [/elevacion de piernas|colgado|torre/, 'Sube las piernas sin balancear el cuerpo', 'h', [180, 180, 180, 0, 0], [180, 180, 180, 90, 90]],
    [/crunch|contraccion abdominal/, 'Enrolla el abdomen hacia el ombligo', 'h', [185, 25, 120, 90, 0], [150, 25, 120, 90, 0]],
    [/woodchopper|lenador/, 'Baja en diagonal rotando el torso, no solo los brazos', 'h', [180, 170, 170, 0, 0], [152, 40, 40, 0, 0]],
    [/pallof|rotacion|flexion lateral|\bsaco\b|\bpao\b/, 'Extiende los brazos sin dejar que el cable gire el torso', 'h', [180, 40, 110, 0, 0], [175, 88, 88, 0, 0]],
    [/bicicleta|spinning/, 'Pedalea con cadencia constante y abdomen activo', 'h', [150, 75, 100, 80, 10, 0, 30, -20], [150, 75, 100, 30, -20, 0, 80, 10]],
    [/comba/, 'Saltos cortos sobre la punta del pie', 'a', [180, 35, 80, 0, 0, 0], [180, 35, 80, 0, 0, 8]],
    [/cinta|correr|eliptica|escalador|escalera|sled/, 'Zancada fluida, postura erguida', 'h', [170, -35, 50, 50, -20, 0, -30, -110], [170, 40, 110, -30, -110, 0, 50, -20]],
    [/press|flexion/, 'Empuja hacia delante y vuelve con control', 'h', [180, -80, 85, 90, 0], [180, 85, 88, 90, 0]]
  ];
  const DEFAULT = ['Sigue la técnica descrita en las pautas', 'h', [180, 5, 5, 0, 0], [180, 5, 5, 0, 0]];
  const pick = name => { const n = clean(name); return P.find(p => p[0].test(n)) || [null, ...DEFAULT]; };

  const add = (p, a, l) => [p[0] + Math.sin(a * R) * l, p[1] + Math.cos(a * R) * l];
  function pose(f, m) {
    const [T, sa, fa, ha, sk, dy = 0, ha2, sk2] = f;
    let H = [0, 0];
    if (m === 'a') H = add(add([0, 0], sk + 180, LEN.sh), ha + 180, LEN.th);
    H = [H[0], H[1] - dy];
    const S = add(H, T, LEN.t), E = add(S, sa, LEN.u), K = add(H, ha, LEN.th);
    const o = { H, S, HD: add(S, T, LEN.h), E, W: add(E, fa, LEN.f), K, A: add(K, sk, LEN.sh) };
    if (ha2 != null) { o.K2 = add(H, ha2, LEN.th); o.A2 = add(o.K2, sk2, LEN.sh); }
    return o;
  }
  const SEG = [['H', 'K2', '#64748b'], ['K2', 'A2', '#64748b'], ['H', 'K', '#94a3b8'], ['K', 'A', '#94a3b8'], ['H', 'S', '#cbd5e1'], ['S', 'E', '#f59e0b'], ['E', 'W', '#f59e0b']];

  /* ---- Equipo y agarre ---- */
  const PUL = [[/pullover|jalon|pushdown|triceps|crunch|woodchopper|lenador|flexion lateral|rotacion|skierg/, 'hi'], [/curl|elevacion|patada|pull through|remo al menton|kickback|bayesian/, 'lo'], [/./, 'mid']];
  const NOEQ = /bicicleta|spinning|cinta|correr|eliptica|comba|escal|sled|saco|\bpao\b/;
  function detect(name) {
    const n = clean(name); if (NOEQ.test(n)) return { kind: '', g: null, n };
    const kind = /polea|cable|cuerda|pushdown|face pull|pallof|woodchopper|lenador|gironda|jalon|pull through/.test(n) ? 'cable'
        : /multipower|smith/.test(n) ? 'smith' : /mancuerna|barra libre|\bbarra\b/.test(n) ? 'free'
      : /maquina|prensa|hack|pec deck|convergente|belt|pendular|asistida|hiperext|torre|extension.*cuadriceps|curl femoral|mariposa/.test(n) ? 'machine' : '';
    let g = null;
    if (/cuerda/.test(n)) g = { t: 'rope', l: 'Cuerda · agarre neutro' };
    else if (/barra v|\bv\b/.test(n)) g = { t: 'v', l: 'Barra V · neutro' };
    else if (/neutro|martillo|hammer|convergente|paralelo/.test(n)) g = { t: 'neutral', l: 'Asas · agarre neutro' };
    else if (/unilateral|individual|concentrado|bayesian|katana|kickback/.test(n)) g = { t: 'single', l: 'Asa individual (una mano)' };
    else if (/mancuerna/.test(n)) g = { t: 'db', l: 'Mancuernas' };
    else if (kind !== 'machine' && (kind === 'cable' || kind === 'free' || kind === 'smith' || /jalon|remo|curl|press|triceps|dominada/.test(n))) {
      const sup = /supin/.test(n) || (/curl|biceps/.test(n) && !/invertid|inverso|prono/.test(n));
      const w = /ancho/.test(n) ? 15 : /estrecho|cerrado/.test(n) ? 4 : 10;
      const z = /barra z|z-bar/.test(n);
      g = { t: 'bar', w, o: sup ? 'sup' : 'pro', l: `${z ? 'Barra Z' : 'Barra'} · ${w === 15 ? 'ancho' : w === 4 ? 'estrecho' : 'medio'} · ${sup ? 'palmas arriba' : 'palmas abajo'}` };
    } else if (kind === 'machine') g = { t: 'neutral', l: 'Empuñaduras de la máquina' };
    return { kind, g, n };
  }
  const KIND = { cable: 'Polea', machine: 'Máquina', smith: 'Multipower', free: 'Peso libre', '': '' };
  function grip(g) {
    if (!g) return '';
    const c = 190, hand = (x, y) => `<rect x="${x - 3.5}" y="${y}" width="7" height="11" rx="2.5" fill="#f59e0b"/>`;
    let o = '<text x="188" y="14" font-size="7.5" fill="#94a3b8" text-anchor="middle" font-weight="700">AGARRE</text>';
    if (g.t === 'bar') o += `<line x1="${c - 24}" y1="40" x2="${c + 24}" y2="40" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>` + hand(c - g.w, 34) + hand(c + g.w, 34) + `<text x="${c}" y="58" font-size="9" fill="#f59e0b" text-anchor="middle">${g.o === 'sup' ? '▲' : '▼'}</text>`;
    else if (g.t === 'neutral' || g.t === 'v' || g.t === 'rope') {
      const d = g.t === 'v' ? 3 : 0;
      [-9, 9].forEach(k => { o += `<line x1="${c + k - (k < 0 ? -d : d)}" y1="${g.t === 'rope' ? 28 : 30}" x2="${c + k + (k < 0 ? -d : d) * 0}" y2="50" stroke="#94a3b8" stroke-width="${g.t === 'rope' ? 2 : 3}" stroke-linecap="round" ${g.t === 'rope' ? 'stroke-dasharray="3 1.5"' : ''}/>` + hand(c + k, 34); });
      if (g.t === 'rope') o += `<path d="M${c - 9} 28 Q${c} 20 ${c + 9} 28" stroke="#94a3b8" fill="none" stroke-width="1.5"/>`;
      o += `<text x="${c}" y="62" font-size="8" fill="#f59e0b" text-anchor="middle">◀ ▶</text>`;
    } else if (g.t === 'single') o += `<circle cx="${c}" cy="42" r="4" fill="#94a3b8"/>` + hand(c, 34) + '<line x1="190" y1="46" x2="190" y2="54" stroke="#94a3b8" stroke-width="1.5"/>';
    else if (g.t === 'db') [-12, 12].forEach(k => { o += `<line x1="${c + k - 5}" y1="42" x2="${c + k + 5}" y2="42" stroke="#94a3b8" stroke-width="3"/><circle cx="${c + k - 5}" cy="42" r="4" fill="#64748b"/><circle cx="${c + k + 5}" cy="42" r="4" fill="#64748b"/>` + hand(c + k, 34); });
    const words = g.l.split(' '), lines = []; let cur = '';
    words.forEach(w => { if ((cur + ' ' + w).trim().length > 15) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); lines.push(cur);
    lines.forEach((t, i) => o += `<text x="188" y="${76 + i * 9}" font-size="7" fill="#cbd5e1" text-anchor="middle">${t}</text>`);
    return o;
  }

  function svg(name, st) {
    const p = pick(name), a = pose(p[3], p[2]), b = pose(p[4], p[2]), cur = st === 'B' ? b : a, dt = detect(name);
    const n = dt.n, pul = (PUL.find(x => x[0].test(n)) || PUL[2])[1];
    const all = [...Object.values(a), ...Object.values(b)];
    const minY = Math.min(...all.map(q => q[1])), maxY = Math.max(...all.map(q => q[1])), gY = Math.max(a.A[1], b.A[1]);
    const active = Math.hypot(a.W[0] - b.W[0], a.W[1] - b.W[1]) > 8 && p[0] && !NOEQ.test(n);
    const seated = p[2] === 'h' && p[3][3] >= 90 && !!dt.kind || (p[2] === 'h' && p[3][3] >= 90 && /dips|fondos|extension.*cuadriceps|curl femoral/.test(n));
    // puntos del equipo (modelo)
    let P = null;
    if (dt.kind === 'cable' || (dt.kind === 'machine' && active && pul !== 'mid')) P = pul === 'hi' ? [a.W[0] + 4, minY - 22] : pul === 'lo' ? [a.W[0] + 42, gY] : [a.W[0] + 55, a.W[1]];
    else if (dt.kind === 'machine' && active) P = [a.S[0] - 26, a.S[1] + 8];
    const extra = P ? [P] : [];
    const bk = (() => { const d = [Math.sin(p[3][0] * R), Math.cos(p[3][0] * R)], nn = [d[1], -d[0]]; return [[a.H[0] + nn[0] * 9, a.H[1] + nn[1] * 9], [a.H[0] + nn[0] * 9 + d[0] * 58, a.H[1] + nn[1] * 9 + d[1] * 58]]; })();
    if (seated) extra.push(...bk, [a.H[0] + 26, a.H[1] + 9], [a.H[0] - 12, a.H[1] + 9]);
    const pts = [...all, ...extra], xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    const w = Math.max(...xs) - Math.min(...xs) + 20, h = Math.max(...ys) - Math.min(...ys) + 20;
    const s = Math.min(135 / w, 130 / h, 1.8), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const T = q => [((q[0] - cx) * s + 78).toFixed(1), ((q[1] - cy) * s + 75).toFixed(1)];
    const an = (at, v1, v2) => st ? '' : `<animate attributeName="${at}" values="${v1};${v1};${v2};${v2};${v1}" keyTimes="0;.1;.5;.6;1" dur="3s" repeatCount="indefinite"/>`;
    const line = (A, B, c, wd, extraAttr = '') => { const [x1, y1] = T(A), [x2, y2] = T(B); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${wd}" stroke-linecap="round" ${extraAttr}/>`; };
    let out = `<svg viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:#0f172a;border-radius:8px;border:1px solid #475569">`;
    if (/a/.test(p[2]) || dt.kind) out += line([-200 + a.A[0], gY + 2], [200 + a.A[0], gY + 2], '#334155', 1.5);
    if (seated) { out += line(bk[0], bk[1], '#475569', 6 * s) + line([a.H[0] - 12, a.H[1] + 9], [a.H[0] + 26, a.H[1] + 9], '#475569', 5 * s); }
    if (dt.kind === 'smith') { const rx = (a.W[0] + b.W[0]) / 2; out += line([rx, minY - 14], [rx, gY + 2], '#64748b', 2.5 * s); }
    if (P && active) {
      const pp = T(P), wa = T(a.W), wb = T(b.W), wc = T(cur.W);
      if (dt.kind === 'cable') out += `<circle cx="${pp[0]}" cy="${pp[1]}" r="${(5 * s).toFixed(1)}" fill="#334155" stroke="#94a3b8" stroke-width="1.5"/><line x1="${wc[0]}" y1="${wc[1]}" x2="${pp[0]}" y2="${pp[1]}" stroke="#e2e8f0" stroke-width="1.3" stroke-dasharray="3 2">${an('x1', wa[0], wb[0])}${an('y1', wa[1], wb[1])}</line>`;
      else out += `<circle cx="${pp[0]}" cy="${pp[1]}" r="${(4 * s).toFixed(1)}" fill="#64748b"/><line x1="${wc[0]}" y1="${wc[1]}" x2="${pp[0]}" y2="${pp[1]}" stroke="#64748b" stroke-width="${(4 * s).toFixed(1)}" stroke-linecap="round">${an('x1', wa[0], wb[0])}${an('y1', wa[1], wb[1])}</line>`;
    }
    out += `<g stroke-linecap="round" stroke-width="${(5.5 * s).toFixed(1)}" fill="none">`;
    SEG.forEach(([i, j, c]) => {
      if (!cur[i] || !cur[j]) return;
      const [x1, y1] = T(cur[i]), [x2, y2] = T(cur[j]), [a1, b1] = [T(a[i]), T(b[i])], [a2, b2] = [T(a[j]), T(b[j])];
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}">${an('x1', a1[0], b1[0])}${an('y1', a1[1], b1[1])}${an('x2', a2[0], b2[0])}${an('y2', a2[1], b2[1])}</line>`;
    });
    const hd = T(cur.HD), h1 = T(a.HD), h2 = T(b.HD), wr = T(cur.W), w1 = T(a.W), w2 = T(b.W);
    out += `</g><circle cx="${hd[0]}" cy="${hd[1]}" r="${(8 * s).toFixed(1)}" fill="#f8fafc">${an('cx', h1[0], h2[0])}${an('cy', h1[1], h2[1])}</circle>`;
    if (dt.kind === 'free' || dt.kind === 'smith') out += `<circle cx="${wr[0]}" cy="${wr[1]}" r="${(7 * s).toFixed(1)}" fill="none" stroke="#94a3b8" stroke-width="${(2.5 * s).toFixed(1)}">${an('cx', w1[0], w2[0])}${an('cy', w1[1], w2[1])}</circle>`;
    out += `<circle cx="${wr[0]}" cy="${wr[1]}" r="${(4 * s).toFixed(1)}" fill="#ef4444">${an('cx', w1[0], w2[0])}${an('cy', w1[1], w2[1])}</circle>`;
    if (active) out += grip(dt.g);
    return out + '</svg>';
  }
  const info = name => { const d = detect(name), t = [KIND[d.kind]].filter(Boolean); if (d.g) t.push(d.g.l); return t.join(' · '); };
  const html = (name, maxW = 220, st) => `<div class="gv" style="max-width:${maxW}px;margin:6px auto;text-align:center">${svg(name, st)}<div style="font-size:.74rem;color:var(--text-main);margin-top:4px">${pick(name)[1]}</div>${info(name) ? `<div style="font-size:.7rem;color:var(--primary);margin-top:2px">🏋️ ${info(name)}</div>` : ''}</div>`;
  window.GymVisual = { svg, html, pick };
  if (typeof document === 'undefined' || !document.getElementById('daily-exercises-list')) return;

  const strip = t => t.replace(/^✅\s*/, '').trim();
  const _rw = window.renderWorkoutTab;
  window.renderWorkoutTab = function () {
    _rw();
    document.querySelectorAll('#daily-exercises-list .ex-item').forEach(c => {
      const t = c.querySelector('.ex-title'), h = c.querySelector('.ex-header');
      if (t && h) h.insertAdjacentHTML('afterend', html(strip(t.innerText), 120));
    });
  };
  const _oe = window.onExerciseSelectChange;
  window.onExerciseSelectChange = function () {
    _oe();
    const box = document.getElementById('exercise-info-box'), n = document.getElementById('exercise-select').value;
    if (box && n && !box.classList.contains('hidden')) box.insertAdjacentHTML('afterbegin', html(n, 160));
  };
  const _rl = window.renderLibrary;
  window.renderLibrary = function () {
    _rl();
    document.querySelectorAll('#library-container .card').forEach(c => {
      const t = c.querySelector('.card-title span'), d = c.querySelector('.card-title');
      if (t && d) d.insertAdjacentHTML('afterend', html(t.innerText, 130));
    });
  };
})();
