'use strict';

/* ---------- Nivåer och frågor (rena funktioner, testas med node) ---------- */
const ROUND_LEN = 10;

const LEVELS = [
  { id: 'p5', op: '+', max: 5, icon: '🐣', title: 'Plus', sub: 'upp till 5', pics: true, c: 'c1' },
  { id: 'm5', op: '-', max: 5, icon: '🐥', title: 'Minus', sub: 'upp till 5', pics: true, c: 'c2' },
  { id: 'p10', op: '+', max: 10, icon: '🐰', title: 'Plus', sub: 'upp till 10', c: 'c3' },
  { id: 'm10', op: '-', max: 10, icon: '🦊', title: 'Minus', sub: 'upp till 10', c: 'c4' },
  { id: 'k10', op: 'k', max: 10, icon: '🤝', title: 'Tiokompisar', sub: '7 + ? = 10', pics: true, c: 'c5' },
  { id: 'x10', op: 'x', max: 10, icon: '🎲', title: 'Blandat', sub: '+ och − till 10', c: 'c6' },
  { id: 'p20', op: '+', max: 20, icon: '🦁', title: 'Plus', sub: 'upp till 20', c: 'c1' },
  { id: 'm20', op: '-', max: 20, icon: '🐘', title: 'Minus', sub: 'upp till 20', c: 'c2' },
];

const STICKERS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🦄', '🐝', '🦋', '🐞', '🐢', '🐙', '🐬',
  '🐳', '🦒', '🐘', '🦔', '🌈', '🌻', '🍓', '🍦', '🧁', '🎈', '⭐', '👑',
  '🦖', '🚀', '🎠', '💎'];

const THEMES = ['🍎', '🍓', '🐞', '⭐', '🌸', '🐟', '🍪', '🎈', '🐥', '🍒'];

// En fråga: a op b = ans. hide = vilken ruta som är tom ('ans' eller 'b').
function allQuestions(level) {
  const out = [];
  const { op, max } = level;
  if (op === '+' || op === 'x') {
    for (let a = 0; a <= max; a++) {
      for (let b = 0; a + b <= max; b++) {
        const s = a + b;
        if (s === 0) continue;
        if (max === 20 && (s <= 10 || a === 0 || b === 0)) continue;
        let w = 1;
        if (a === 0 || b === 0) w = 0.25;
        else if (max === 10 && s <= 4) w = 0.5;
        out.push({ a, b, op: '+', ans: s, hide: 'ans', w });
      }
    }
  }
  if (op === '-' || op === 'x') {
    for (let a = 1; a <= max; a++) {
      if (max === 20 && a <= 10) continue;
      for (let b = 0; b <= a; b++) {
        if (max === 20 && b === 0) continue;
        let w = 1;
        if (b === 0 || b === a) w = 0.25;
        else if (max === 10 && a <= 4) w = 0.5;
        out.push({ a, b, op: '-', ans: a - b, hide: 'ans', w });
      }
    }
  }
  if (op === 'k') {
    for (let a = 0; a <= 10; a++) {
      out.push({ a, b: 10 - a, op: '+', ans: 10 - a, hide: 'b', w: a === 0 || a === 10 ? 0.25 : 1 });
    }
  }
  return out;
}

// Viktat urval utan återläggning (fyller på om poolen är mindre än n)
function buildRound(level, n = ROUND_LEN, rnd = Math.random) {
  const all = allQuestions(level);
  const round = [];
  let pool = all.slice();
  while (round.length < n) {
    if (!pool.length) pool = all.slice();
    const total = pool.reduce((s, q) => s + q.w, 0);
    let r = rnd() * total;
    let i = 0;
    while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
    const q = pool.splice(i, 1)[0];
    const prev = round[round.length - 1];
    if (prev && prev.a === q.a && prev.b === q.b && prev.op === q.op && pool.length) {
      pool.push(q); // samma som nyss: välj en annan
      continue;
    }
    round.push(q);
  }
  return round;
}

function starsFor(firstTry, total = ROUND_LEN) {
  if (firstTry >= total - 1) return 3;
  if (firstTry >= total * 0.6) return 2;
  return 1; // en stjärna för att man spelade klart
}

function nextSticker(owned, rnd = Math.random) {
  const missing = STICKERS.filter((s) => !owned[s]);
  const from = missing.length ? missing : STICKERS;
  return from[Math.floor(rnd() * from.length)];
}

function speakText(q) {
  const w = q.op === '+' ? 'plus' : 'minus';
  if (q.hide === 'b') return `${q.a} plus hur många blir ${q.a + q.b}?`;
  return `${q.a} ${w} ${q.b}. Hur mycket blir det?`;
}

if (typeof module !== 'undefined') {
  module.exports = { LEVELS, STICKERS, allQuestions, buildRound, starsFor, nextSticker, speakText };
}

/* ---------- UI ---------- */
if (typeof document !== 'undefined') {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const STORE = 'julias-plusminus-v1';
  let data;
  try { data = JSON.parse(localStorage.getItem(STORE)); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') data = {};
  data.best = data.best || {};      // nivå-id -> bästa antal stjärnor
  data.stickers = data.stickers || {}; // emoji -> antal
  if (data.sound === undefined) data.sound = true;
  if (data.speak === undefined) data.speak = false;
  function save() { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignorera */ } }

  /* Ljud */
  let audio;
  function unlockAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state !== 'running') audio.resume();
    } catch (e) { /* inget ljud */ }
  }
  ['pointerup', 'touchend', 'click', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));

  function tones(notes, type, vol) {
    if (!data.sound) return;
    try {
      unlockAudio();
      if (!audio) return;
      notes.forEach((f, i) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = type;
        o.frequency.value = f;
        const t = audio.currentTime + i * 0.11;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(audio.destination);
        o.start(t);
        o.stop(t + 0.22);
      });
    } catch (e) { /* inget ljud */ }
  }
  const sndRight = () => tones([660, 880, 1100], 'triangle', 0.25);
  const sndWrong = () => tones([330, 260], 'sine', 0.18);
  const sndWin = () => tones([523, 659, 784, 1047], 'triangle', 0.25);

  /* Uppläsning */
  let svVoice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    svVoice = vs.find((v) => /^sv/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
  }
  function say(text) {
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'sv-SE';
      if (svVoice) u.voice = svVoice;
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* ingen uppläsning */ }
  }
  if (!window.speechSynthesis) { $('#say').hidden = true; $('#speak-toggle').hidden = true; }

  /* Vyer */
  function show(name) {
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    if (name === 'home') renderHome();
    if (name === 'album') renderAlbum();
    window.scrollTo(0, 0);
  }
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
    stopGame();
    show(b.dataset.go);
  }));

  function starStr(n) { return '⭐'.repeat(n) + '☆'.repeat(3 - n); }
  function totalStars() { return Object.values(data.best).reduce((s, n) => s + n, 0); }
  function stickerCount() { return Object.keys(data.stickers).length; }

  function renderHome() {
    $('#chip-stars').textContent = totalStars();
    $('#chip-stickers').textContent = stickerCount();
    $('#levels').innerHTML = LEVELS.map((l) => `
      <button class="level ${l.c}" data-level="${l.id}">
        <span class="l-icon">${l.icon}</span>
        <span class="l-title">${l.title}</span>
        <span class="l-sub">${l.sub}</span>
        <span class="l-stars">${starStr(data.best[l.id] || 0)}</span>
      </button>`).join('');
    $('#sound-toggle').textContent = data.sound ? '🔊 Ljud på' : '🔇 Ljud av';
    $('#speak-toggle').textContent = data.speak ? '🗣️ Läs upp: på' : '🗣️ Läs upp: av';
  }
  $('#levels').addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (b) startGame(LEVELS.find((l) => l.id === b.dataset.level));
  });
  $('#sound-toggle').addEventListener('click', () => { data.sound = !data.sound; save(); renderHome(); });
  $('#speak-toggle').addEventListener('click', () => {
    data.speak = !data.speak; save(); renderHome();
    if (data.speak) say('Nu läser jag upp talen');
  });

  /* Spelet */
  let game = null;
  let timer = null;

  function startGame(level) {
    game = {
      level,
      queue: buildRound(level),
      idx: 0,
      firstTry: 0,
      results: [],
      theme: THEMES[Math.floor(Math.random() * THEMES.length)],
    };
    show('play');
    history.pushState({ v: 'play' }, '');
    nextQuestion();
  }
  function stopGame() {
    clearTimeout(timer);
    game = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  const cur = () => game.queue[game.idx];

  function nextQuestion() {
    game.input = '';
    game.tries = 0;
    game.reveal = false;
    game.showPics = !!game.level.pics;
    $('#card').className = 'card';
    $('#feedback').innerHTML = '&nbsp;';
    $('#k-ok').textContent = 'OK';
    renderQuestion();
    renderDots();
    if (data.speak) say(speakText(cur()));
  }

  function renderDots() {
    $('#play-dots').innerHTML = game.queue.map((_, i) => {
      const r = game.results[i];
      const cls = r === 'first' ? 'd-good' : r === 'later' ? 'd-ok' : r === 'miss' ? 'd-miss' : i === game.idx ? 'd-now' : '';
      return `<i class="${cls}"></i>`;
    }).join('');
  }

  function renderQuestion() {
    const q = cur();
    const opSign = q.op === '+' ? '+' : '−';
    const slotVal = game.reveal ? q.ans : (game.input || '?');
    const slot = `<span class="slot ${game.input || game.reveal ? 'filled' : ''}">${slotVal}</span>`;
    const parts = q.hide === 'b'
      ? [q.a, opSign, slot, '=', q.a + q.b]
      : [q.a, opSign, q.b, '=', slot];
    $('#question').innerHTML = parts.map((p) => `<span>${p}</span>`).join('');
    renderPics();
    $('#help').hidden = game.showPics || !!game.level.pics;
  }

  // Bilder att räkna på, i grupper om 5
  function group(n, cls = '', extra = 0, extraCls = '') {
    const items = [];
    for (let i = 0; i < n; i++) items.push(`<i class="${cls}">${game.theme}</i>`);
    for (let i = 0; i < extra; i++) items.push(`<i class="${extraCls}">${extraCls === 'empty' ? '' : game.theme}</i>`);
    let html = '';
    for (let i = 0; i < items.length; i += 5) html += `<span class="five">${items.slice(i, i + 5).join('')}</span>`;
    return `<span class="grp">${html}</span>`;
  }
  function renderPics() {
    const box = $('#pics');
    if (!game.showPics) { box.innerHTML = ''; return; }
    const q = cur();
    box.classList.toggle('small', (q.op === '+' ? q.a + q.b : q.a) > 10);
    if (q.hide === 'b') {
      // Tiokompisar: a bilder + tomma platser upp till 10
      box.innerHTML = group(q.a, '', 10 - q.a, game.reveal ? 'new' : 'empty');
    } else if (q.op === '+') {
      box.innerHTML = group(q.a) + '<b class="pop">+</b>' + group(q.b, 'second');
    } else {
      box.innerHTML = group(q.a - q.b, '', q.b, 'gone');
    }
  }

  $('#help').addEventListener('click', () => { if (game) { game.showPics = true; renderQuestion(); } });
  $('#say').addEventListener('click', () => { if (game) say(speakText(cur())); });

  function press(k) {
    if (!game || game.locked) return;
    if (k === 'ok') return submit();
    if (game.reveal) return;
    if (k === 'del') game.input = game.input.slice(0, -1);
    else if (game.input.length < 2) game.input = (game.input === '0' ? '' : game.input) + k;
    $('#card').className = 'card';
    renderQuestion();
  }
  $('#keypad').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) press(b.dataset.k);
  });
  document.addEventListener('keydown', (e) => {
    if (!$('#view-play').classList.contains('active')) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') press('ok');
  });

  const PRAISE = ['Rätt! 🎉', 'Snyggt! 🌟', 'Jättebra! 💪', 'Toppen! 🥳', 'Superbra! ⭐'];

  function submit() {
    const q = cur();
    if (game.reveal) return advance();
    if (game.input === '') return;
    const card = $('#card');
    if (Number(game.input) === q.ans) {
      game.results[game.idx] = game.tries === 0 ? 'first' : 'later';
      if (game.tries === 0) game.firstTry++;
      card.className = 'card right bump';
      $('#feedback').textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      sndRight();
      game.locked = true;
      timer = setTimeout(() => { game.locked = false; advance(); }, 1000);
      return;
    }
    game.tries++;
    sndWrong();
    card.className = 'card wrong';
    if (game.tries === 1) {
      $('#feedback').textContent = 'Nästan! Försök igen 💪';
      game.input = '';
      game.showPics = true; // hjälp: visa bilderna
      renderQuestion();
    } else {
      game.results[game.idx] = 'miss';
      game.reveal = true;
      game.showPics = true;
      card.className = 'card reveal';
      $('#feedback').textContent = 'Så här blir det 👆';
      $('#k-ok').textContent = '➜';
      renderQuestion();
      renderDots();
    }
  }

  function advance() {
    if (!game) return;
    game.idx++;
    if (game.idx >= game.queue.length) return finish();
    nextQuestion();
  }

  function finish() {
    const stars = starsFor(game.firstTry, game.queue.length);
    const id = game.level.id;
    const newBest = stars > (data.best[id] || 0);
    data.best[id] = Math.max(stars, data.best[id] || 0);
    const st = nextSticker(data.stickers);
    const isNew = !data.stickers[st];
    data.stickers[st] = (data.stickers[st] || 0) + 1;
    save();

    $('#result-stars').innerHTML = [0, 1, 2].map((i) =>
      `<span class="${i < stars ? '' : 'dim'}" style="animation-delay:${i * 0.25}s">⭐</span>`).join('');
    $('#result-title').textContent = ['', 'Bra kämpat!', 'Jättebra!', 'Fantastiskt!'][stars];
    $('#result-text').textContent = `${game.firstTry} av ${game.queue.length} rätt på första försöket`
      + (newBest && stars > 1 ? ' – nytt rekord!' : '');
    $('#result-sticker').textContent = st;
    $('#result-sticker').dataset.new = isNew ? 'Ny!' : '';
    const lvl = game.level;
    $('#result-again').onclick = () => startGame(lvl);
    game = null;
    show('result');
    sndWin();
    if (stars >= 2) confetti();
    if (data.speak) say(['', 'Bra kämpat!', 'Jättebra!', 'Fantastiskt!'][stars]);
  }

  $('#play-quit').addEventListener('click', () => { stopGame(); show('home'); });
  window.addEventListener('popstate', () => {
    if (!$('#view-home').classList.contains('active')) { stopGame(); show('home'); }
  });

  /* Album */
  function renderAlbum() {
    $('#album-count').textContent = `Du har ${stickerCount()} av ${STICKERS.length} klistermärken`;
    $('#album-grid').innerHTML = STICKERS.map((s) => {
      const n = data.stickers[s];
      return n ? `<div class="got">${s}${n > 1 ? `<small>×${n}</small>` : ''}</div>` : '<div class="no">?</div>';
    }).join('');
  }
  $('#reset').addEventListener('click', () => {
    if (!confirm('Vill du ta bort alla stjärnor och klistermärken?')) return;
    data.best = {}; data.stickers = {}; save(); renderAlbum();
  });

  /* Konfetti */
  function confetti() {
    const box = $('#confetti');
    const colors = ['#ff5d8f', '#3bb4f2', '#f5b700', '#a66cff', '#4caf7a', '#ff9f43'];
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      p.style.animationDelay = Math.random() * 0.6 + 's';
      box.appendChild(p);
      setTimeout(() => p.remove(), 4500);
    }
  }

  /* Installera */
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let installEvt = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!standalone) $('#install-btn').hidden = false;
  if (isIOS) {
    const ua = navigator.userAgent;
    $('#install-help-ios').innerHTML = /CriOS/.test(ua)
      ? 'Tryck på <b>Dela</b> <span class="ios-share">⬆︎</span> uppe till höger i adressfältet ' +
        '(eller <b>⋯</b> → <b>Dela</b>) och välj <b>Lägg till på hemskärmen</b>.'
      : /FxiOS|EdgiOS/.test(ua)
        ? 'Tryck på menyn <b>☰</b> eller <b>⋯</b> → <b>Dela</b> <span class="ios-share">⬆︎</span> ' +
          'och välj <b>Lägg till på hemskärmen</b>.'
        : 'Tryck på <b>Dela</b> <span class="ios-share">⬆︎</span> och välj <b>Lägg till på hemskärmen</b>.' +
          '<br><small>Se till att <b>Öppna som webbapp</b> är påslaget.</small>';
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvt = e;
    $('#install-btn').hidden = false;
  });
  $('#install-btn').addEventListener('click', async () => {
    if (installEvt && !isIOS) {
      installEvt.prompt();
      const r = await installEvt.userChoice;
      installEvt = null;
      if (r.outcome === 'accepted') $('#install-btn').hidden = true;
    } else {
      const help = $(isIOS ? '#install-help-ios' : '#install-help');
      help.hidden = !help.hidden;
    }
  });
  window.addEventListener('appinstalled', () => {
    $('#install-btn').hidden = true;
    $('#install-help').hidden = true;
    $('#install-help-ios').hidden = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  renderHome();
}
