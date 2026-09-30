/* GYM PRO – parche de correcciones. Pegar en un <script> justo antes de </body>,
   DESPUÉS del script principal (o cargar con <script src="gympro-fixes.js">). */
(function () {
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
