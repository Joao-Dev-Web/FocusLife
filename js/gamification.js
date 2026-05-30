// ============ GAMIFICATION ENGINE ============

const LEVELS = [
  { level: 1, xpNeeded: 0,    xpToNext: 100  },
  { level: 2, xpNeeded: 100,  xpToNext: 250  },
  { level: 3, xpNeeded: 350,  xpToNext: 500  },
  { level: 4, xpNeeded: 850,  xpToNext: 750  },
  { level: 5, xpNeeded: 1600, xpToNext: 1000 },
  { level: 6, xpNeeded: 2600, xpToNext: 1500 },
  { level: 7, xpNeeded: 4100, xpToNext: 2000 },
  { level: 8, xpNeeded: 6100, xpToNext: 3000 },
  { level: 9, xpNeeded: 9100, xpToNext: 4000 },
  { level: 10, xpNeeded: 13100, xpToNext: Infinity },
];

const XP_REWARDS = {
  TASK_DONE: 10,
  FOCUS_SESSION: 20,
  DAILY_GOAL: 50,
  STREAK_BONUS: 30,
  NOTE_CREATED: 5,
  MISSION_COMPLETE: 100,
};

const COIN_REWARDS = {
  TASK_DONE: 3,
  FOCUS_SESSION: 5,
  DAILY_GOAL: 20,
  STREAK_BONUS: 10,
  MISSION_COMPLETE: 50,
};

const ALL_ACHIEVEMENTS = [
  { id: 'first_task',     icon: '🎯', name: 'Primeira Tarefa',       desc: 'Concluiu sua primeira tarefa',        check: g => g.totalTasksDone >= 1    },
  { id: 'ten_tasks',      icon: '✅', name: 'Produtivo!',            desc: '10 tarefas concluídas',               check: g => g.totalTasksDone >= 10   },
  { id: 'hundred_tasks',  icon: '🏆', name: 'Cem Tarefas!',          desc: '100 tarefas concluídas',              check: g => g.totalTasksDone >= 100  },
  { id: 'first_focus',    icon: '🍅', name: 'Primeira Sessão',       desc: 'Completou uma sessão Pomodoro',       check: g => g.totalFocusSessions >= 1 },
  { id: 'focus_master',   icon: '🧘', name: 'Mestre do Foco',        desc: '50 sessões Pomodoro completas',       check: g => g.totalFocusSessions >= 50 },
  { id: 'streak_3',       icon: '🔥', name: 'Em Chamas!',            desc: '3 dias seguidos de atividade',        check: (g, s) => s.current >= 3     },
  { id: 'streak_7',       icon: '⚡', name: 'Sete Dias Seguidos',    desc: 'Uma semana completa de atividade',    check: (g, s) => s.current >= 7     },
  { id: 'streak_30',      icon: '💎', name: 'Mês Perfeito',          desc: '30 dias seguidos de atividade',       check: (g, s) => s.current >= 30    },
  { id: 'level5',         icon: '🌟', name: 'Nível 5 Alcançado',     desc: 'Subiu para o nível 5',                check: g => g.level >= 5            },
  { id: 'level10',        icon: '👑', name: 'Lendário',              desc: 'Alcançou o nível máximo!',            check: g => g.level >= 10           },
  { id: 'first_note',     icon: '📝', name: 'Primeiro Registro',     desc: 'Criou sua primeira nota',             check: g => (g.totalNotes||0) >= 1  },
];

function getLevelInfo(xp) {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) { current = LEVELS[i]; break; }
  }
  const xpInLevel = xp - current.xpNeeded;
  const pct = current.xpToNext === Infinity ? 100 : Math.min(100, Math.round((xpInLevel / current.xpToNext) * 100));
  return { level: current.level, xpInLevel, xpToNext: current.xpToNext, pct };
}

function addXP(amount, label = '') {
  const g = Storage.getGamification();
  const prevLevel = g.level;
  g.xp += amount;

  const info = getLevelInfo(g.xp);
  g.level = info.level;

  Storage.setGamification(g);
  updateGamificationUI();

  if (label) showXpPop(`+${amount} XP`);
  if (info.level > prevLevel) {
    showToast(`🎉 Subiu para o Nível ${info.level}!`);
    setTimeout(() => checkAchievements(), 500);
  }
}

function addCoins(amount) {
  const g = Storage.getGamification();
  g.coins += amount;
  Storage.setGamification(g);
  updateGamificationUI();
}

function checkAchievements() {
  const g = Storage.getGamification();
  const s = Storage.getStreak();
  let newUnlock = false;

  ALL_ACHIEVEMENTS.forEach(ach => {
    if (!g.achievements.includes(ach.id) && ach.check(g, s)) {
      g.achievements.push(ach.id);
      newUnlock = true;
      setTimeout(() => showToast(`🏆 Conquista: ${ach.name}!`), 800);
    }
  });

  if (newUnlock) Storage.setGamification(g);
}

function updateStreakOnActivity() {
  const s = Storage.getStreak();
  const today = todayStr();
  if (s.lastActiveDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  if (s.lastActiveDate === yStr) {
    s.current += 1;
  } else if (s.lastActiveDate !== today) {
    s.current = 1;
  }

  s.best = Math.max(s.best, s.current);
  s.lastActiveDate = today;

  if (!s.history.includes(today)) s.history.push(today);
  if (s.history.length > 60) s.history = s.history.slice(-60);

  const wasStreak = s.current > 1;
  Storage.setStreak(s);

  if (wasStreak) {
    addXP(XP_REWARDS.STREAK_BONUS, 'streak');
    addCoins(COIN_REWARDS.STREAK_BONUS);
  }
  checkAchievements();
}

function updateGamificationUI() {
  const g = Storage.getGamification();
  const s = Storage.getStreak();
  const info = getLevelInfo(g.xp);

  // Header
  const coinEl = document.getElementById('coinCount');
  const xpEl = document.getElementById('headerXP');
  if (coinEl) coinEl.textContent = g.coins;
  if (xpEl) xpEl.textContent = `Nv.${info.level}`;

  // XP card
  const levelTag = document.getElementById('levelTag');
  const xpNums = document.getElementById('xpNums');
  const xpBar = document.getElementById('xpBar');
  if (levelTag) levelTag.textContent = `⚡ Nível ${info.level}`;
  if (xpNums) xpNums.textContent = `${info.xpInLevel} / ${info.xpToNext === Infinity ? '∞' : info.xpToNext} XP`;
  if (xpBar) xpBar.style.width = info.pct + '%';

  // Stats
  const statStreak = document.getElementById('statStreak');
  if (statStreak) statStreak.textContent = s.current;
}

function showXpPop(text) {
  const pop = document.createElement('div');
  pop.className = 'xp-pop';
  pop.textContent = text;
  pop.style.left = Math.random() * 60 + 20 + '%';
  pop.style.top = '40%';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1300);
}

// ---- DAILY MISSIONS ----
function getDailyMissions() {
  const tasks = Storage.getTasks();
  const today = todayStr();
  const doneTodayCount = tasks.filter(t => t.done && t.doneAt && t.doneAt.startsWith(today)).length;
  const pomo = Storage.getPomodoro();
  const focusToday = pomo.lastSessionDate === today ? pomo.sessionsToday : 0;
  const notes = Storage.getNotes();
  const notesToday = notes.filter(n => n.createdAt && n.createdAt.startsWith(today)).length;

  return [
    { id: 'm1', text: 'Concluir 3 tarefas', done: doneTodayCount >= 3, progress: Math.min(doneTodayCount, 3), total: 3 },
    { id: 'm2', text: 'Completar 2 sessões de foco', done: focusToday >= 2, progress: Math.min(focusToday, 2), total: 2 },
    { id: 'm3', text: 'Criar uma nota', done: notesToday >= 1, progress: Math.min(notesToday, 1), total: 1 },
  ];
}

function checkDailyMissions() {
  const missions = getDailyMissions();
  const allDone = missions.every(m => m.done);
  const g = Storage.getGamification();
  const today = todayStr();

  if (allDone && g.lastMissionDate !== today) {
    g.lastMissionDate = today;
    Storage.setGamification(g);
    addXP(XP_REWARDS.MISSION_COMPLETE, 'missions');
    addCoins(COIN_REWARDS.MISSION_COMPLETE);
    showToast('🎉 Missões do dia completas! +100XP +50🪙');
  }
}

function renderMissions() {
  const missions = getDailyMissions();
  const card = document.getElementById('missionsCard');
  const badge = document.getElementById('missionBadge');
  if (!card) return;

  const doneCount = missions.filter(m => m.done).length;
  if (badge) badge.textContent = `${doneCount}/3`;

  card.innerHTML = missions.map(m => `
    <div class="mission-row">
      <div class="mission-check ${m.done ? 'done' : ''}">
        ${m.done ? '<i class="ti ti-check"></i>' : ''}
      </div>
      <div class="mission-text ${m.done ? 'done' : ''}">${m.text} (${m.progress}/${m.total})</div>
    </div>
  `).join('') + `
    <div class="mission-rewards">
      <span class="reward-tag r-xp">+100 XP</span>
      <span class="reward-tag r-coin">+50 🪙</span>
    </div>
  `;
}

// ---- AI INSIGHT ----
function updateAIInsight() {
  const tasks = Storage.getTasks();
  const pomo = Storage.getPomodoro();
  const g = Storage.getGamification();
  const s = Storage.getStreak();
  const today = todayStr();

  const doneTodayCount = tasks.filter(t => t.done && t.doneAt && t.doneAt.startsWith(today)).length;
  const pendingCount = tasks.filter(t => !t.done).length;

  const insights = [];

  if (doneTodayCount === 0 && pendingCount > 0) {
    insights.push(`Você tem <strong>${pendingCount} tarefas pendentes</strong>. Que tal começar com a mais fácil para ganhar impulso?`);
  } else if (doneTodayCount >= 3) {
    insights.push(`Incrível! Você já concluiu <strong>${doneTodayCount} tarefas hoje</strong>. Continue assim! 🚀`);
  }

  if (s.current >= 3) {
    insights.push(`<strong>${s.current} dias seguidos</strong> de produtividade! Seu recorde é ${s.best} dias.`);
  }

  if (pomo.totalSessions > 0 && pomo.totalMinutes > 0) {
    insights.push(`Você acumulou <strong>${pomo.totalMinutes} minutos focados</strong> no total. Excelente dedicação!`);
  }

  if (g.level >= 3) {
    insights.push(`Você está no <strong>nível ${g.level}</strong>. Mais ${getLevelInfo(g.xp).xpToNext - getLevelInfo(g.xp).xpInLevel} XP para subir!`);
  }

  if (insights.length === 0) {
    insights.push('Bem-vindo! Complete tarefas e sessões de foco para ganhar XP e subir de nível. 🌟');
  }

  const aiText = document.getElementById('aiText');
  if (aiText) {
    aiText.innerHTML = insights[Math.floor(Math.random() * insights.length)];
  }
}

function updatePetMood() {
  const tasks = Storage.getTasks();
  const today = todayStr();
  const doneToday = tasks.filter(t => t.done && t.doneAt && t.doneAt.startsWith(today)).length;
  const pomo = Storage.getPomodoro();
  const s = Storage.getStreak();

  const moods = [];
  if (doneToday === 0) moods.push('😴 Com sono... me ajude com uma tarefa!');
  if (doneToday >= 1) moods.push('😊 Feliz e pronto para focar!');
  if (doneToday >= 3) moods.push('😄 Adorando sua produtividade hoje!');
  if (s.current >= 7) moods.push('🎉 Comemorando sua sequência incrível!');
  if ((pomo.sessionsToday || 0) >= 2) moods.push('🧘 Você está arrasando no foco!');

  const el = document.getElementById('petMoodText');
  if (el) el.textContent = moods[moods.length - 1] || '😊 Feliz e pronto para focar!';
}

// ============ MASCOT EMOTIONAL STATES ============

const MOODS = {
  sleeping: {
    emoji: '😴',
    text: 'Com sono... me dê uma tarefa!',
    eyeRx: 6, eyeRy: 2,          // closed eyes (flat ellipse)
    mouthPath: 'M44 58 Q50 60 56 58', // small neutral
    color1: '#8e8aad', color2: '#5a5680',
    particles: [],
    animation: 'slowBob',
  },
  happy: {
    emoji: '😊',
    text: 'Feliz e pronto para focar!',
    eyeRx: 6.5, eyeRy: 8.5,
    mouthPath: 'M42 57 Q50 64 58 57',
    color1: '#a29bfe', color2: '#6c5ce7',
    particles: [],
    animation: 'bob',
  },
  thinking: {
    emoji: '🤔',
    text: 'Hmm... planejando algo?',
    eyeRx: 6.5, eyeRy: 8.5,
    mouthPath: 'M44 59 Q50 57 56 59',
    color1: '#74b9ff', color2: '#0984e3',
    particles: ['💭'],
    animation: 'bob',
  },
  celebrating: {
    emoji: '🎉',
    text: 'UHUUUL! Incrível!!',
    eyeRx: 6.5, eyeRy: 9,
    mouthPath: 'M40 55 Q50 66 60 55',
    color1: '#fd79a8', color2: '#e84393',
    particles: ['⭐','🎉','✨','🌟'],
    animation: 'bounce',
  },
  sad: {
    emoji: '😢',
    text: 'Você sumiu... saudade...',
    eyeRx: 6.5, eyeRy: 8.5,
    mouthPath: 'M42 62 Q50 56 58 62',
    color1: '#636e72', color2: '#2d3436',
    particles: ['💧'],
    animation: 'slowBob',
  },
  focused: {
    emoji: '🧘',
    text: 'No modo foco total!',
    eyeRx: 5, eyeRy: 4,          // squinting/focused eyes
    mouthPath: 'M44 58 Q50 61 56 58',
    color1: '#00cec9', color2: '#00b894',
    particles: ['⚡'],
    animation: 'bob',
  },
  excited: {
    emoji: '🤩',
    text: 'Você está ARRASANDO hoje!',
    eyeRx: 7, eyeRy: 9,
    mouthPath: 'M39 54 Q50 67 61 54',
    color1: '#fdcb6e', color2: '#e17055',
    particles: ['⭐','💫','🔥','✨'],
    animation: 'bounce',
  },
};

let currentMoodKey = 'happy';
let particleInterval = null;

function determineMood() {
  const tasks   = Storage.getTasks();
  const today   = todayStr();
  const s       = Storage.getStreak();
  const pomo    = Storage.getPomodoro();
  const g       = Storage.getGamification();

  const doneToday   = tasks.filter(t => t.done && t.doneAt && t.doneAt.startsWith(today)).length;
  const focusToday  = pomo.lastSessionDate === today ? (pomo.sessionsToday || 0) : 0;
  const now         = new Date();
  const hour        = now.getHours();
  const pending     = tasks.filter(t => !t.done).length;

  // Sleeping: late night or early morning with no activity
  if ((hour >= 23 || hour < 6) && doneToday === 0) return 'sleeping';

  // Sad: 2+ days inactive
  if (s.current === 0 && s.lastActiveDate) {
    const last = new Date(s.lastActiveDate);
    const diff = (now - last) / 86400000;
    if (diff >= 2) return 'sad';
  }

  // Celebrating: just hit daily goal or level up recently
  if (doneToday >= (Storage.getUser()?.dailyGoal || 5)) return 'celebrating';

  // Excited: 5+ done today or 3+ focus sessions
  if (doneToday >= 5 || focusToday >= 3 || s.current >= 7) return 'excited';

  // Focused: currently in a pomo session
  if (window._pomoRunning) return 'focused';

  // Thinking: has pending tasks but none done today
  if (pending > 0 && doneToday === 0) return 'thinking';

  // Happy: default
  return 'happy';
}

function renderMascotSVG(moodKey) {
  const mood = MOODS[moodKey] || MOODS.happy;

  // Dashboard mascot
  const container = document.querySelector('.mascot-float');
  if (!container) return;

  container.innerHTML = `
    <svg width="90" height="90" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="moodGrad_${moodKey}" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${mood.color1}"/>
          <stop offset="100%" stop-color="${mood.color2}"/>
        </radialGradient>
      </defs>
      <!-- Shadow -->
      <ellipse cx="50" cy="85" rx="22" ry="5" fill="rgba(0,0,0,0.2)"/>
      <!-- Body -->
      <circle cx="50" cy="50" r="32" fill="url(#moodGrad_${moodKey})"/>
      <!-- Left eye -->
      <ellipse cx="37" cy="44" rx="6.5" ry="${mood.eyeRy}" fill="white" opacity="0.92"/>
      <!-- Right eye -->
      <ellipse cx="63" cy="44" rx="6.5" ry="${mood.eyeRy}" fill="white" opacity="0.92"/>
      ${mood.eyeRy > 3 ? `
      <!-- Pupils -->
      <circle cx="37" cy="45" r="4" fill="#2d1f7a"/>
      <circle cx="63" cy="45" r="4" fill="#2d1f7a"/>
      <!-- Shine -->
      <circle cx="38.5" cy="43" r="1.4" fill="white"/>
      <circle cx="64.5" cy="43" r="1.4" fill="white"/>
      ` : `
      <!-- Closed/squinting eyes -->
      <path d="M31 44 Q37 ${moodKey==='sleeping'?'48':'41'} 43 44" stroke="#2d1f7a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M57 44 Q63 ${moodKey==='sleeping'?'48':'41'} 69 44" stroke="#2d1f7a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      `}
      <!-- Mouth -->
      <path d="${mood.mouthPath}" stroke="white" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      ${moodKey === 'sad' ? '<circle cx="35" cy="62" r="2.5" fill="#74b9ff" opacity="0.8"/><circle cx="65" cy="62" r="2.5" fill="#74b9ff" opacity="0.8"/>' : ''}
      ${moodKey === 'celebrating' || moodKey === 'excited' ? '<circle cx="32" cy="52" r="4" fill="rgba(255,255,255,0.3)"/><circle cx="68" cy="52" r="4" fill="rgba(255,255,255,0.3)"/>' : ''}
      <!-- Ears/antenna -->
      <ellipse cx="50" cy="22" rx="9" ry="11" fill="url(#moodGrad_${moodKey})"/>
      <circle cx="45" cy="18" r="3.5" fill="#fd79a8"/>
      <circle cx="55" cy="18" r="3.5" fill="#fd79a8"/>
      ${moodKey === 'sleeping' ? '<text x="58" y="20" font-size="14">💤</text>' : ''}
      ${moodKey === 'thinking' ? '<text x="62" y="18" font-size="12">💭</text>' : ''}
    </svg>`;

  // Update animation class
  container.className = 'mascot-float';
  if (mood.animation === 'bounce') container.classList.add('mascot-bounce');
  else if (mood.animation === 'slowBob') container.classList.add('mascot-slow');

  // Particles
  startParticles(mood.particles);
}

function startParticles(emojis) {
  if (particleInterval) clearInterval(particleInterval);
  const wrap = document.querySelector('.mascot-dashboard-wrap');
  if (!wrap || emojis.length === 0) return;

  particleInterval = setInterval(() => {
    const p = document.createElement('div');
    p.className = 'mood-particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = (30 + Math.random() * 40) + '%';
    p.style.top  = '30%';
    wrap.appendChild(p);
    setTimeout(() => p.remove(), 1800);
  }, 700);
}

function updatePetMood() {
  const moodKey = determineMood();
  currentMoodKey = moodKey;
  const mood = MOODS[moodKey];

  renderMascotSVG(moodKey);

  const moodEl = document.getElementById('petMoodText');
  if (moodEl) moodEl.textContent = `${mood.emoji} ${mood.text}`;

  // Update glow color
  const glow = document.querySelector('.mascot-glow');
  if (glow) glow.style.background = `radial-gradient(circle, ${mood.color1}40, transparent)`;
}
