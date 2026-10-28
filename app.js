(() => {
  'use strict';
  const { WORLDS, FREE, COMMON } = window.DRAW_DATA;
  const W = 1000, H = 700;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- אחסון ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* מצב פרטי */ } },
  };
  const PKEY = 'agam-draws-progress';
  const progress = store.get(PKEY, { done: {}, stars: 0 });
  const saveProgress = () => store.set(PKEY, progress);

  const gallery = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('agam-draws', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('drawings', { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    return {
      async add(item) {
        try {
          const db = await open();
          await new Promise((res, rej) => {
            const t = db.transaction('drawings', 'readwrite');
            t.objectStore('drawings').put(item);
            t.oncomplete = res; t.onerror = () => rej(t.error);
          });
        } catch (e) { console.warn('gallery save failed', e); }
      },
      async all() {
        try {
          const db = await open();
          return await new Promise((res, rej) => {
            const r = db.transaction('drawings').objectStore('drawings').getAll();
            r.onsuccess = () => res(r.result.sort((a, b) => b.id - a.id));
            r.onerror = () => rej(r.error);
          });
        } catch { return []; }
      },
    };
  })();

  // ---------- קול ----------
  const player = new Audio();
  let speakSeq = 0;
  function speak(id, text) {
    const seq = ++speakSeq;
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch { /* */ }
    return new Promise((resolve) => {
      let settled = false, fellBack = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      // אם אין קובץ קול, הדפדפן מקריא בעצמו
      const fallback = () => {
        if (fellBack || seq !== speakSeq) return done();
        fellBack = true;
        if ('speechSynthesis' in window && text) {
          const u = new SpeechSynthesisUtterance(text.replace(/[֑-ׇ]/g, ''));
          u.lang = 'he-IL'; u.rate = 0.95;
          u.onend = done; u.onerror = done;
          speechSynthesis.speak(u);
          setTimeout(done, 400 + text.length * 90);
        } else setTimeout(done, 1200);
      };
      player.onended = done;
      player.onerror = fallback;
      player.src = `audio/${id}.mp3`;
      const p = player.play();
      if (p) p.catch(fallback);
    });
  }
  function stopSpeech() {
    speakSeq++;
    player.onended = null; player.onerror = null;
    player.pause();
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch { /* */ }
  }

  let actx;
  function chime(notes = [660, 880]) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        const t = actx.currentTime + i * 0.11;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g).connect(actx.destination);
        o.start(t); o.stop(t + 0.4);
      });
    } catch { /* */ }
  }

  // ---------- מסכים ----------
  let screen = 'home';
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    screen = id;
    if (id === 'lesson') fitStage();
  }

  const allLessons = WORLDS.flatMap((w) => (w.lessons || []).map((l) => ({ ...l, world: w })));
  const isDone = (id) => (progress.done[id] || 0) > 0;
  function isUnlocked(lesson) {
    const i = allLessons.findIndex((l) => l.id === lesson.id);
    return i <= 0 || isDone(allLessons[i - 1].id);
  }

  function thumbSVG(lesson, color) {
    const paths = lesson.steps.flatMap((s) => s.paths).map(norm);
    return `<svg class="thumb" viewBox="0 0 1000 700">${paths.map((p) =>
      `<path d="${p.d}" fill="${p.dot ? color : 'none'}" stroke="${color}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
  }

  function renderHome() {
    $('#starCount').textContent = progress.stars;
    const next = allLessons.find((l) => !isDone(l.id));
    let html = `<button class="world free" id="freeCard" style="--wc:var(--pink)">
      <svg class="free-art" viewBox="0 0 90 70"><path d="M8 50 C20 10 40 60 52 24 S80 40 84 14" fill="none" stroke="#FF6FA8" stroke-width="7" stroke-linecap="round"/><circle cx="20" cy="58" r="6" fill="#FFC93C"/><circle cx="70" cy="56" r="7" fill="#3A86FF"/></svg>
      <div><h2>ציור חופשי</h2><p>מציירים מה שבא לך</p></div></button>`;
    for (const w of WORLDS) {
      html += `<section class="world" style="--wc:${w.color}"><div class="world-head"><h2>${w.title}</h2><span class="letters">${w.letters}</span>${w.soon ? '<span class="soon-tag">בקרוב</span>' : ''}</div><div class="lessons">`;
      if (w.lessons) {
        for (const l of w.lessons) {
          const unlocked = isUnlocked(l);
          const n = progress.done[l.id] || 0;
          const cls = !unlocked ? 'locked' : (next && next.id === l.id ? 'next' : (n ? 'done' : ''));
          html += `<button class="bubble ${cls}" data-lesson="${l.id}" ${unlocked ? '' : 'disabled'}>
            ${n ? `<span class="badge"><svg><use href="#i-star"/></svg>${n}</span>` : ''}
            ${unlocked ? thumbSVG(l, w.color) : '<svg class="lock"><use href="#i-lock"/></svg>'}
            <span class="name">${l.title}</span></button>`;
        }
      } else {
        for (const name of w.soon) {
          html += `<div class="bubble locked"><svg class="lock"><use href="#i-lock"/></svg><span class="name">${name}</span></div>`;
        }
      }
      html += '</div></section>';
    }
    $('#worlds').innerHTML = html;
  }

  $('#worlds').addEventListener('click', (e) => {
    if (e.target.closest('#freeCard')) return startLesson(FREE);
    const b = e.target.closest('[data-lesson]');
    if (b && !b.disabled) startLesson(allLessons.find((l) => l.id === b.dataset.lesson));
  });
  $('#homeMascot').innerHTML = mascotSVG();
  $('#homeMascot').addEventListener('click', () => speak('welcome', COMMON.welcome));

  // ---------- לוח הציור ----------
  const stage = $('#stage');
  const colorCv = $('#colorLayer'), lineCv = $('#lineLayer');
  const colorCtx = colorCv.getContext('2d'), lineCtx = lineCv.getContext('2d');
  for (const [cv, ctx] of [[colorCv, colorCtx], [lineCv, lineCtx]]) {
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }

  function fitStage() {
    const r = $('.stage-wrap').getBoundingClientRect();
    let w = r.width, h = (w * H) / W;
    if (h > r.height) { h = r.height; w = (h * W) / H; }
    stage.style.width = `${Math.floor(w)}px`;
    stage.style.height = `${Math.floor(h)}px`;
  }
  window.addEventListener('resize', () => { if (screen === 'lesson') fitStage(); });

  const COLORS = ['#2D2A32', '#E63946', '#FF8C42', '#FFC93C', '#6CC551', '#2EC4B6', '#3A86FF', '#9B5DE5', '#FF6FA8', '#8B5E3C'];
  const BRUSH = { thin: 9, thick: 36 };
  const tool = { brush: 'thin', color: COLORS[0] };
  $('#palette').innerHTML = COLORS.map((c) => `<button class="swatch" style="--c:${c}" data-color="${c}" aria-label="צבע"></button>`).join('');
  function setTool(brush, color) {
    if (brush) tool.brush = brush;
    if (color) tool.color = color;
    document.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('sel', s.dataset.color === tool.color));
    document.querySelectorAll('[data-brush]').forEach((b) => b.classList.toggle('sel', b.dataset.brush === tool.brush));
  }
  $('#palette').addEventListener('click', (e) => { const s = e.target.closest('.swatch'); if (s) { setTool(null, s.dataset.color); chime([880]); } });
  document.querySelectorAll('[data-brush]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.brush)));

  let strokes = [];
  let active = null, penSeen = false, inputEnabled = false, stepStrokeStart = 0;
  const widthOf = (s, p) => s.size * (0.6 + 0.8 * p);
  const ctxOf = (s) => (s.layer === 'color' ? colorCtx : lineCtx);

  function drawSeg(s, i) {
    const ctx = ctxOf(s), pts = s.pts, [x, y, p] = pts[i];
    ctx.strokeStyle = ctx.fillStyle = s.color;
    if (i === 0) { ctx.beginPath(); ctx.arc(x, y, widthOf(s, p) / 2, 0, Math.PI * 2); ctx.fill(); return; }
    const [x0, y0, p0] = pts[i - 1];
    const from = i > 1 ? [(pts[i - 2][0] + x0) / 2, (pts[i - 2][1] + y0) / 2] : [x0, y0];
    ctx.lineWidth = widthOf(s, (p0 + p) / 2);
    ctx.beginPath(); ctx.moveTo(from[0], from[1]);
    ctx.quadraticCurveTo(x0, y0, (x0 + x) / 2, (y0 + y) / 2);
    ctx.stroke();
  }
  function drawTail(s) {
    const pts = s.pts, n = pts.length;
    if (n < 2) return;
    const ctx = ctxOf(s), [x0, y0] = pts[n - 2], [x, y, p] = pts[n - 1];
    ctx.strokeStyle = s.color; ctx.lineWidth = widthOf(s, p);
    ctx.beginPath(); ctx.moveTo((x0 + x) / 2, (y0 + y) / 2); ctx.lineTo(x, y); ctx.stroke();
  }
  function redraw() {
    colorCtx.clearRect(0, 0, W, H); lineCtx.clearRect(0, 0, W, H);
    for (const s of strokes) { s.pts.forEach((_, i) => drawSeg(s, i)); drawTail(s); }
  }

  function toLocal(e) {
    const r = stage.getBoundingClientRect();
    const p = e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5;
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H, p];
  }
  stage.addEventListener('pointerdown', (e) => {
    if (!inputEnabled || active) return;
    if (e.pointerType === 'pen') penSeen = true;
    if (e.pointerType === 'touch' && penSeen) return; // כף היד נשענת על המסך
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch { /* */ }
    const thick = tool.brush === 'thick';
    active = { id: e.pointerId, s: { layer: thick ? 'color' : 'line', color: tool.color, size: BRUSH[tool.brush], pts: [toLocal(e)] } };
    strokes.push(active.s);
    drawSeg(active.s, 0);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!active || e.pointerId !== active.id) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const pt = toLocal(ev), last = active.s.pts[active.s.pts.length - 1];
      if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 1.5) continue;
      active.s.pts.push(pt);
      drawSeg(active.s, active.s.pts.length - 1);
    }
  });
  const endStroke = (e) => {
    if (!active || e.pointerId !== active.id) return;
    drawTail(active.s);
    active = null;
    updateDone();
  };
  stage.addEventListener('pointerup', endStroke);
  stage.addEventListener('pointercancel', endStroke);

  $('#btnUndo').addEventListener('click', () => {
    if (!inputEnabled || strokes.length <= 0) return;
    strokes.pop(); redraw(); updateDone();
  });

  // ---------- הדגמה ----------
  const guideNow = $('#guideNow'), pen = $('#pen');
  $('#penBody').innerHTML = window.MASCOT_BODY;
  const norm = (p) => (typeof p === 'string' ? { d: p, dot: false } : p);
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function animatePath(el, run) {
    const len = el.getTotalLength();
    const dur = Math.max(500, Math.min(2400, len * 2.6));
    el.style.strokeDasharray = `${len} ${len}`;
    el.style.strokeDashoffset = len;
    return new Promise((res) => {
      const t0 = performance.now();
      const frame = (t) => {
        if (run !== runId) return res();
        const k = Math.min(1, (t - t0) / dur), e = ease(k);
        el.style.strokeDashoffset = len * (1 - e);
        const pt = el.getPointAtLength(len * e);
        pen.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        if (k < 1) requestAnimationFrame(frame);
        else { if (el.classList.contains('g-dot')) el.style.fillOpacity = 1; res(); }
      };
      requestAnimationFrame(frame);
    });
  }

  async function demo(step, run) {
    guideNow.innerHTML = '';
    const els = step.paths.map(norm).map((p) => {
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('d', p.d);
      el.setAttribute('class', `g-demo${p.dot ? ' g-dot' : ''}`);
      el.style.opacity = 0;
      guideNow.appendChild(el);
      return el;
    });
    pen.style.display = '';
    for (const el of els) {
      el.style.opacity = 1;
      await animatePath(el, run);
      if (run !== runId) return;
      await wait(120);
    }
    pen.style.display = 'none';
    await wait(250);
    // הקו הסגול הופך לקו מנוקד שאגם עוברת עליו
    els.forEach((el) => {
      el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; el.style.fillOpacity = '';
      el.setAttribute('class', el.getAttribute('class').replace('g-demo', 'g-trace'));
    });
  }

  // ---------- זרימת שיעור ----------
  let runId = 0, L = null, stepIdx = 0, phase = '';
  const caption = (t) => { $('#caption').textContent = t.replace(/[֑-ׇ]/g, ''); };
  const talking = (on) => $('#talker').classList.toggle('talking', on);
  $('#talker').innerHTML = mascotSVG();

  async function say(id, text, run) {
    caption(text); talking(true);
    await speak(id, text);
    if (run === runId) talking(false);
  }

  function setInput(on) {
    inputEnabled = on;
    stage.classList.toggle('waiting', !on);
    if (on) stepStrokeStart = strokes.length;
    updateDone();
  }
  function updateDone() {
    const ok = inputEnabled && (phase === 'color' || strokes.length > stepStrokeStart);
    $('#btnDone').disabled = !ok;
  }
  function renderDots() {
    const n = L.free ? 0 : L.steps.length + 1;
    $('#stepDots').innerHTML = Array.from({ length: n }, (_, i) =>
      `<i class="${i < stepIdx ? 'on' : i === stepIdx && phase !== 'intro' ? 'now' : ''}"></i>`).join('');
  }

  async function startLesson(lesson) {
    const run = ++runId;
    L = lesson; stepIdx = 0; phase = 'intro';
    strokes = []; redraw(); guideNow.innerHTML = ''; pen.style.display = 'none';
    setTool('thin', COLORS[0]);
    $('#lessonTitle').textContent = lesson.title;
    show('lesson'); renderDots(); setInput(false);
    await say(`${lesson.id}_intro`, lesson.intro, run);
    if (run !== runId) return;
    if (lesson.free) { phase = 'color'; setInput(true); return; }
    goStep(0, run);
  }

  async function goStep(i, run) {
    stepIdx = i;
    const step = L.steps[i];
    if (!step) return goColor(run);
    phase = 'step'; renderDots(); setInput(false);
    const talk = say(`${L.id}_s${i + 1}`, step.say, run);
    await demo(step, run);
    if (run !== runId) return;
    setInput(true);
    await talk;
  }

  function goColor(run) {
    phase = 'color'; stepIdx = L.steps.length; renderDots();
    guideNow.innerHTML = '';
    setTool('thick', '#FFC93C');
    $('#palette').classList.remove('pulse'); void $('#palette').offsetWidth; $('#palette').classList.add('pulse');
    setInput(true);
    say(`${L.id}_color`, L.color, run);
  }

  $('#btnDone').addEventListener('click', async () => {
    if ($('#btnDone').disabled) return;
    const run = runId;
    setInput(false);
    chime();
    if (phase === 'step') {
      const n = 1 + Math.floor(Math.random() * 6);
      await say(`praise_${n}`, COMMON[`praise_${n}`], run);
      if (run === runId) goStep(stepIdx + 1, run);
    } else if (phase === 'color') {
      finishLesson(run);
    }
  });

  $('#btnReplay').addEventListener('click', () => {
    const run = runId;
    if (phase === 'step') {
      setInput(false);
      const step = L.steps[stepIdx];
      say(`${L.id}_s${stepIdx + 1}`, step.say, run);
      demo(step, run).then(() => { if (run === runId) setInput(true); });
    } else if (phase === 'color') {
      say(`${L.id}_${L.free ? 'intro' : 'color'}`, L.free ? L.intro : L.color, run);
    }
  });

  $('#btnHome').addEventListener('click', goHome);
  function goHome() {
    runId++; stopSpeech(); talking(false);
    $('#celebrate').hidden = true;
    renderHome(); show('home');
  }

  // ---------- סיום וחגיגה ----------
  function composite() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.drawImage(colorCv, 0, 0, W, H);
    x.drawImage(lineCv, 0, 0, W, H);
    return c.toDataURL('image/jpeg', 0.86);
  }

  async function finishLesson(run) {
    phase = 'done'; stepIdx = L.free ? 0 : L.steps.length + 1; renderDots();
    const img = composite();
    gallery.add({ id: Date.now(), lessonId: L.id, title: L.title, img });
    progress.done[L.id] = (progress.done[L.id] || 0) + 1;
    progress.stars += 1;
    saveProgress();

    const idx = allLessons.findIndex((l) => l.id === L.id);
    const next = idx >= 0 ? allLessons[idx + 1] : null;
    $('#celebrateImg').src = img;
    $('#celebrateStars').textContent = progress.stars;
    $('#btnNext').hidden = !next;
    $('#btnNext').onclick = () => { $('#celebrate').hidden = true; startLesson(next); };
    $('#celebrate').hidden = false;
    chime([523, 659, 784, 1046]);
    confetti();
    talking(false);
    await speak(`${L.id}_outro`, L.outro);
  }
  $('#btnAgain').addEventListener('click', () => { $('#celebrate').hidden = true; startLesson(L); });
  $('#btnCelebrateHome').addEventListener('click', goHome);
  $('#celebrateMascot').innerHTML = mascotSVG();

  function confetti() {
    const cv = $('#confetti'), ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const parts = Array.from({ length: 140 }, () => ({
      x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      r: 6 + Math.random() * 8, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
      c: COLORS[1 + Math.floor(Math.random() * (COLORS.length - 1))],
    }));
    const t0 = performance.now();
    const frame = (t) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      }
      if (t - t0 < 3500 && !$('#celebrate').hidden) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    };
    requestAnimationFrame(frame);
  }

  // ---------- גלריה ----------
  $('#btnGallery').addEventListener('click', async () => {
    const items = await gallery.all();
    const fmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' });
    $('#galleryGrid').innerHTML = items.length
      ? items.map((it) => `<button class="g-item" data-id="${it.id}"><img src="${it.img}" alt=""><span>${it.title}</span><small>${fmt.format(new Date(it.id))}</small></button>`).join('')
      : '<p class="empty">עוד אין פה ציורים. בואי נצייר את הראשון!</p>';
    show('gallery');
  });
  $('#galleryGrid').addEventListener('click', (e) => {
    const it = e.target.closest('.g-item');
    if (!it) return;
    $('#viewerImg').src = it.querySelector('img').src;
    $('#viewer').hidden = false;
  });
  $('#viewer').addEventListener('click', () => { $('#viewer').hidden = true; });
  $('#btnGalleryBack').addEventListener('click', goHome);

  document.addEventListener('contextmenu', (e) => e.preventDefault());
  setTool('thin', COLORS[0]);
  renderHome();
})();
