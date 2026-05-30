// ============ PWA MODULE ============

// ---- SERVICE WORKER REGISTRATION ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[SW] Registrado:', reg.scope);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('🔄 Atualização disponível! Recarregue o app.');
            }
          });
        });
      })
      .catch(err => console.warn('[SW] Falha no registro:', err));
  });
}

// ---- INSTALL PROMPT ----
let deferredPrompt = null;
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');
const installClose = document.getElementById('installClose');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;

  // Only show if not dismissed before
  const dismissed = localStorage.getItem('focuslife_install_dismissed');
  if (!dismissed) {
    setTimeout(() => {
      if (installBanner) installBanner.classList.add('show');
    }, 3000); // Show after 3s so user can see the app first
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    installBanner.classList.remove('show');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('🎉 FocusLife instalado com sucesso!');
    }
    deferredPrompt = null;
  });
}

if (installClose) {
  installClose.addEventListener('click', () => {
    installBanner.classList.remove('show');
    localStorage.setItem('focuslife_install_dismissed', '1');
  });
}

// Detect when installed as PWA
window.addEventListener('appinstalled', () => {
  installBanner.classList.remove('show');
  deferredPrompt = null;
  showToast('✅ App instalado! Abra pela tela inicial.');
});

// ---- NOTIFICATIONS ----
const notifBanner = document.getElementById('notifBanner');
const notifYes = document.getElementById('notifYes');
const notifNo = document.getElementById('notifNo');

function checkNotifPermission() {
  if (!('Notification' in window)) return;
  const asked = localStorage.getItem('focuslife_notif_asked');
  if (asked) return;

  // Show banner after 8s
  setTimeout(() => {
    if (Notification.permission === 'default' && notifBanner) {
      notifBanner.classList.add('show');
    }
  }, 8000);
}

if (notifYes) {
  notifYes.addEventListener('click', async () => {
    notifBanner.classList.remove('show');
    localStorage.setItem('focuslife_notif_asked', '1');
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('🔔 Notificações ativadas!');
      sendTestNotification();
    }
  });
}

if (notifNo) {
  notifNo.addEventListener('click', () => {
    notifBanner.classList.remove('show');
    localStorage.setItem('focuslife_notif_asked', '1');
  });
}

function sendTestNotification() {
  if (Notification.permission !== 'granted') return;
  setTimeout(() => {
    new Notification('FocusLife 🎯', {
      body: 'Notificações ativas! Você será avisado quando o Pomodoro terminar.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
    });
  }, 1000);
}

// ---- POMODORO NOTIFICATION ----
function sendPomoNotification(title, body) {
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'pomo',
    renotify: true,
  });
}

// Expose globally so pomodoro.js can call it
window.sendPomoNotification = sendPomoNotification;

// ---- ONLINE/OFFLINE STATUS ----
function updateOnlineStatus() {
  if (!navigator.onLine) {
    showToast('📴 Offline — dados salvos localmente');
  }
}
window.addEventListener('online', () => showToast('🌐 Conexão restaurada'));
window.addEventListener('offline', () => showToast('📴 Offline — funcionando normalmente'));

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  checkNotifPermission();
  updateOnlineStatus();

  // Handle PWA shortcuts (?action=...)
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  if (action === 'new-task') {
    setTimeout(() => {
      goScreen('tasks');
      openTaskModal();
    }, 500);
  } else if (action === 'focus') {
    setTimeout(() => goScreen('focus'), 500);
  }
});
