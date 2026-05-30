// ============ APP CONTROLLER ============

// ---- ONBOARDING ----
let selectedFocus = '';
let dailyGoal = 5;

function adjustGoal(delta) {
  dailyGoal = Math.max(1, Math.min(20, dailyGoal + delta));
  document.getElementById('goalVal').textContent = dailyGoal;
}

function submitOnboarding() {
  const name = document.getElementById('ob-name').value.trim();
  if (!name) { showToast('Digite seu nome para continuar'); return; }
  if (!selectedFocus) { showToast('Escolha seu foco principal'); return; }

  const user = { name, focus: selectedFocus, dailyGoal, createdAt: new Date().toISOString() };
  Storage.setUser(user);
  launchApp();
}

// ---- LAUNCH ----
function launchApp() {
  document.getElementById('page-onboarding').classList.remove('active');
  const appPage = document.getElementById('page-app');
  appPage.classList.add('active');
  // Force reflow so transition plays
  appPage.offsetHeight;
  initApp();
}

function initApp() {
  const user = Storage.getUser();
  if (!user) return;

  const el = id => document.getElementById(id);

  // Top bar
  if (el('topGreeting')) el('topGreeting').textContent = getGreeting() + ',';
  if (el('topName'))     el('topName').textContent = user.name + ' 👋';

  updateGamificationUI();
  updateDashboardStats();
  updateAIInsight();
  updatePetMood();
  renderMissions();
  renderHomePending();
  renderTasks();
  renderNotes();
  initPomodoro();
  initAlarms();

  // Focus sessions today
  const pomo = Storage.getPomodoro();
  const today = todayStr();
  const focusEl = el('statFocusToday');
  if (focusEl) focusEl.textContent = pomo.lastSessionDate === today ? (pomo.sessionsToday || 0) : 0;
}

// ---- NAVIGATION ----
function goScreen(name, btn) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // Show target screen
  const screen = document.getElementById('screen-' + name);
  if (screen) screen.classList.add('active');

  // Update bottom nav active state
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const targetBtn = btn || document.querySelector(`.nav-btn[data-screen="${name}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  // Refresh screen data
  switch (name) {
    case 'home':
      updateDashboardStats();
      updateAIInsight();
      updatePetMood();
      renderMissions();
      renderHomePending();
      updateGamificationUI();
      break;
    case 'tasks':
      renderTasks();
      break;
    case 'notes':
      renderNotes();
      break;
    case 'focus':
      renderPomoStats();
      break;
    case 'alarms':
      renderAlarms();
      renderAlarmSuggestions();
      updateAlarmAiText();
      break;
    case 'stats':
      renderStats();
      break;
  }
}

// ---- MODALS ----
function closeModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) el.classList.remove('open');
}

function closeModalOutside(event, overlayId) {
  if (event.target.id === overlayId) closeModal(overlayId);
}

// ---- TOAST ----
let toastTimeout = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2800);
}

// ---- BOOT ----
window.addEventListener('DOMContentLoaded', () => {
  // Wire up focus chips (onboarding)
  document.querySelectorAll('.focus-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.focus-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedFocus = btn.dataset.val;
    });
  });

  const user = Storage.getUser();
  if (user) {
    // Skip onboarding — go straight to app
    document.getElementById('page-onboarding').classList.remove('active');
    document.getElementById('page-app').classList.add('active');
    initApp();
  }
  // else: onboarding stays visible (default .active is on it in HTML)
});
