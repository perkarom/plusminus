'use strict';

/* ---------- Nivåer och frågor (rena funktioner, testas med node) ---------- */
const APP_VERSION = '14'; // höj tillsammans med CACHE i sw.js
// Nyheter som visas (och läses upp) en gång efter en uppdatering. say = text för ljudklippet audio/nyhet_<v>.mp3
const NEWS = [
  { v: 5, items: ['🎯 Ett <b>mål</b> för varje dag', '🔥 Elden visar hur många <b>dagar i rad</b> du klarat målet',
    '👑 Kan du en nivå jättebra får den en <b>krona</b>'],
  say: 'Nu finns det ett mål för varje dag. Elden visar hur många dagar i rad du har klarat målet. Och kan du en nivå jättebra får den en krona!' },
  { v: 6, items: ['🔇 Stäng av <b>ljudet</b> medan du räknar'], say: 'Nu kan du stänga av ljudet medan du räknar.' },
  { v: 10, items: ['🗣️ Tryck här för att stänga av <b>rösten</b>', '👆 Tryck på talet för att <b>höra det igen</b>'],
    say: 'Tryck på gubben som pratar för att stänga av rösten. Tryck på talet för att höra det igen.' },
  { v: 12, items: ['🎁 Alla dina <b>klistermärken</b> finns under den nya knappen på startsidan'],
    say: 'Alla dina klistermärken finns under den nya knappen på startsidan.' },
  { v: 13, items: ['🦩 Ett nytt djur: <b>flamingo</b>! Den finns som klistermärke och ibland när du räknar'],
    say: 'Ett nytt djur! En flamingo. Den finns som klistermärke, och ibland när du räknar.' },
];
function newsFor(seen) { return NEWS.filter((n) => n.v > seen); }
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
  '🦖', '🚀', '🎠', '💎', '🦩'];

const THEMES = ['🍎', '🍓', '🐞', '⭐', '🌸', '🐟', '🍪', '🎈', '🐥', '🍒', '🦩'];

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

const WORDS = ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio',
  'elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton', 'tjugo'];
const cap = (t) => t[0].toUpperCase() + t.slice(1);

// Text för uppläsningen (och för de inspelade klippen i audio/)
function speakText(q) {
  if (q.hide === 'b') return `${cap(WORDS[q.a])} plus hur många blir ${WORDS[q.a + q.b]}?`;
  return `Vad blir ${WORDS[q.a]} ${q.op === '+' ? 'plus' : 'minus'} ${WORDS[q.b]}?`;
}
function clipName(q) {
  if (q.hide === 'b') return `k_${q.a}`;
  return `${q.op === '+' ? 'p' : 'm'}_${q.a}_${q.b}`;
}
function revealText(n) { return `Det blir ${WORDS[n]}.`; }

const PRAISE = ['Rätt! 🎉', 'Snyggt! 🌟', 'Jättebra! 💪', 'Toppen! 🥳', 'Superbra! ⭐'];
const RESULT_TITLES = ['', 'Bra kämpat!', 'Jättebra!', 'Fantastiskt!'];
const PHRASES = {
  ratt_0: 'Rätt!', ratt_1: 'Snyggt!', ratt_2: 'Jättebra!', ratt_3: 'Toppen!', ratt_4: 'Superbra!',
  nastan: 'Nästan! Försök igen.',
  res_1: 'Bra kämpat!', res_2: 'Jättebra!', res_3: 'Fantastiskt!',
  upplasning: 'Nu läser jag upp talen.',
  mal: 'Hurra! Dagens mål är klart!',
  krona: 'Du kan redan det här! Vill du prova något svårare?',
  nyhet: 'Det finns något nytt i appen!',
  svarare: 'Jättebra! Vill du prova något svårare?',
};

/* ---------- Kronor: en nivå man kan ---------- */
const CROWN_AT = 3; // antal omgångar med 3 stjärnor
function isCrowned(d, id) { return ((d.perfect && d.perfect[id]) || 0) >= CROWN_AT; }
// Nästa nivå i listan som inte har krona (för "prova något svårare")
function harderLevel(d, id) {
  const i = LEVELS.findIndex((l) => l.id === id);
  return LEVELS.slice(i + 1).find((l) => !isCrowned(d, l.id)) || null;
}

/* ---------- Dagens mål och dagar i rad (samma logik som Gångerkungen, bara "rätt svar") ---------- */
const GOAL_VALUES = [10, 20, 30, 50];
const DEFAULT_GOAL = { type: 'right', value: 20 };
const MAX_Q_MS = 30000; // max tid som räknas per fråga
const DAYS_KEEP = 365;

function todayStr(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function prevDay(date) {
  const [y, m, d] = date.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d - 1)); // Date hanterar månads-/årsskiften och sommartid
}
function fixGoal(g) {
  if (g && g.type === 'off') return { type: 'off', value: 0 };
  if (g && g.type === 'right' && GOAL_VALUES.includes(g.value)) return { type: 'right', value: g.value };
  return { ...DEFAULT_GOAL };
}
function dailyOf(p, date = todayStr()) {
  if (!p.daily || p.daily.date !== date) p.daily = { date, right: 0, done: false };
  return p.daily;
}
function goalProgress(p, date = todayStr()) {
  const g = fixGoal(p.goal);
  if (g.type === 'off') return { type: 'off', done: false, frac: 0, short: '' };
  const d = dailyOf(p, date);
  const done = d.done || d.right >= g.value;
  return { type: 'right', done, frac: Math.min(1, d.right / g.value), right: d.right, goal: g.value,
    short: done ? '🎯 ✅' : `🎯 ${d.right}/${g.value}` };
}
function markStreakDay(p, date) {
  p.streakDays = p.streakDays || [];
  if (!p.streakDays.includes(date)) p.streakDays = p.streakDays.concat(date).slice(-400);
  p.bestStreak = Math.max(p.bestStreak || 0, streakInfo(p, date).count);
}
// Sviten lever hela dagen: räknas från idag om dagen är klar, annars från igår.
function streakInfo(p, date = todayStr()) {
  const set = new Set(p.streakDays || []);
  const todayDone = set.has(date);
  let d = todayDone ? date : prevDay(date);
  let count = 0;
  while (set.has(d)) { count++; d = prevDay(d); }
  return { count, todayDone, best: Math.max(p.bestStreak || 0, count) };
}
function trimDays(days) {
  const keys = Object.keys(days).sort();
  keys.slice(0, Math.max(0, keys.length - DAYS_KEEP)).forEach((k) => delete days[k]);
  return days;
}
// Registrera ett svar. Returnerar true om dagens mål nåddes precis nu.
// counts = false: nivå med krona, syns i dag-för-dag men räknas inte till målet/sviten
function recordDaily(p, ok, ms, date = todayStr(), counts = true) {
  p.days = p.days || {};
  const day = p.days[date] || (p.days[date] = { r: 0, w: 0, ms: 0 });
  if (ok) day.r++; else day.w++;
  day.ms += Math.min(Math.max(0, ms), MAX_Q_MS);
  if (Object.keys(p.days).length > DAYS_KEEP) trimDays(p.days);
  if (!counts || !ok) return false;
  const d = dailyOf(p, date);
  d.right++;
  if (fixGoal(p.goal).type === 'off') { markStreakDay(p, date); return false; }
  if (d.done) return false;
  if (goalProgress(p, date).done) {
    d.done = true;
    p.goalDays = (p.goalDays || []).concat(date).slice(-400);
    markStreakDay(p, date);
    return true;
  }
  return false;
}
// De senaste n dagarna (äldst först), även dagar utan övning
function daySummary(p, n, date = todayStr()) {
  const goals = new Set(p.goalDays || []);
  const out = [];
  let d = date;
  for (let i = 0; i < n; i++) {
    const v = (p.days && p.days[d]) || { r: 0, w: 0, ms: 0 };
    out.unshift({ date: d, r: v.r, w: v.w, ms: v.ms, goal: goals.has(d) });
    d = prevDay(d);
  }
  return out;
}

/* ---------- Spara / hämta som fil ---------- */
const BACKUP_KEYS = ['best', 'stickers', 'perfect', 'days', 'goalDays', 'streakDays', 'bestStreak'];
function makeBackup(d) {
  const b = { app: 'julias-plusminus', version: 1, saved: new Date().toISOString() };
  BACKUP_KEYS.forEach((k) => { b[k] = d[k]; });
  return b;
}
function parseBackup(text) {
  let b;
  try { b = JSON.parse(text); } catch (e) { throw new Error('Filen går inte att läsa.'); }
  if (!b || b.app !== 'julias-plusminus') throw new Error('Det här är ingen fil från Julias + och −.');
  const num = (x) => (Number.isFinite(x) && x >= 0 ? Math.round(x) : 0);
  const ids = new Set(LEVELS.map((l) => l.id));
  const byLevel = (o, max) => {
    const out = {};
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (ids.has(k)) out[k] = Math.min(max, num(v));
    return out;
  };
  const stickers = {};
  if (b.stickers && typeof b.stickers === 'object') {
    for (const [k, v] of Object.entries(b.stickers)) if (STICKERS.includes(k) && num(v)) stickers[k] = num(v);
  }
  const days = {};
  if (b.days && typeof b.days === 'object') {
    for (const [k, v] of Object.entries(b.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') days[k] = { r: num(v.r), w: num(v.w), ms: num(v.ms) };
    }
  }
  const dates = (a) => (Array.isArray(a) ? a.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-400) : []);
  return {
    best: byLevel(b.best, 3), perfect: byLevel(b.perfect, 999), stickers, days: trimDays(days),
    goalDays: dates(b.goalDays), streakDays: dates(b.streakDays), bestStreak: num(b.bestStreak),
  };
}

if (typeof module !== 'undefined') {
  module.exports = { LEVELS, STICKERS, PHRASES, PRAISE, allQuestions, buildRound, starsFor, nextSticker,
    speakText, clipName, revealText, CROWN_AT, isCrowned, harderLevel, todayStr, prevDay, fixGoal, goalProgress,
    streakInfo, recordDaily, daySummary, makeBackup, parseBackup, NEWS, newsFor, APP_VERSION };
}

/* ---------- UI ---------- */
if (typeof document !== 'undefined') {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  let pendingReload = false; // ny version kom under en omgång eller medan en ruta var öppen
  const STORE = 'julias-plusminus-v1';
  let data;
  try { data = JSON.parse(localStorage.getItem(STORE)); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') data = { seenNews: Number(APP_VERSION) }; // ny: inga gamla nyheter
  if (!Number.isFinite(data.seenNews)) data.seenNews = 4; // fanns före nyhetsrutan
  data.best = data.best || {};      // nivå-id -> bästa antal stjärnor
  data.stickers = data.stickers || {}; // emoji -> antal
  if (data.sound === undefined) data.sound = true;
  if (data.speak === undefined) data.speak = true;
  data.perfect = data.perfect || {};  // nivå-id -> antal omgångar med 3 stjärnor
  data.days = data.days || {};        // dag för dag
  data.goal = fixGoal(data.goal);
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
    // Välj den bästa svenska rösten: nätverks-/premiumröster låter mycket bättre än standard
    const score = (v) => (/natural|neural|premium|enhanced|förbättrad/i.test(v.name) ? 4 : 0) +
      (/google/i.test(v.name) ? 3 : 0) + (/alva|klara|sofie|hillevi/i.test(v.name) ? 2 : 0) +
      (v.localService === false ? 1 : 0);
    const sv = speechSynthesis.getVoices().filter((v) => /^sv/i.test(v.lang));
    svVoice = sv.sort((a, b) => score(b) - score(a))[0] || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
  }
  function sayTTS(text) {
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

  // Inspelade klipp (audio/<namn>.mp3) spelas via Web Audio, som redan är upplåst efter första trycket.
  // Klippen köas: ett nytt klipp börjar först när det förra har talat klart, så inget klipps av.
  // Går klippet inte att hämta används telefonens röst istället.
  const clips = new Map();
  const playing = new Set();
  let voiceEnd = 0;          // när (i audio-tid) det senast köade klippet har talat klart
  let chain = Promise.resolve();
  let sayToken = 0;

  // Var talet slutar i klippet (efter det kommer bara tystnad)
  function speechEnd(buf) {
    const x = buf.getChannelData(0);
    let i = x.length - 1;
    while (i > 0 && Math.abs(x[i]) < 0.01) i--;
    return Math.min(buf.duration, i / buf.sampleRate + 0.15);
  }
  function loadClip(name) {
    if (!clips.has(name)) {
      const p = fetch(`audio/${name}.mp3`)
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((buf) => new Promise((ok, bad) => audio.decodeAudioData(buf, ok, bad)))
        .then((buf) => ({ buf, end: speechEnd(buf) }));
      p.catch(() => clips.delete(name));
      clips.set(name, p);
    }
    return clips.get(name);
  }
  function stopVoice() {
    sayToken++;
    chain = Promise.resolve();
    playing.forEach((src) => { try { src.stop(); } catch (e) { /* redan slut */ } });
    playing.clear();
    voiceEnd = 0;
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  // interrupt = avbryt det som låter (t.ex. när man trycker på 🔈 eller lämnar spelet)
  // valid = kontroll precis innan klippet startar (t.ex. att talet fortfarande visas)
  function say(name, text, delay = 0, interrupt = false, valid = () => true) {
    if (interrupt) stopVoice();
    unlockAudio();
    const token = sayToken;
    const asked = audio ? audio.currentTime : 0;
    const job = chain.then(async () => {
      if (token !== sayToken) return;
      try {
        if (!audio) throw new Error('inget ljud');
        const clip = await loadClip(name);
        if (token !== sayToken || !valid()) return;
        const src = audio.createBufferSource();
        src.buffer = clip.buf;
        src.connect(audio.destination);
        const at = Math.max(audio.currentTime, asked + delay, voiceEnd + 0.15);
        src.start(at);
        voiceEnd = at + clip.end;
        playing.add(src);
        src.onended = () => playing.delete(src);
      } catch (e) {
        if (token === sayToken && valid()) sayTTS(text);
      }
    });
    chain = job;
    return job;
  }

  /* Vyer */
  function show(name) {
    // Ny version kom under en omgång: ladda om när den är klar
    if (pendingReload && name !== 'play' && name !== 'result') { location.reload(); return; }
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    if (name === 'home') renderHome();
    if (name === 'album') renderAlbum();
    if (name === 'adult') renderAdult();
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
    setTimeout(showNews, 400);
    $('#chip-stars').textContent = totalStars();
    $('#chip-stickers').textContent = stickerCount();
    $('#album-btn-n').textContent = `${stickerCount()}/${STICKERS.length}`;
    const sk = streakInfo(data);
    $('#chip-streak').hidden = sk.count === 0;
    $('#chip-streak').classList.toggle('pending', !sk.todayDone);
    $('#chip-streak-n').textContent = sk.count;
    const gp = goalProgress(data);
    $('#goal-bar').hidden = gp.type === 'off';
    $('#goal-bar').classList.toggle('done', gp.done);
    $('#goal-text').textContent = gp.short;
    $('#goal-fill').style.width = gp.frac * 100 + '%';
    $('#levels').innerHTML = LEVELS.map((l) => `
      <button class="level ${l.c}${isCrowned(data, l.id) ? ' crowned' : ''}" data-level="${l.id}">
        ${isCrowned(data, l.id) ? '<span class="l-crown">👑</span>' : ''}
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
    if (!b) return;
    playOrSuggest(LEVELS.find((l) => l.id === b.dataset.level), false);
  });
  // Nivå med krona (eller alla rätt när man trycker Spela igen): föreslå en svårare nivå
  function playOrSuggest(lvl, perfect) {
    const crowned = isCrowned(data, lvl.id);
    const harder = (crowned || perfect) && harderLevel(data, lvl.id);
    if (!harder) return startGame(lvl);
    const left = CROWN_AT - ((data.perfect && data.perfect[lvl.id]) || 0);
    openModal({
      icon: crowned ? '👑' : '🌟', title: crowned ? 'Du kan redan det här!' : 'Jättebra! ⭐⭐⭐',
      html: `Vill du prova <b>${harder.icon} ${harder.title} ${harder.sub}</b>?` +
        (crowned ? '' : `<br><small>Får du tre stjärnor ${left} ${left === 1 ? 'gång' : 'gånger'} till här får nivån en 👑.</small>`),
      yes: `Ja! ${harder.icon}`, no: crowned ? 'Nej, spela ändå' : 'Kör igen 🔁',
      onYes: () => startGame(harder), onNo: () => startGame(lvl),
    });
    if (data.speak) say(crowned ? 'krona' : 'svarare', crowned ? PHRASES.krona : PHRASES.svarare, 0.2, true);
  }
  $('#sound-toggle').addEventListener('click', () => { data.sound = !data.sound; save(); renderHome(); });

  // Under spelet: 🔊/🔇 = pipljud, 🗣️/🤫 = uppläsning (samma två val som på startsidan)
  function renderMute() {
    $('#mute').textContent = data.sound ? '🔊' : '🔇';
    $('#mute').classList.toggle('off', !data.sound);
    $('#say').textContent = data.speak ? '🗣️' : '🤫';
    $('#say').classList.toggle('off', !data.speak);
  }
  function setSpeak(on) {
    data.speak = on; save();
    if (!on) stopVoice();
  }
  $('#mute').addEventListener('click', () => {
    data.sound = !data.sound; save(); renderMute();
    if (data.sound) tones([660, 880], 'triangle', 0.2);
  });
  $('#say').addEventListener('click', () => {
    setSpeak(!data.speak); renderMute();
    if (data.speak && game) say(clipName(cur()), speakText(cur()), 0, true);
  });
  $('#speak-toggle').addEventListener('click', () => {
    setSpeak(!data.speak); renderHome();
    if (data.speak) say('upplasning', PHRASES.upplasning, 0, true);
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
      crowned: isCrowned(data, level.id), // räknas inte till dagens mål
      theme: THEMES[Math.floor(Math.random() * THEMES.length)],
    };
    show('play');
    history.pushState({ v: 'play' }, '');
    nextQuestion();
  }
  function stopGame() {
    clearTimeout(timer);
    game = null;
    stopVoice();
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
    game.qStart = Date.now();
    renderMute();
    renderQuestion();
    renderDots();
    updateGoalLine();
    const q = cur();
    if (data.speak) say(clipName(q), speakText(q), 0, false, () => game && cur() === q);
  }

  function renderDots() {
    $('#play-dots').innerHTML = game.queue.map((_, i) => {
      const r = game.results[i];
      const cls = r === 'first' ? 'd-good' : r === 'later' ? 'd-ok' : r === 'miss' ? 'd-miss' : i === game.idx ? 'd-now' : '';
      return `<i class="${cls}${game.queue[i].again ? ' again' : ''}"></i>`;
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
  // Tryck på talet för att höra det igen (fungerar även när uppläsningen är av)
  $('#question').addEventListener('click', () => { if (game) say(clipName(cur()), speakText(cur()), 0, true); });

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

  function submit() {
    const q = cur();
    if (game.reveal) return advance();
    if (game.input === '') return;
    const card = $('#card');
    if (Number(game.input) === q.ans) {
      game.results[game.idx] = game.tries === 0 ? 'first' : 'later';
      if (game.tries === 0 && !q.again) game.firstTry++;
      const goalNow = recordDaily(data, true, Date.now() - game.qStart, todayStr(), !game.crowned);
      save();
      updateGoalLine();
      if (goalNow) celebrateGoal();
      card.className = 'card right bump';
      const pi = Math.floor(Math.random() * PRAISE.length);
      $('#feedback').textContent = PRAISE[pi];
      sndRight();
      if (data.speak) say('ratt_' + pi, PHRASES['ratt_' + pi], 0.3);
      game.locked = true;
      timer = setTimeout(() => { game.locked = false; advance(); }, data.speak ? 1400 : 1000);
      return;
    }
    game.tries++;
    recordDaily(data, false, game.tries >= 2 ? Date.now() - game.qStart : 0, todayStr(), !game.crowned);
    save();
    sndWrong();
    card.className = 'card wrong';
    if (game.tries === 1) {
      $('#feedback').textContent = 'Nästan! Försök igen 💪';
      if (data.speak) say('nastan', PHRASES.nastan, 0.3);
      game.input = '';
      game.showPics = true; // hjälp: visa bilderna
      renderQuestion();
    } else {
      game.results[game.idx] = 'miss';
      // Samma tal kommer tillbaka lite senare i omgången (en gång)
      if (!q.again) game.queue.splice(Math.min(game.idx + 3, game.queue.length), 0, { ...q, again: true });
      game.reveal = true;
      game.showPics = true;
      card.className = 'card reveal';
      $('#feedback').textContent = 'Så här blir det 👆';
      if (data.speak) say('svar_' + q.ans, revealText(q.ans), 0.3);
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
    const stars = starsFor(game.firstTry, ROUND_LEN);
    const id = game.level.id;
    const newBest = stars > (data.best[id] || 0);
    data.best[id] = Math.max(stars, data.best[id] || 0);
    const wasCrowned = isCrowned(data, id);
    if (stars === 3) data.perfect[id] = (data.perfect[id] || 0) + 1;
    const newCrown = !wasCrowned && isCrowned(data, id);
    const st = nextSticker(data.stickers);
    const isNew = !data.stickers[st];
    data.stickers[st] = (data.stickers[st] || 0) + 1;
    save();

    $('#result-stars').innerHTML = [0, 1, 2].map((i) =>
      `<span class="${i < stars ? '' : 'dim'}" style="animation-delay:${i * 0.25}s">⭐</span>`).join('');
    $('#result-title').textContent = newCrown ? '👑 Du kan den här nivån!' : RESULT_TITLES[stars];
    $('#result-text').textContent = `${game.firstTry} av ${ROUND_LEN} rätt på första försöket`
      + (newBest && stars > 1 ? ' – nytt rekord!' : '');
    const gp = goalProgress(data);
    $('#result-goal').hidden = gp.type === 'off' && !game.crowned;
    $('#result-goal').textContent = game.crowned ? '👑 Du kunde redan den här – prova en svårare!'
      : gp.done ? '🎯 Dagens mål är klart! ✅' : `🎯 ${gp.right} av ${gp.goal} rätt idag`;
    $('#result-sticker').textContent = st;
    $('#result-sticker').dataset.new = isNew ? 'Ny!' : '';
    const lvl = game.level;
    $('#result-again').onclick = () => playOrSuggest(lvl, stars === 3);
    game = null;
    show('result');
    sndWin();
    if (stars >= 2 || newCrown) confetti();
    if (data.speak) say('res_' + stars, RESULT_TITLES[stars], 0.5);
  }

  $('#play-quit').addEventListener('click', () => { stopGame(); show('home'); });
  window.addEventListener('popstate', () => {
    if (!$('#view-home').classList.contains('active')) { stopGame(); show('home'); }
  });

  /* Dagens mål under spelet */
  function updateGoalLine() {
    if (!game) return;
    const gp = goalProgress(data);
    const el = $('#goal-line');
    el.hidden = gp.type === 'off' && !game.crowned;
    el.textContent = game.crowned ? '👑 räknas inte till målet' : gp.short;
    el.classList.toggle('done', gp.done && !game.crowned);
  }
  function celebrateGoal() {
    const s = streakInfo(data);
    toast('🎉 Dagens mål klart, Julia!' + (s.count > 1 ? `\n🔥 ${s.count} dagar i rad!` : ''));
    confetti();
    if (data.speak) say('mal', PHRASES.mal, 0.2);
  }
  let toastTimer = null;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* Nytt i appen: visas och läses upp en gång efter en uppdatering */
  function showNews() {
    if (!$('#view-home').classList.contains('active') || !$('#modal').hidden) return;
    const news = newsFor(data.seenNews);
    if (!news.length) return;
    openModal({
      icon: '🎉', title: 'Nytt i appen!',
      html: '<ul class="news">' + news.flatMap((n) => n.items).map((t) => `<li>${t}</li>`).join('') + '</ul>',
      yes: 'Coolt! 👍',
      // Räknas som sedd först när man stänger rutan (försvinner den ändå kommer den igen)
      onYes: () => { stopVoice(); data.seenNews = Number(APP_VERSION); save(); },
    });
    if (data.speak) {
      say('nyhet', PHRASES.nyhet, 0.2, true);
      news.forEach((n) => say('nyhet_' + n.v, n.say));
    }
  }

  /* Pop-up */
  let modalCb = {};
  function openModal({ icon, title, html, yes, no, onYes, onNo }) {
    $('#modal-icon').textContent = icon || '';
    $('#modal-title').textContent = title;
    $('#modal-text').innerHTML = html;
    $('#modal-yes').textContent = yes;
    $('#modal-no').textContent = no || '';
    $('#modal-no').hidden = !no;
    modalCb = { onYes, onNo };
    $('#modal').hidden = false;
  }
  function closeModal(yes) {
    $('#modal').hidden = true;
    const cb = yes ? modalCb.onYes : modalCb.onNo;
    modalCb = {};
    if (cb) cb();
    // En ny version väntade på att rutan skulle stängas
    if (pendingReload && $('#view-home').classList.contains('active')) location.reload();
  }
  $('#modal-yes').addEventListener('click', () => closeModal(true));
  $('#modal-no').addEventListener('click', () => closeModal(false));

  /* För vuxna */
  const WD = ['S', 'M', 'T', 'O', 'T', 'F', 'L'];
  const WDLONG = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
  const MON = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const dateOf = (x) => { const [y, m, d] = x.split('-').map(Number); return new Date(y, m - 1, d); };
  const mins = (ms) => { const m = Math.round(ms / 60000); return ms > 0 && m < 1 ? '<1 min' : m + ' min'; };
  function dayLabel(x, today) {
    if (x === today) return 'Idag';
    if (x === prevDay(today)) return 'Igår';
    const d = dateOf(x);
    return WDLONG[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
  }
  function renderAdult() {
    const g = fixGoal(data.goal);
    $('#goal-seg').innerHTML = [['off', 'Av'], ...GOAL_VALUES.map((v) => [v, String(v)])].map(([v, t]) =>
      `<button data-goal="${v}" class="${(g.type === 'off' ? 'off' : g.value) === v ? 'on' : ''}">${t}</button>`).join('');

    const today = todayStr();
    const sk = streakInfo(data);
    const totR = Object.values(data.days).reduce((t, d) => t + d.r, 0);
    $('#days-summary').innerHTML =
      `<div class="stat-box"><b>🔥 ${sk.count}</b><small>dagar i rad</small></div>` +
      `<div class="stat-box"><b>${sk.best}</b><small>bästa svit</small></div>` +
      `<div class="stat-box"><b>${totR}</b><small>rätt totalt</small></div>`;
    const days = daySummary(data, 14, today);
    const week = days.slice(-7);
    const wr = week.reduce((t, d) => t + d.r, 0);
    const wms = week.reduce((t, d) => t + d.ms, 0);
    const wn = week.filter((d) => d.r + d.w > 0).length;
    const any = days.some((d) => d.r + d.w > 0);
    $('#days-week').innerHTML = any
      ? `Senaste 7 dagarna: <b>${wr} rätt</b> · ${mins(wms)} · ${wn} ${wn === 1 ? 'dag' : 'dagar'} övade`
      : 'Här syns hur mycket Julia övar varje dag.';
    const max = Math.max(10, ...days.map((d) => d.r + d.w));
    $('#days-chart').innerHTML = days.map((d) => {
      const tot = d.r + d.w;
      return `<div class="day${d.date === today ? ' today' : ''}"><span class="day-goal">${d.goal ? '✅' : ''}</span>` +
        `<span class="day-n">${tot ? d.r : ''}</span>` +
        `<div class="day-bar" style="height:${(tot / max * 100).toFixed(1)}%">` +
        (d.w ? `<i class="w" style="flex:${d.w}"></i>` : '') + (d.r ? `<i class="r" style="flex:${d.r}"></i>` : '') + '</div>' +
        `<span class="day-wd">${WD[dateOf(d.date).getDay()]}</span></div>`;
    }).join('');
    $('#days-chart').hidden = !any;
    $('#days-list').innerHTML = days.filter((d) => d.r + d.w > 0).reverse().map((d) => {
      const pct = Math.round(d.r / (d.r + d.w) * 100);
      return `<li><b>${dayLabel(d.date, today)}</b><span>${d.r} rätt · ${d.w} fel · ${pct} % · ${mins(d.ms)}${d.goal ? ' ✅' : ''}</span></li>`;
    }).join('');
    $('#level-list').innerHTML = LEVELS.map((l) => {
      const n = data.perfect[l.id] || 0;
      const crown = isCrowned(data, l.id);
      return `<li><b>${l.icon} ${l.title} ${l.sub}</b><span>${starStr(data.best[l.id] || 0)}` +
        (crown ? ' 👑' : n ? ` · ${n}/${CROWN_AT} mot 👑` : '') + '</span></li>';
    }).join('');
  }
  $('#goal-seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-goal]');
    if (!b) return;
    data.goal = b.dataset.goal === 'off' ? { type: 'off', value: 0 } : fixGoal({ type: 'right', value: Number(b.dataset.goal) });
    save(); renderAdult();
  });

  /* Spara / hämta som fil */
  $('#backup-save').addEventListener('click', async () => {
    const text = JSON.stringify(makeBackup(data), null, 1);
    const name = 'julias-plusminus-' + todayStr() + '.json';
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Julias + och − – sparad data' });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
  $('#backup-load').addEventListener('click', () => $('#backup-file').click());
  $('#backup-file').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const b = parseBackup(await f.text());
      const stars = Object.values(b.best).reduce((t, n) => t + n, 0);
      if (!confirm(`Hämta från filen?\n\n${stars} stjärnor, ${Object.keys(b.stickers).length} klistermärken, ` +
        `${Object.keys(b.days).length} dagar.\n\nDet ersätter det som finns i appen nu.`)) return;
      Object.assign(data, b);
      data.daily = null;
      save(); renderAdult();
      alert('Klart! ⭐');
    } catch (err) {
      alert(err.message || 'Filen gick inte att läsa.');
    }
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
    if (!confirm('Vill du ta bort alla stjärnor, klistermärken, kronor och dag-för-dag?')) return;
    Object.assign(data, { best: {}, stickers: {}, perfect: {}, days: {}, daily: null, goalDays: [], streakDays: [], bestStreak: 0 });
    save(); renderAdult();
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

  /* Statusrad längst ner: är appen uppdaterad? */
  const stEl = $('#app-status');
  function setUpdateStatus(state) {
    stEl.textContent = {
      checking: 'Söker efter uppdatering…',
      ok: '✓ Appen är uppdaterad (v' + APP_VERSION + ')',
      offline: 'Utan internet · v' + APP_VERSION + ' (appen fungerar ändå)',
      updating: '🔄 Hämtar ny version…',
      ready: '🔄 Ny version finns – tryck här',
    }[state];
    stEl.classList.toggle('ready', state === 'ready');
    stEl.disabled = state !== 'ready';
  }
  stEl.addEventListener('click', () => location.reload());
  setUpdateStatus(navigator.onLine === false ? 'offline' : 'checking');

  if ('serviceWorker' in navigator) {
    // Ny version installerad: ladda om en gång (inte vid allra första installationen)
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    // Inte mitt i en omgång eller medan en ruta (t.ex. nyheterna) är öppen
    const isBusy = () => !!document.querySelector('#view-play.active, #view-result.active') || !$('#modal').hidden;
    function reloadWhenFree() {
      if (reloaded) return;
      if (isBusy()) { pendingReload = true; setUpdateStatus('ready'); return; }
      reloaded = true;
      location.reload();
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) reloadWhenFree(); });
    // Jämför versionen på nätet med den som körs: vid start, när appen kommer fram igen och var 15:e minut
    let lastCheck = 0, checking = false;
    async function checkUpdate(reg) {
      if (pendingReload || reloaded || checking) return;
      if (navigator.onLine === false) { setUpdateStatus('offline'); return; }
      if (!lastCheck) setUpdateStatus('checking');
      lastCheck = Date.now(); checking = true;
      try {
        const res = await fetch('sw.js?x=' + Date.now(), { cache: 'no-store' });
        const m = (await res.text()).match(/plusminus-v(\d+)/);
        if (!m || m[1] === APP_VERSION) { setUpdateStatus('ok'); return; }
        setUpdateStatus('updating');
        if (reg) reg.update().catch(() => {});
        // Normalt laddar controllerchange om; annars gör vi det själva
        setTimeout(reloadWhenFree, reg ? 8000 : 0);
      } catch (e) { setUpdateStatus('offline'); } finally { checking = false; }
    }
    let swReg = null;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => { swReg = reg; checkUpdate(reg); })
        .catch(() => checkUpdate(null));
    });
    window.addEventListener('online', () => checkUpdate(swReg));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastCheck > 60000) checkUpdate(swReg);
    });
    setInterval(() => { if (!document.hidden) checkUpdate(swReg); }, 15 * 60000);
    window.addEventListener('offline', () => { if (!pendingReload) setUpdateStatus('offline'); });
  } else {
    setUpdateStatus('ok');
  }

  renderHome();
}
