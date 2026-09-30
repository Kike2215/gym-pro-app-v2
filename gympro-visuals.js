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

  function svg(name, st) {
    const p = pick(name), a = pose(p[3], p[2]), b = pose(p[4], p[2]), cur = st === 'B' ? b : a;
    const pts = [...Object.values(a), ...Object.values(b)];
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    const w = Math.max(...xs) - Math.min(...xs) + 20, h = Math.max(...ys) - Math.min(...ys) + 20;
    const s = Math.min(140 / w, 130 / h, 1.8), cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const T = q => [((q[0] - cx) * s + 80).toFixed(1), ((q[1] - cy) * s + 75).toFixed(1)];
    const an = (at, v1, v2) => st ? '' : `<animate attributeName="${at}" values="${v1};${v1};${v2};${v2};${v1}" keyTimes="0;.1;.5;.6;1" dur="3s" repeatCount="indefinite"/>`;
    let out = `<svg viewBox="0 0 160 150" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:#0f172a;border-radius:8px;border:1px solid #475569"><g stroke-linecap="round" stroke-width="${(5.5 * s).toFixed(1)}" fill="none">`;
    SEG.forEach(([i, j, c]) => {
      if (!cur[i] || !cur[j]) return;
      const [x1, y1] = T(cur[i]), [x2, y2] = T(cur[j]), [a1, b1] = [T(a[i]), T(b[i])], [a2, b2] = [T(a[j]), T(b[j])];
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}">${an('x1', a1[0], b1[0])}${an('y1', a1[1], b1[1])}${an('x2', a2[0], b2[0])}${an('y2', a2[1], b2[1])}</line>`;
    });
    const hd = T(cur.HD), h1 = T(a.HD), h2 = T(b.HD), wr = T(cur.W), w1 = T(a.W), w2 = T(b.W);
    out += `</g><circle cx="${hd[0]}" cy="${hd[1]}" r="${(8 * s).toFixed(1)}" fill="#f8fafc">${an('cx', h1[0], h2[0])}${an('cy', h1[1], h2[1])}</circle>`;
    out += `<circle cx="${wr[0]}" cy="${wr[1]}" r="${(4 * s).toFixed(1)}" fill="#ef4444">${an('cx', w1[0], w2[0])}${an('cy', w1[1], w2[1])}</circle></svg>`;
    return out;
  }
  const html = (name, maxW = 220, st) => `<div class="gv" style="max-width:${maxW}px;margin:6px auto;text-align:center">${svg(name, st)}<div style="font-size:.72rem;color:var(--text-sec);margin-top:4px">${pick(name)[1]}</div></div>`;
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
