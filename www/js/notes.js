// ============ NOTES MODULE ============

function openNoteModal(noteId = null) {
  const overlay = document.getElementById('noteModalOverlay');
  const titleInput = document.getElementById('noteTitleInput');
  const bodyInput = document.getElementById('noteBodyInput');
  const tagSelect = document.getElementById('noteTagSelect');
  const editId = document.getElementById('noteEditId');

  if (noteId) {
    const note = Storage.getNotes().find(n => n.id === noteId);
    if (!note) return;
    titleInput.value = note.title;
    bodyInput.value = note.body;
    tagSelect.value = note.tag;
    editId.value = noteId;
  } else {
    titleInput.value = '';
    bodyInput.value = '';
    tagSelect.value = '💡 Ideia';
    editId.value = '';
  }

  overlay.classList.add('open');
  setTimeout(() => titleInput.focus(), 350);
}

function saveNote() {
  const title = document.getElementById('noteTitleInput').value.trim();
  const body = document.getElementById('noteBodyInput').value.trim();
  if (!title) { showToast('Digite o título da nota'); return; }

  const editId = document.getElementById('noteEditId').value;
  const now = new Date().toISOString();

  if (editId) {
    Storage.updateNote(editId, {
      title, body,
      tag: document.getElementById('noteTagSelect').value,
      updatedAt: now,
    });
    showToast('📝 Nota atualizada!');
  } else {
    const note = {
      id: generateId(),
      title, body,
      tag: document.getElementById('noteTagSelect').value,
      createdAt: now,
      updatedAt: now,
    };
    Storage.addNote(note);

    // XP e conquista
    addXP(XP_REWARDS.NOTE_CREATED, 'note');
    const g = Storage.getGamification();
    g.totalNotes = (g.totalNotes || 0) + 1;
    Storage.setGamification(g);
    checkAchievements();
    showToast(`📝 Nota criada! +${XP_REWARDS.NOTE_CREATED} XP`);
    renderMissions();
    checkDailyMissions();
  }

  closeModal('noteModalOverlay');
  renderNotes();
}

function deleteNote(id) {
  if (!confirm('Excluir esta nota?')) return;
  Storage.deleteNote(id);
  renderNotes();
  showToast('🗑️ Nota excluída');
}

function renderNotes() {
  const list = document.getElementById('noteList');
  const emptyEl = document.getElementById('noteEmpty');
  if (!list) return;

  const query = (document.getElementById('noteSearch')?.value || '').toLowerCase();
  let notes = Storage.getNotes();

  if (query) {
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(query) ||
      n.body.toLowerCase().includes(query) ||
      n.tag.toLowerCase().includes(query)
    );
  }

  if (notes.length === 0) {
    list.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  list.innerHTML = notes.map(note => {
    const date = new Date(note.updatedAt || note.createdAt);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `
      <div class="note-item" onclick="openNoteModal('${note.id}')">
        <div class="note-item-head">
          <span class="note-tag-pill">${escapeHtml(note.tag)}</span>
          <span class="note-date">${dateStr}</span>
        </div>
        <div class="note-title">${escapeHtml(note.title)}</div>
        ${note.body ? `<div class="note-preview">${escapeHtml(note.body)}</div>` : ''}
        <div class="note-footer">
          <button class="note-del-btn" onclick="event.stopPropagation(); deleteNote('${note.id}')" title="Excluir">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}
