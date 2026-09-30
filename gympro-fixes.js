/* ===== GymCore: lógica pura (sin DOM), probada con node ===== */
(function (G) {
  const STOP = new Set(['de','del','en','con','a','la','el','los','las','y','para','al','un','una','por']);
  const clean = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = s => new Set(clean(s).split(' ').filter(t => t && !STOP.has(t)));
  const GRP = { Pecho: 1, Espalda: 1, Hombros: 1, Brazos: 1, Core: 1, Cardio: 1, Piernas: 1 };
  function grp(ex) {
    if (GRP[ex.category]) return ex.category;
    const n = ex.name;
    if (/cerrado|fondos/i.test(n)) return 'Brazos';
    if (/militar|hombro/i.test(n)) return 'Hombros';
    if (/remo|jal[oó]n|espalda/i.test(n)) return 'Espalda';
    if (/pecho|press (inclinado|plano|declinado)|floor/i.test(n)) return 'Pecho';
    return 'Piernas';
  }
  const ALIAS = [
    [/^cinta/, 'Cinta de Correr'], [/^prensa( de piernas| 45)?$/, 'Prensa 45°'], [/eliptica/, 'Bicicleta Elíptica'],
    [/^(extensiones? (de|en) )?cuadriceps$|^extensiones? (de|en) cuadriceps/, 'Extensión de Cuádriceps'],
    [/^curl femoral( sentado)?$/, 'Curl Femoral Sentado'], [/abductor|abduccion/, 'Abducción de Cadera Sentado'],
    [/^(elevacion de )?gemelos( sentado)?$/, 'Gemelos Sentado (Elevación de Talones)'],
    [/^jalon (al|de) pecho$/, 'Jalón al Pecho'], [/^remo sentado$/, 'Remo Sentado en Máquina'],
    [/^press de hombros?$/, 'Press de Hombro en Máquina'], [/^press de pecho$/, 'Press de Pecho en Máquina'],
    [/pec deck|^aperturas? pectorales?$/, 'Aperturas Pectorales en Máquina (Pec Deck)'],
    [/glute lift|^hip thrust$/, 'Glute Lift (Elevación de Glúteos / Hip Thrust en Máquina)'],
    [/^crunch(es)?$|^contraccion( de)? abdominal(es)?$/, 'Contracción Abdominal en Máquina (Crunch)'],
    [/extension de espalda|^lumbares$/, 'Extensión de Espalda (Banco Hiperextensiones / Máquina)'],
    [/^extensiones? de triceps$/, 'Extensión de Tríceps en Polea / Máquina'], [/^press de triceps$/, 'Press de Tríceps en Máquina'],
    [/^curl de biceps$/, 'Curl de Bíceps Independiente en Máquina']
  ];
  function resolve(raw, lib) {
    const c = clean(raw); if (!c) return null;
    let ex = lib.find(l => clean(l.name) === c);
    if (ex) return Object.assign({}, ex);
    for (const [re, nm] of ALIAS) if (re.test(c)) { ex = lib.find(l => l.name === nm); if (ex) return Object.assign({}, ex); }
    const t = toks(raw); let best = null, bs = 0;
    lib.forEach(l => {
      const u = toks(l.name); let i = 0; t.forEach(x => u.has(x) && i++);
      const s = i / ((t.size + u.size - i) || 1);
      if (s > bs || (s === bs && best && l.name.length < best.name.length)) { bs = s; best = l; }
    });
    if (best && bs >= 0.6 && t.size >= 2) return Object.assign({}, best);
    let category = 'Compuesto Heavy';
    if (/pierna|cuadriceps|femoral|gluteo|gemelo|prensa|sentadilla/.test(c)) category = 'Piernas';
    else if (/pecho|pectoral|apertura/.test(c)) category = 'Pecho';
    else if (/remo|jalon|espalda|pullover|dominada/.test(c)) category = 'Espalda';
    else if (/hombro|militar|lateral|pajaro/.test(c)) category = 'Hombros';
    else if (/biceps|triceps|pushdown|curl/.test(c)) category = 'Brazos';
    else if (/abdominal|crunch|core|plancha/.test(c)) category = 'Core';
    else if (/cinta|eliptica|bicicleta|ergometro|comba/.test(c)) category = 'Cardio';
    return { name: String(raw).trim(), category, settings: 'Importado desde PDF', recommendations: '', errors: '', unmatched: true };
  }

  const DAYS = /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|d[ií]a|sesi[oó]n|rutina|entrenamiento|workout|push|pull|legs|torso|pierna|full body|upper|lower)\b/i;
  const normLine = s => s.replace(/\$/g, '').replace(/\\times/g, 'x').replace(/[×✕✖]/g, 'x').replace(/[–—]/g, '-').replace(/(\d)\s*X\s*(\d)/g, '$1x$2').replace(/\s+/g, ' ').trim();
  const toSec = (n, u) => { n = parseFloat(String(n).replace(',', '.')); return /^m/i.test(u) ? Math.round(n * 60) : Math.round(n); };

  function parseLine(raw) {
    const s = normLine(raw || '');
    if (!s || /^\d+$/.test(s) || /p[aá]gina|^page\b|registro de progres|pautas y principios|principio de sobrecarga/i.test(s)) return null;
    if (/ejercicio/i.test(s) && /(series|reps|descanso)/i.test(s)) return null;
    const cells = s.split('|').map(x => x.trim()).filter(Boolean), flat = cells.join(' | ');
    let target = null, idx = -1, rest = '', m;
    if ((m = flat.match(/(\d+)\s*(?:x|series?\s*(?:de|x)?)\s*(\d+(?:\s*-\s*\d+)?)(\s*(?:seg|s|min)(?![a-z]))?/i))) {
      target = m[1] + 'x' + m[2].replace(/\s/g, '') + (m[3] ? m[3].trim() : ''); idx = m.index; rest = flat.replace(m[0], ' ');
    } else if (cells.length >= 3) {
      for (let k = 1; k < cells.length - 1; k++) if (/^\d+$/.test(cells[k]) && /^\d+(-\d+)?$/.test(cells[k + 1])) {
        target = cells[k] + 'x' + cells[k + 1]; idx = flat.indexOf(cells[k]);
        rest = cells.filter((_, j) => j !== k && j !== k + 1 && j !== 0).join(' | '); break;
      }
    }
    if (!target && (m = flat.match(/(\d+(?:-\d+)?)\s*(?:min|minutos)(?![a-z])/i))) { target = '1x' + m[1] + 'min'; idx = m.index; rest = ''; }
    if (!target) return { type: DAYS.test(s) && s.length <= 60 ? 'header' : 'text', s, cells };
    let name = flat.slice(0, idx).split('|')[0].trim();
    if (!name && cells.length > 1) name = cells[0];
    name = name.replace(/^[\s\-•·*▪►>]+/, '').replace(/^[A-Za-z]?\d{1,2}[.)]\s*/, '').replace(/[:\-\s]+$/, '').trim();
    if (name.length < 3) return null;
    let restTime; const r = rest.match(/(descanso\s*:?\s*)?(\d+(?:[.,]\d+)?)\s*(seg(?:undos)?|s|min(?:utos)?)(?![a-z])/i);
    if (r && !(/^s$/i.test(r[3]) && parseFloat(r[2]) < 15 && !r[1])) { restTime = toSec(r[2], r[3]) + ' seg'; rest = rest.replace(r[0], ' '); }
    const notes = rest.replace(/descanso\s*:?/ig, ' ').replace(/[|]+/g, ' ').replace(/\s+/g, ' ').trim();
    return { type: 'ex', name, target, restTime, notes };
  }

  function parseLines(lines, lib) {
    const days = [], unmatched = []; let cur = null, n = 0;
    const flush = () => { if (cur && (cur.isRest || cur.exercises.length)) days.push(cur); cur = null; };
    const open = (name, isRest) => { flush(); cur = { id: 'pdf' + (++n), isRest, name, exercises: [] }; };
    lines.forEach(l => {
      const p = parseLine(l); if (!p) return;
      if (p.type === 'header') return open(p.s.toUpperCase(), /descanso|rest\b|libre/i.test(p.s));
      if (p.type === 'text') {
        const w = p.s.split(' ').length;
        if (p.s === p.s.toUpperCase() && /[A-ZÁÉÍÓÚ]{3}/.test(p.s) && w <= 5 && !/\d/.test(p.s) && resolve(p.s, lib).unmatched) open(p.s, /descanso/i.test(p.s));
        return;
      }
      if (!cur) open('DÍA 1: RUTINA PDF', false);
      const ex = resolve(p.name, lib); if (ex.unmatched) unmatched.push(ex.name);
      ex.target = p.target; if (p.restTime) ex.restTime = p.restTime; if (p.notes) ex.recommendations = p.notes;
      cur.exercises.push(ex);
    });
    flush();
    return { days, unmatched };
  }

  const e1 = (w, r) => w * (1 + r / 30);
  function sessions(logs, name) {
    const by = {}, order = [];
    logs.filter(l => l.exercise === name).forEach(l => { (by[l.date] = by[l.date] || (order.push(l.date), [])).push({ w: +l.weight || 0, r: +l.reps || 0 }); });
    return order.map(d => by[d]);
  }
  function status(logs, name) {
    const S = sessions(logs, name).map(s => Math.max(...s.map(x => e1(x.w, x.r))));
    if (S.length < 2) return 'nodata';
    const last = S[S.length - 1];
    if (S.length >= 3 && last <= Math.max(...S.slice(-3, -1)) * 1.005) return 'stalled';
    return last > S[0] * 1.025 ? 'progress' : 'steady';
  }
  function advise(logs, name, target, cat) {
    if (cat === 'Cardio') return null;
    const S = sessions(logs, name);
    if (!S.length) return { kind: 'new', text: 'Sin historial: elige un peso con 2 repeticiones de reserva dentro del rango objetivo.' };
    const tm = String(target || '3x10').match(/x\s*(\d+)(?:-(\d+))?/);
    const lo = tm ? +tm[1] : 10, hi = tm && tm[2] ? +tm[2] : lo + 2;
    const last = S[S.length - 1], top = Math.max(...last.map(s => s.w));
    const minR = Math.min(...last.filter(s => s.w === top).map(s => s.r));
    const inc = Math.max(2.5, Math.round(top * 0.05 / 2.5) * 2.5), down = Math.round(top * 0.92 / 2.5) * 2.5;
    let text, kind;
    if (minR >= hi) { kind = 'up'; text = `Sube a ${top + inc} kg (+${inc}): completaste ${minR}+ reps en todas las series con ${top} kg.`; }
    else if (minR < lo) { kind = 'down'; text = `Baja a ~${down} kg: con ${top} kg no llegaste a ${lo} reps (hiciste ${minR}).`; }
    else { kind = 'reps'; text = `Mantén ${top} kg e intenta +1 rep por serie hasta llegar a ${hi}.`; }
    if (status(logs, name) === 'stalled' && kind !== 'up') { kind = 'stalled'; text += ' ⚠️ 3 sesiones sin mejora: haz un deload (-10%) una semana o cambia de variante.'; }
    return { kind, text };
  }
  G.GymCore = { clean, grp, resolve, parseLine, parseLines, status, advise };
})(typeof window !== 'undefined' ? window : globalThis);

/* GYM PRO – parche de correcciones. Pegar en un <script> justo antes de </body>,
   DESPUÉS del script principal (o cargar con <script src="gympro-fixes.js">). */
(function () {
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const blank = () => ({ routine: { startDate: new Date().toISOString(), days: [] }, logs: [], completedMap: {}, activeDayId: "" });

  /* ---------- 1. Datos por usuario ---------- */
  function stashState() {
    const u = appData.users[appData.stateOwner];
    if (u) u.state = { routine: appData.routine, logs: appData.logs, completedMap: appData.completedMap, activeDayId: appData.activeDayId };
  }
  function loadState(idx) {
    const u = appData.users[idx], s = (u && u.state) || blank();
    appData.stateOwner = idx;
    appData.routine = s.routine; appData.logs = s.logs;
    appData.completedMap = s.completedMap; appData.activeDayId = s.activeDayId;
    appData.selectedExerciseName = "";
  }
  function switchUser(idx) {
    if (idx !== appData.stateOwner) { stashState(); loadState(idx); }
    appData.activeUserIdx = idx;
  }

  window.saveToStorage = function () {
    try { stashState(); localStorage.setItem('gymPro_v222_clean_data', JSON.stringify(appData)); } catch (e) {}
  };

  window.cleanTextForMatching = function (str) {
    return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[$&\/\\#,+()~%.'":*?<>{}\[\]=]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const _load = window.loadFromStorage;
  window.loadFromStorage = function () {
    _load();
    if (appData.stateOwner === undefined) appData.stateOwner = appData.activeUserIdx; // migración
    // Fusiona ejercicios nuevos del código y elimina duplicados exactos
    const seen = new Set(), merged = [];
    [...appData.library, ...MASTER_222_LIBRARY].forEach(e => {
      const k = cleanTextForMatching(e.name);
      if (!seen.has(k)) { seen.add(k); merged.push(e); }
    });
    appData.library = merged;
  };

  window.onUserSelectChange = function () {
    const v = parseInt($('user-selector').value);
    if (v >= 0) { switchUser(v); saveToStorage(); renderUsersTab(); }
  };
  window.showNewUserForm = function () {
    stashState(); loadState(-1); appData.activeUserIdx = -1;
    $('q-name').value = ''; renderUsersTab(); $('q-name').focus();
    showToast("Introduce el nombre del nuevo atleta.");
  };
  window.deleteCurrentActiveUser = function () {
    const idx = appData.activeUserIdx, u = appData.users[idx];
    if (!u) return showToast('Selecciona un usuario para borrar.');
    if (!confirm(`¿Borrar a ${u.name} con su rutina e histórico?`)) return;
    appData.stateOwner = -1;
    appData.users.splice(idx, 1);
    const next = appData.users.length ? 0 : -1;
    loadState(next); appData.activeUserIdx = next;
    saveToStorage(); renderUsersTab();
  };
  window.saveUserFromQuiz = function () {
    const name = $('q-name').value.trim();
    if (!name) { showToast("⚠️ Introduce tu nombre o alias para continuar."); $('q-name').focus(); return; }
    const g = id => $(id).value;
    const quiz = { level: g('q-level'), goal: g('q-goal'), days: g('q-days'), includeRest: $('q-include-rest').checked,
      equipment: g('q-equipment'), time: g('q-time'), focus: g('q-focus'), split: g('q-split'),
      intensity: g('q-intensity'), environment: g('q-environment'), injury: g('q-injury') };
    const u = appData.users[appData.activeUserIdx];
    if (u && u.name === name) u.quiz = quiz;
    else {
      stashState();
      appData.users.push({ name, quiz });
      appData.activeUserIdx = appData.users.length - 1;
      loadState(appData.activeUserIdx);
    }
    saveToStorage();
    generateAIRoutine(quiz);
  };

  /* ---------- 2. Normalización: cardio, descansos, XSS ---------- */
  function normalizeRoutine() {
    (appData.routine.days || []).forEach(d => {
      d.name = String(d.name || '').replace(/[<>"]/g, '');
      (d.exercises || []).forEach(ex => {
        if (ex.name) ex.name = ex.name.replace(/[<>"]/g, '');
        let t = String(ex.target || '3x12').replace(/\s+/g, '').replace(/X/, 'x');
        if (!/x/.test(t)) t = '1x' + t;            // "20min" -> 1 serie de 20min
        ex.target = t;
        const m = String(ex.restTime || '').match(/^(\d+)\s*(min|minutos)/i);
        if (m) ex.restTime = (m[1] * 60) + ' seg';  // "2 min" -> 120 seg
      });
    });
  }
  const _rw = window.renderWorkoutTab;
  window.renderWorkoutTab = function () { normalizeRoutine(); _rw(); };

  /* ---------- 3. Toast sin solapes ---------- */
  let _tt;
  window.showToast = function (m) {
    const t = $('toast'); t.innerText = m; t.classList.remove('hidden');
    clearTimeout(_tt); _tt = setTimeout(() => t.classList.add('hidden'), 2500);
  };

  /* ---------- 4. Importar ejercicios a la biblioteca (sin basura) ---------- */
  window.importLibraryExercisesFromPDF = async function (ev) {
    const file = ev.target.files[0]; if (!file) return;
    if (typeof pdfjsLib === 'undefined') return showToast('⚠️ PDF.js no disponible. Revisa tu conexión.');
    try {
      showToast('📥 Leyendo PDF...');
      const pdf = await pdfjsLib.getDocument(new Uint8Array(await file.arrayBuffer())).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const c = await (await pdf.getPage(i)).getTextContent();
        text += c.items.map(x => x.str).join(' ') + '\n';
      }
      const found = []; let existing = 0;
      text.split(/\r?\n|;|\|/).forEach(l => {
        const n = l.replace(/\$|\\times/g, ' ').replace(/\d+\s*x\s*\d+(-\d+)?.*/i, '').replace(/\d+\s*min.*/i, '').trim();
        if (n.length < 4 || n.length > 60 || n.split(/\s+/).length > 8 || /\d/.test(n) ||
            /pagina|page|semana|registro|pautas|principio/i.test(n)) return;
        const ex = resolveExerciseFromLibrary(n);
        if (ex.settings !== 'Importado desde PDF') { existing++; return; }
        if (!found.some(f => cleanTextForMatching(f.name) === cleanTextForMatching(ex.name))) found.push(ex);
      });
      if (found.length && confirm(`Se añadirán ${found.length} ejercicios nuevos:\n\n` + found.map(f => '• ' + f.name).join('\n'))) {
        found.forEach(e => appData.library.push(e));
        saveToStorage(); renderLibrary();
        showToast(`✨ ${found.length} añadidos, ${existing} ya existían.`);
      } else showToast(found.length ? 'Importación cancelada.' : `Sin ejercicios nuevos (${existing} ya existían).`);
    } catch (e) { showToast('⚠️ Error al procesar el PDF.'); }
    ev.target.value = '';
  };

  /* ---------- 5. Sonido con Tone.js + TUT automático ---------- */
  function beep() {
    try {
      if (typeof Tone === 'undefined') return;
      const s = new Tone.Synth({ envelope: { release: 0.3 } }).toDestination(), t = Tone.now();
      s.triggerAttackRelease('A5', '8n', t);
      s.triggerAttackRelease('E6', '8n', t + 0.25);
      s.triggerAttackRelease('A6', '4n', t + 0.5);
      setTimeout(() => s.dispose(), 2500);
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  document.addEventListener('click', () => { try { Tone.start(); } catch (e) {} }, { once: true });

  window.startRestTimer = function (seconds = 90) {
    clearInterval(restTimerInterval);
    restTargetTime = Date.now() + seconds * 1000;
    $('rest-card').classList.remove('hidden');
    updateRestDisplay();
    restTimerInterval = setInterval(() => {
      const rem = Math.max(0, Math.ceil((restTargetTime - Date.now()) / 1000));
      updateRestDisplay(rem);
      if (rem <= 0) {
        clearInterval(restTimerInterval);
        $('rest-card').classList.add('hidden');
        beep(); showToast('¡Tiempo de descanso finalizado!');
      }
    }, 500);
  };
  ['weight-input', 'reps-input'].forEach(id => $(id).addEventListener('focus', () => startExecutionTimer()));

  /* ---------- 6. Generador de rutina que respeta el cuestionario ---------- */
  const grp = GymCore.grp;
  window.buildAIRoutineStructure = function (q) {
    const n = parseInt(q.days) || 4, goal = q.goal || '', eq = q.equipment || 'Cualquiera';
    const bad = {
      Rodilla: /sentadilla|zancada|step-up|hack|prensa 45|extensi[oó]n(es)? .*cu[aá]driceps/i,
      Lumbar: /peso muerto|good morning|buenos|hiperext|extensi[oó]n de espalda|remo t|pendlay/i,
      Hombro: /militar|press de hombro|arnold|trasnuca|remo al ment/i
    }[q.injury];
    const eqOk = e => eq === 'Máquinas Guiadas' ? /m[aá]quina|multipower|prensa/i.test(e.name)
      : eq === 'Poleas y Cables' ? /polea|cable|cuerda/i.test(e.name)
      : eq === 'Peso Libre' ? !/m[aá]quina|polea/i.test(e.name) : true;
    const lib = appData.library.filter(e => !(bad && bad.test(e.name)));
    const cnt = {};
    const pick = (g, used, i) => {
      let pool = lib.filter(e => grp(e) === g && eqOk(e) && !used.has(e.name));
      if (!pool.length) pool = lib.filter(e => grp(e) === g && !used.has(e.name));
      if (!pool.length) return null;
      const m = Math.min(...pool.map(e => cnt[e.name] || 0));
      const c = pool.filter(e => (cnt[e.name] || 0) === m);
      return c[(i * 7) % c.length];
    };

    const split = (!q.split || q.split === 'Auto') ? (n <= 3 ? 'FullBody' : n === 4 ? 'UpperLower' : 'PPL') : q.split;
    const TPL = {
      PPL: [['Pecho', 'Pecho', 'Hombros', 'Brazos', 'Core'], ['Espalda', 'Espalda', 'Espalda', 'Hombros', 'Brazos'], ['Piernas', 'Piernas', 'Piernas', 'Piernas', 'Core']],
      UpperLower: [['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Brazos'], ['Piernas', 'Piernas', 'Piernas', 'Piernas', 'Core']],
      FullBody: [['Piernas', 'Pecho', 'Espalda', 'Hombros', 'Core']],
      Weider: [['Pecho', 'Pecho', 'Pecho', 'Hombros', 'Core'], ['Espalda', 'Espalda', 'Espalda', 'Brazos', 'Core'], ['Piernas', 'Piernas', 'Piernas', 'Piernas', 'Core'], ['Hombros', 'Hombros', 'Hombros', 'Espalda', 'Core'], ['Brazos', 'Brazos', 'Brazos', 'Brazos', 'Core']]
    }[split];
    const LBL = { PPL: ['Push', 'Pull', 'Legs'], UpperLower: ['Torso', 'Pierna'], FullBody: ['Full Body'], Weider: ['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos'] }[split];

    const fuerza = /Fuerza/.test(goal), def = /Quemar|Resistencia/.test(goal);
    let sets = (fuerza ? 4 : 3) + (q.level === 'Avanzado' ? 1 : 0), reps = fuerza ? 5 : def ? 15 : 10;
    const rest = fuerza ? '150 seg' : def ? '45 seg' : '90 seg';
    if (q.intensity === 'Salud') { sets = Math.min(sets, 3); reps += 2; }
    const target = `${sets}x${reps}`;
    const size = { '30-45': 4, '45-60': 5, '60-90': 6 }[q.time] || 5;
    const P = { 'Compuesto Heavy': 1, Pecho: 2, Espalda: 2, Piernas: 2, Hombros: 3, Brazos: 4, Core: 5, Cardio: 6 };

    const days = [];
    for (let i = 0; i < n; i++) {
      const tpl = TPL[i % TPL.length];
      const list = tpl.slice(0, size);
      while (list.length < size) list.push(tpl[list.length % tpl.length]);
      if (q.focus && q.focus !== 'Ninguno' && list.filter(g => g === q.focus).length < 2) list.push(q.focus);
      if (def) list.push('Cardio');
      const used = new Set(), exs = [];
      list.forEach((g, e) => {
        const x = pick(g, used, i + e); if (!x) return;
        used.add(x.name); cnt[x.name] = (cnt[x.name] || 0) + 1;
        const c = g === 'Cardio';
        exs.push(Object.assign({}, x, c ? { target: '1x20min' } : { target, restTime: rest }));
      });
      exs.sort((a, b) => (P[a.category] || 3) - (P[b.category] || 3));
      days.push({ id: `dia${i + 1}`, isRest: false, name: `Día ${i + 1}: ${LBL[i % LBL.length]}`, exercises: exs });
      if (q.includeRest && i + 1 < n && (i + 1) % 2 === 0)
        days.push({ id: `descanso_${i + 1}`, isRest: true, name: `Día ${i + 1}.5: Descanso Activo`, exercises: [] });
    }
    appData.routine.days = days;
    appData.activeDayId = days[0].id;
    appData.completedMap = {};
    saveToStorage();
  };

  /* ---------- 7. PWA y accesibilidad ---------- */
  const vp = document.querySelector('meta[name=viewport]');
  if (vp) vp.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover'; // permite zoom
  const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.json'; document.head.appendChild(l);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

/* ===== Mejoras v2: PDF, editor con orden de días, ciclo de 3 meses, consejos ===== */
(function () {
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id), GC = GymCore, CYCLE = 90;
  const activeDay = () => (appData.routine.days || []).find(d => d.id === appData.activeDayId);

  /* --- Lector de PDF: líneas por posición, columnas separadas por " | " --- */
  async function readPdfLines(file) {
    const pdf = await pdfjsLib.getDocument(new Uint8Array(await file.arrayBuffer())).promise, out = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const items = (await (await pdf.getPage(p)).getTextContent()).items
        .filter(i => i.str && i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0 }))
        .sort((a, b) => b.y - a.y || a.x - b.x);
      let line = [], y = null;
      const flush = () => {
        line.sort((a, b) => a.x - b.x);
        out.push(line.reduce((t, it, k) => { if (!k) return it.s; const g = it.x - (line[k - 1].x + line[k - 1].w); return t + (g < 1 ? '' : g < 12 ? ' ' : ' | ') + it.s; }, ''));
        line = [];
      };
      items.forEach(it => { if (y !== null && Math.abs(it.y - y) > 4) flush(); if (!line.length) y = it.y; line.push(it); });
      if (line.length) flush();
    }
    return out;
  }
  window.resolveExerciseFromLibrary = raw => GC.resolve(raw, appData.library);

  window.importRoutineFromPDF = async function (ev) {
    const file = ev.target.files[0]; if (!file) return;
    if (typeof pdfjsLib === 'undefined') return showToast('⚠️ PDF.js no disponible. Revisa tu conexión.');
    try {
      showToast('📄 Analizando PDF...');
      const lines = await readPdfLines(file);
      if (lines.join('').length < 20) return showToast('⚠️ El PDF no tiene texto (¿escaneado?).');
      const { days, unmatched } = GC.parseLines(lines, appData.library);
      if (!days.length) return showToast('⚠️ No se encontraron ejercicios con series y repeticiones.');
      const total = days.reduce((t, d) => t + d.exercises.length, 0);
      const msg = `Detectados ${days.length} días y ${total} ejercicios.` + (unmatched.length ? `\nNo están en la biblioteca (se crean como nuevos): ${[...new Set(unmatched)].join(', ')}` : '');
      const has = (appData.routine.days || []).length;
      const replace = !has || confirm(msg + '\n\nAceptar = SUSTITUIR la rutina actual\nCancelar = AÑADIR al final');
      if (has && !replace && !confirm('¿Añadir estos días al final de la rutina?')) return;
      const stamp = Date.now();
      days.forEach((d, i) => d.id = `pdf${stamp}_${i}`);
      if (replace) { appData.routine.days = days; appData.completedMap = {}; appData.routine.startDate = new Date().toISOString(); }
      else appData.routine.days = appData.routine.days.concat(days);
      appData.activeDayId = appData.routine.days[0].id;
      saveToStorage(); switchTab('workout');
      showToast(`🎉 ${days.length} días importados` + (unmatched.length ? ` (${unmatched.length} nuevos)` : ''));
    } catch (e) { console.error(e); showToast('⚠️ Error al leer el PDF.'); }
    ev.target.value = '';
  };

  window.importLibraryExercisesFromPDF = async function (ev) {
    const file = ev.target.files[0]; if (!file) return;
    if (typeof pdfjsLib === 'undefined') return showToast('⚠️ PDF.js no disponible. Revisa tu conexión.');
    try {
      showToast('📥 Leyendo PDF...');
      const found = []; let existing = 0;
      (await readPdfLines(file)).forEach(l => {
        const p = GC.parseLine(l); if (!p) return;
        let name, extra = [];
        if (p.type === 'ex') name = p.name;
        else { extra = p.cells.slice(1); name = p.cells[0]; if (!name || name.length < 4 || name.length > 70 || /\d/.test(name) || name.split(' ').length > 9) return; }
        const ex = GC.resolve(name, appData.library);
        if (!ex.unmatched) { existing++; return; }
        if (extra.length) { ex.settings = extra[0]; ex.recommendations = extra[1] || ''; ex.errors = extra[2] || ''; }
        if (!found.some(f => GC.clean(f.name) === GC.clean(ex.name))) found.push(ex);
      });
      if (found.length && confirm(`Se añadirán ${found.length} ejercicios nuevos:\n\n` + found.map(f => '• ' + f.name).join('\n'))) {
        found.forEach(e => { delete e.unmatched; appData.library.push(e); });
        saveToStorage(); renderLibrary();
        showToast(`✨ ${found.length} añadidos, ${existing} ya existían.`);
      } else showToast(found.length ? 'Importación cancelada.' : `Sin ejercicios nuevos (${existing} ya existían).`);
    } catch (e) { console.error(e); showToast('⚠️ Error al procesar el PDF.'); }
    ev.target.value = '';
  };

  /* --- Editor: mover días y crear días por parte del cuerpo --- */
  window.moveDay = function (i, d) {
    const a = appData.routine.days, j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    saveToStorage(); renderRoutineEditor(); renderDaysNav();
  };
  window.addBodyPartDay = function () {
    const g = $('bp-select').value, used = new Set();
    appData.routine.days.forEach(d => d.exercises.forEach(e => used.add(e.name)));
    let pool = appData.library.filter(e => GC.grp(e) === g);
    const fresh = pool.filter(e => !used.has(e.name)); if (fresh.length >= 4) pool = fresh;
    const num = g === 'Cardio' ? 1 : g === 'Core' ? 3 : 5, exs = [];
    for (let k = 0; k < num && k < pool.length; k++) exs.push(Object.assign({}, pool[(k * 3 + appData.routine.days.length) % pool.length], { target: g === 'Cardio' ? '1x20min' : '3x12' }));
    const seen = new Set(), uniq = exs.filter(e => !seen.has(e.name) && seen.add(e.name));
    appData.routine.days.push({ id: 'bp' + Date.now(), isRest: false, name: `Día ${appData.routine.days.length + 1}: ${g}`, exercises: uniq });
    saveToStorage(); renderRoutineEditor(); renderDaysNav(); showToast(`Añadido día de ${g}. Reordénalo con ▲▼.`);
  };
  const _re = window.renderRoutineEditor;
  window.renderRoutineEditor = function () {
    _re();
    const c = $('routine-editor-container'), cards = [...c.children].filter(x => x.classList.contains('card'));
    cards.forEach((card, i) => {
      const row = card.firstElementChild; if (!row) return;
      const b = document.createElement('div');
      b.style.cssText = 'display:flex;gap:4px;margin-right:6px';
      b.innerHTML = `<button class="btn btn-outline btn-sm" ${i === 0 ? 'disabled style="opacity:.3"' : ''} onclick="moveDay(${i},-1)">▲</button><button class="btn btn-outline btn-sm" ${i === cards.length - 1 ? 'disabled style="opacity:.3"' : ''} onclick="moveDay(${i},1)">▼</button>`;
      row.insertBefore(b, row.firstChild);
      const inp = row.querySelector('input'); if (inp) inp.style.width = '50%';
    });
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;margin-bottom:12px';
    bar.innerHTML = `<select id="bp-select" style="margin:0;flex:2">${['Pecho','Espalda','Piernas','Hombros','Brazos','Core','Cardio'].map(g => `<option>${g}</option>`).join('')}</select><button class="btn btn-sm" style="flex:1" onclick="addBodyPartDay()">+ Día por grupo</button>`;
    c.insertBefore(bar, c.firstChild);
  };

  /* --- Ciclo de 3 meses y renovación con historial --- */
  const daysElapsed = () => Math.floor((Date.now() - new Date(appData.routine.startDate || Date.now())) / 864e5);
  const flip = t => { const m = String(t).match(/^(\d+)x(\d+)(?:-(\d+))?/); return m && +(m[3] || m[2]) >= 10 ? `${Math.min(5, +m[1] + 1)}x6-8` : '3x10-12'; };
  window.renewRoutine = function () {
    const days = appData.routine.days || [];
    if (!days.length) return showToast('No hay rutina que renovar.');
    const logs = appData.logs;
    if (logs.length < 10 && !confirm('Hay pocos registros (' + logs.length + '). La renovación será poco precisa. ¿Continuar?')) return;
    const used = new Set(); days.forEach(d => d.exercises.forEach(e => used.add(e.name)));
    const nd = JSON.parse(JSON.stringify(days)), changes = []; let prog = 0, nodata = 0;
    nd.forEach(d => { d.exercises = d.exercises.map(ex => {
      const st = GC.status(logs, ex.name);
      if (st === 'progress') prog++; if (st === 'nodata') nodata++;
      if (st !== 'stalled' || ex.category === 'Cardio') return ex;
      const g = GC.grp(ex);
      const pool = appData.library.filter(l => GC.grp(l) === g && !used.has(l.name));
      const same = pool.filter(l => l.category === ex.category), src = same.length ? same : pool;
      if (!src.length) return ex;
      const alt = src[changes.length * 3 % src.length]; used.add(alt.name);
      changes.push(`${ex.name} → ${alt.name}`);
      return Object.assign({}, alt, { target: flip(ex.target), restTime: ex.restTime });
    }); });
    const msg = `Progresan: ${prog} · Sin datos: ${nodata} · Estancados a cambiar: ${changes.length}\n\n` +
      (changes.length ? changes.join('\n') : 'Se mantienen todos los ejercicios.') + '\n\nSe guarda la rutina anterior y empieza un ciclo nuevo de 3 meses. ¿Aplicar?';
    if (!confirm(msg)) return;
    appData.routine.archive = (appData.routine.archive || []).concat({ date: new Date().toISOString(), days });
    appData.routine.days = nd; appData.routine.startDate = new Date().toISOString();
    appData.completedMap = {}; appData.activeDayId = nd[0].id;
    saveToStorage(); renderWorkoutTab(); showToast('🔄 Rutina renovada.');
  };
  const card = document.createElement('div');
  card.className = 'card'; card.id = 'cycle-card';
  card.innerHTML = `<div class="card-title"><span>🔄 Ciclo de 3 meses</span><span class="ex-badge" id="cycle-badge"></span></div><div id="cycle-info" style="font-size:.85rem;color:var(--text-sec)"></div><button class="btn btn-outline" onclick="renewRoutine()">Renovar rutina ahora (según historial)</button>`;
  $('days-container').parentNode.insertBefore(card, $('days-container'));
  let asked = false;
  function updateCycle() {
    const has = (appData.routine.days || []).length > 0, d = daysElapsed(), over = d >= CYCLE;
    card.classList.toggle('hidden', !has);
    $('cycle-badge').innerText = over ? '⚠️ Toca renovar' : `Día ${d}/${CYCLE}`;
    $('cycle-info').innerText = over ? 'Han pasado 3 meses: renueva para seguir progresando.' : `Quedan ${CYCLE - d} días. Puedes renovar antes si ya te estancas.`;
    $('periodization-tag').innerText = over ? 'Ciclo: renovar' : `Ciclo: ${d}/${CYCLE} d`;
    if (over && has && !asked && appData.logs.length) { asked = true; setTimeout(() => confirm('Han pasado 3 meses con esta rutina. ¿Renovarla ahora según tu historial?') && renewRoutine(), 300); }
  }
  const _b = window.buildAIRoutineStructure;
  window.buildAIRoutineStructure = function (q) { _b(q); appData.routine.startDate = new Date().toISOString(); saveToStorage(); };

  /* --- Consejos por ejercicio según historial --- */
  const adviceHTML = a => a ? `<div style="font-size:.78rem;margin-top:6px;padding:6px 8px;border-radius:6px;background:rgba(245,158,11,.12);color:var(--primary)">🧠 <strong>Consejo:</strong> ${a.text}</div>` : '';
  const _rw = window.renderWorkoutTab;
  window.renderWorkoutTab = function () {
    _rw(); updateCycle();
    const day = activeDay(); if (!day || day.isRest) return;
    const cards = [...$('daily-exercises-list').children];
    day.exercises.filter(e => e.name).forEach((ex, i) => {
      if (cards[i]) cards[i].insertAdjacentHTML('beforeend', adviceHTML(GC.advise(appData.logs, ex.name, ex.target, ex.category)));
    });
  };
  const _oe = window.onExerciseSelectChange;
  window.onExerciseSelectChange = function () {
    _oe();
    const day = activeDay(), box = $('exercise-info-box'), ex = day && day.exercises.find(e => e.name === $('exercise-select').value);
    if (ex && box && !box.classList.contains('hidden')) box.insertAdjacentHTML('beforeend', adviceHTML(GC.advise(appData.logs, ex.name, ex.target, ex.category)));
  };
})();

/* ===== Correcciones de la revisión final ===== */
(function () {
  if (typeof document === 'undefined') return;
  // IDs de día únicos (antes podían repetirse tras borrar/reordenar)
  window.addNewDayToRoutine = function (isRest = false) {
    const n = appData.routine.days.length + 1;
    appData.routine.days.push({
      id: 'd' + Date.now() + '_' + n, isRest,
      name: isRest ? `Día ${n}: Descanso` : `Día ${n}`,
      exercises: isRest ? [] : [{ name: '', target: '3x12', category: 'Compuesto Heavy' }]
    });
    saveToStorage(); renderRoutineEditor(); renderDaysNav();
  };
  // Si se borra el día activo, pasar al primero
  const _rm = window.removeDayFromRoutine;
  window.removeDayFromRoutine = function (i) {
    const d = appData.routine.days[i];
    if (d && !confirm(`¿Eliminar "${d.name}" y sus ejercicios?`)) return;
    _rm(i);
    const ds = appData.routine.days;
    if (!ds.some(x => x.id === appData.activeDayId)) appData.activeDayId = ds.length ? ds[0].id : '';
    saveToStorage(); renderDaysNav();
  };
})();
