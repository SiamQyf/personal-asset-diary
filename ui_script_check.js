
// ── State ──────────────────────────────────────────────
let allFolders = [];
let currentFolderId = null;
let selectedStyleId = null;
let selectedFrameInfo = null;
let selectedFramesInfo = [];
let pendingModalAction = null;

// Default preview/generate configuration used by `requestPreview` and `generateFooter`.
// Update these values to change the default content used for previews and generated footers.
const DEFAULT_PREVIEW_CONFIG = {
  company: 'Logo',
  tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  accent: '#6C63FF',
  newsletter: false,
  copyright: false,
  socials: [],
  iconStyle: 'circle',
  separatorType: 'none',
  customSvgs: {},
};

// ── View Navigation ─────────────────────────────────────
function showFolderList() {
  currentFolderId = null;
  selectedStyleId = null;
  document.getElementById('folderListView').classList.add('active');
  document.getElementById('folderDetailView').classList.remove('active');
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('headerBreadcrumb').textContent = 'Manage Collections';
  parent.postMessage({ pluginMessage: { type: 'request-styles' } }, '*');
}

function showFolderDetail(folderId) {
  const folder = allFolders.find(f => f.folderId === folderId);
  if (!folder) return;
  
  currentFolderId = folderId;
  selectedStyleId = null;
  document.getElementById('folderListView').classList.remove('active');
  document.getElementById('folderDetailView').classList.add('active');
  document.getElementById('backBtn').style.display = 'block';
  document.getElementById('headerBreadcrumb').textContent = folder.name;
  updateSelectedFrameCard();
  parent.postMessage({ pluginMessage: { type: 'request-styles' } }, '*');
}

// ── UI Updates ────────────────────────────────────────
function updateFoldersList() {
  const grid = document.getElementById('foldersGrid');
  const noMsg = document.getElementById('noFoldersMsg');
  const archivedGrid = document.getElementById('archivedGrid');
  const noArchivedMsg = document.getElementById('noArchivedMsg');
  
  // Clear both grids
  grid.querySelectorAll('.card[data-folder-id]').forEach(c => c.remove());
  archivedGrid.querySelectorAll('.card[data-folder-id]').forEach(c => c.remove());

  if (!allFolders || !allFolders.length) {
    noMsg.style.display = 'block';
    noArchivedMsg.style.display = 'none';
    return;
  }

  noMsg.style.display = 'none';
  // Sort by folder name before rendering active and archived lists.
  const folders = allFolders.slice().sort((a, b) => {
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      sensitivity: 'base',
      numeric: true
    });
  });
  let anyArchived = false;
  folders.forEach(folder => {
    const card = document.createElement('div');
    const isArchived = !!folder.archived;
    if (isArchived) card.className = 'card archived'; else card.className = 'card';
    card.setAttribute('data-folder-id', folder.folderId);

    const count = folder.styles ? folder.styles.length : 0;
    const archiveBtnLabel = isArchived ? 'Unarchive' : 'Archive';
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${escapeHtml(folder.name)}${isArchived ? ' <span style="font-size:10px;color:#8888AA;margin-left:6px">(archived)</span>' : ''}</div>
        <div class="card-actions">
          <button class="card-btn" onclick="event.stopPropagation(); showRenameFolderModal('${folder.folderId}')">Rename</button>
          <button class="card-btn" onclick="event.stopPropagation(); showArchiveFolderModal('${folder.folderId}')">${archiveBtnLabel}</button>
          <button class="card-btn" onclick="event.stopPropagation(); showDeleteFolderModal('${folder.folderId}')" style="color:#FCA5A5;border-color:#8B4545">Delete</button>
        </div>
      </div>
      <div class="card-meta">${count} footer${count !== 1 ? 's' : ''}</div>
    `;

    card.onclick = () => showFolderDetail(folder.folderId);
    if (isArchived) { archivedGrid.appendChild(card); anyArchived = true; } else { grid.appendChild(card); }
  });

  noArchivedMsg.style.display = anyArchived ? 'none' : 'block';
}

function updateStylesList() {
  const folder = allFolders.find(f => f.folderId === currentFolderId);
  if (!folder) return;
  
  const grid = document.getElementById('stylesGrid');
  const noMsg = document.getElementById('noStylesMsg');
  
  grid.querySelectorAll('.card[data-style-id]').forEach(c => c.remove());
  
  const styles = folder.styles || [];
  if (!styles.length) {
    noMsg.style.display = 'block';
    return;
  }
  
  noMsg.style.display = 'none';
  
  styles.forEach(style => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-style-id', style.styleId);
    
    card.innerHTML = `
      <div class="preview-box">
        <img class="thumb" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="preview-${style.styleId}" />
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
        <div style="font-size:12px;font-weight:700;color:#fff;flex:1">${escapeHtml(style.title)}</div>
        <button type="button" class="card-btn" onclick="event.stopPropagation(); showDeleteStyleModal('${style.styleId}')">Delete</button>
      </div>
      <div style="font-size:10px;color:#8888AA">Saved ${new Date(style.createdAt).toLocaleDateString()}</div>
    `;
    
    card.classList.toggle('active', selectedStyleId === style.styleId);
    card.onclick = () => pickStyle(style.styleId, card);
    grid.appendChild(card);
    
    requestPreview(currentFolderId, style.styleId);
  });
}

function pickStyle(styleId, element) {
  document.querySelectorAll('#stylesGrid .card').forEach(c => c.classList.remove('active'));
  element.classList.add('active');
  selectedStyleId = styleId;
}

function updateSelectedFrameCard() {
  const card = document.getElementById('selectedFrameCard');
  const frameName = document.getElementById('selectedFrameName');
  const frameSize = document.getElementById('selectedFrameSize');
  const addBtn = document.getElementById('addSelectedBtn');
  const addMultiBtn = document.getElementById('addSelectedMultiBtn');
  const framesList = document.getElementById('selectedFramesList');
  const frameListItems = document.getElementById('frameListItems');
  
  if (selectedFramesInfo && selectedFramesInfo.length > 1) {
    // Multiple frames selected
    card.style.display = 'block';
    frameName.textContent = `${selectedFramesInfo.length} frames selected`;
    frameSize.style.display = 'none';
    framesList.style.display = 'block';
    
    frameListItems.innerHTML = '';
    selectedFramesInfo.forEach((frame, index) => {
      const item = document.createElement('div');
      item.style.padding = '4px 0';
      item.textContent = `${index + 1}. ${frame.name} (${Math.round(frame.width)} × ${Math.round(frame.height)} px)`;
      frameListItems.appendChild(item);
    });
    
    addBtn.style.display = 'none';
    addMultiBtn.style.display = 'block';
  } else if (selectedFrameInfo) {
    // Single frame selected
    card.style.display = 'block';
    frameName.textContent = selectedFrameInfo.name;
    frameSize.textContent = `${Math.round(selectedFrameInfo.width)} × ${Math.round(selectedFrameInfo.height)} px`;
    frameSize.style.display = 'block';
    framesList.style.display = 'none';
    
    addBtn.style.display = 'block';
    addMultiBtn.style.display = 'none';
  } else {
    card.style.display = 'none';
  }
}

// ── Generate & Actions ─────────────────────────────────
function generateFooter() {
  const btn = document.getElementById('genBtn');
  
  if (!currentFolderId || !selectedStyleId) {
    btn.disabled = false;
    const status = document.getElementById('status');
    status.textContent = '✗ Select a footer style first';
    status.className = 'status err';
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Generating…';
  
  parent.postMessage({
    pluginMessage: {
      type: 'generate',
      folderId: currentFolderId,
      styleId: selectedStyleId,
      config: { ...DEFAULT_PREVIEW_CONFIG }
    }
  }, '*');
}

function addSelectedFooter() {
  if (!currentFolderId) {
    const status = document.getElementById('status');
    if (status) {
      status.textContent = '✗ Select a collection before saving.';
      status.className = 'status err';
    }
    return;
  }
  const status = document.getElementById('status');
  if (status) {
    status.textContent = 'Saving selection to collection…';
    status.className = 'status';
  }
  const addSelectedBtn = document.getElementById('addSelectedBtn');
  if (addSelectedBtn) {
    addSelectedBtn.disabled = true;
    addSelectedBtn.textContent = 'Saving…';
  }
  const driveFolderId = (document.getElementById('driveFolderId') || {}).value || '';
  const driveToken = (document.getElementById('driveToken') || {}).value || '';
  const refreshToken = (document.getElementById('refreshToken') || {}).value || '';
  const clientId = (document.getElementById('clientId') || {}).value || '';
  const clientSecret = (document.getElementById('clientSecret') || {}).value || '';
  parent.postMessage({
    pluginMessage: {
      type: 'add-selected-footer',
      folderId: currentFolderId,
      driveFolderId,
      driveToken,
      refreshToken,
      clientId,
      clientSecret
    }
  }, '*');
}

function addSelectedMultipleFooters() {
  if (!currentFolderId) {
    const status = document.getElementById('status');
    if (status) {
      status.textContent = '✗ Select a collection before saving.';
      status.className = 'status err';
    }
    return;
  }
  const status = document.getElementById('status');
  if (status) {
    status.textContent = 'Saving selections to collection…';
    status.className = 'status';
  }
  const addMultiBtn = document.getElementById('addSelectedMultiBtn');
  if (addMultiBtn) {
    addMultiBtn.disabled = true;
    addMultiBtn.textContent = 'Saving…';
  }
  const driveFolderId = (document.getElementById('driveFolderId') || {}).value || '';
  const driveToken = (document.getElementById('driveToken') || {}).value || '';
  const refreshToken = (document.getElementById('refreshToken') || {}).value || '';
  const clientId = (document.getElementById('clientId') || {}).value || '';
  const clientSecret = (document.getElementById('clientSecret') || {}).value || '';
  parent.postMessage({
    pluginMessage: {
      type: 'add-selected-footers',
      folderId: currentFolderId,
      driveFolderId,
      driveToken,
      refreshToken,
      clientId,
      clientSecret
    }
  }, '*');
}

function createNewFolder() {
  const input = document.getElementById('newFolderName');
  const name = input.value.trim();
  if (!name) {
    // Avoid alert() which can cause focus issues in some webviews.
    input.classList.add('input-error');
    input.focus();
    // remove the error indication after a short delay
    setTimeout(() => input.classList.remove('input-error'), 1400);
    return;
  }
  parent.postMessage({
    pluginMessage: { type: 'create-folder', name }
  }, '*');
  input.value = '';
}

// ── Modal Dialogs ──────────────────────────────────────
function showRenameFolderModal(folderId) {
  const folder = allFolders.find(f => f.folderId === folderId);
  if (!folder) return;
  
  pendingModalAction = (newName) => renameFolder(folderId, newName);
  document.getElementById('modalTitle').textContent = 'Rename Collection';
  document.getElementById('modalMessage').textContent = 'Enter a new name:';
  document.getElementById('modalInputField').style.display = 'block';
  const input = document.getElementById('modalInput');
  input.value = folder.name;
  input.focus();
  input.select();
  
  const btn = document.getElementById('modalConfirmBtn');
  btn.textContent = 'Rename';
  btn.className = 'modal-btn primary';
  
  document.getElementById('confirmModal').classList.add('active');
}

function showDeleteFolderModal(folderId) {
  const folder = allFolders.find(f => f.folderId === folderId);
  if (!folder) return;
  
  showConfirmModal(
    'Delete Collection?',
    `Are you sure you want to delete "${folder.name}" and all its footer styles? This cannot be undone.`,
    'Delete',
    () => deleteFolder(folderId),
    true
  );
}

function showArchiveFolderModal(folderId) {
  const folder = allFolders.find(f => f.folderId === folderId);
  if (!folder) return;
  if (folder.archived) {
    showConfirmModal(
      'Unarchive Collection?',
      `Unarchive "${folder.name}" and return it to the active list?`,
      'Unarchive',
      () => unarchiveFolder(folderId),
      false
    );
  } else {
    showConfirmModal(
      'Archive Collection?',
      `Archive "${folder.name}" to hide it from the list?`,
      'Archive',
      () => archiveFolder(folderId),
      false
    );
  }
}

function showDeleteStyleModal(styleId) {
  if (!currentFolderId) return;
  const folder = allFolders.find(f => f.folderId === currentFolderId);
  if (!folder) return;
  
  const style = folder.styles.find(s => s.styleId === styleId);
  if (!style) return;
  
  showConfirmModal(
    'Delete Footer?',
    `Are you sure you want to delete "${style.title}"? This cannot be undone.`,
    'Delete',
    () => deleteStyle(styleId),
    true
  );
}

function showConfirmModal(title, message, confirmText, confirmAction, isDanger) {
  pendingModalAction = confirmAction;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = message;
  
  const btn = document.getElementById('modalConfirmBtn');
  btn.textContent = confirmText;
  btn.className = `modal-btn ${isDanger ? 'danger' : 'primary'}`;
  
  document.getElementById('confirmModal').classList.add('active');
}

function closeModal() {
  document.getElementById('confirmModal').classList.remove('active');
  pendingModalAction = null;
}

function confirmModalAction() {
  if (pendingModalAction) {
    const inputField = document.getElementById('modalInputField');
    if (inputField.style.display !== 'none') {
      // Rename action with input
      const newName = document.getElementById('modalInput').value.trim();
      if (!newName) {
        alert('Please enter a name');
        return;
      }
      pendingModalAction(newName);
    } else {
      // Regular confirmation action
      pendingModalAction();
    }
  }
  closeModal();
}

function deleteFolder(folderId) {
  parent.postMessage({
    pluginMessage: { type: 'delete-folder', folderId }
  }, '*');
  showFolderList();
}

function archiveFolder(folderId) {
  parent.postMessage({
    pluginMessage: { type: 'archive-folder', folderId, archived: true }
  }, '*');
  updateFoldersList();
}

function unarchiveFolder(folderId) {
  parent.postMessage({
    pluginMessage: { type: 'archive-folder', folderId, archived: false }
  }, '*');
  updateFoldersList();
}

function renameFolder(folderId, newName) {
  parent.postMessage({
    pluginMessage: { type: 'rename-folder', folderId, newName }
  }, '*');
}

function deleteStyle(styleId) {
  if (!currentFolderId) return;
  parent.postMessage({
    pluginMessage: { type: 'delete-footer-style', folderId: currentFolderId, styleId }
  }, '*');
}

// ── API Communication ──────────────────────────────────
function requestPreview(folderId, styleId) {
  parent.postMessage({
    pluginMessage: {
      type: 'preview',
      folderId: folderId,
      styleId: styleId,
      config: { ...DEFAULT_PREVIEW_CONFIG }
    }
  }, '*');
}

function connectDrive() {
  const folderId = document.getElementById('driveFolderId').value.trim();
  const token = document.getElementById('driveToken').value.trim();
  const refreshToken = document.getElementById('refreshToken').value.trim();
  const clientId = document.getElementById('clientId').value.trim();
  const clientSecret = document.getElementById('clientSecret').value.trim();
  const remember = document.getElementById('saveDriveSettings').checked;
  const rememberToken = document.getElementById('saveToken').checked;
  const rememberRefreshToken = document.getElementById('saveRefreshToken').checked;
  const rememberClientId = document.getElementById('saveClientId').checked;
  const rememberClientSecret = document.getElementById('saveClientSecret').checked;
  const status = document.getElementById('driveStatus');
  if (!folderId || (!token && !refreshToken)) {
    status.textContent = 'Provide a live access token or refresh credentials';
    status.className = 'status err';
    return;
  }
  status.textContent = 'Checking...';
  status.className = 'status';
  parent.postMessage({ pluginMessage: { type: 'connect-drive', driveFolderId: folderId, driveToken: token, refreshToken, clientId, clientSecret, rememberDriveSettings: remember, rememberToken, rememberRefreshToken, rememberClientId, rememberClientSecret } }, '*');
}

// ── Message Handler ────────────────────────────────────
window.addEventListener('message', (e) => {
  const msg = e.data.pluginMessage;
  if (!msg) return;
  
  const btn = document.getElementById('genBtn');
  const status = document.getElementById('status');
  
  if (msg.type === 'success') {
    btn.disabled = false;
    btn.textContent = 'Generate Footer';
    status.textContent = '✓ Footer created on canvas!';
    status.className = 'status ok';
    setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
  }
  else if (msg.type === 'style-state') {
    allFolders = msg.folders || [];
    selectedFrameInfo = msg.selectedFrame;
    selectedFramesInfo = msg.selectedFrames || [];
    if (msg.driveConfig) {
      document.getElementById('driveFolderId').value = msg.driveConfig.folderId || '';
      document.getElementById('driveToken').value = msg.driveConfig.token || '';
      document.getElementById('refreshToken').value = msg.driveConfig.refreshToken || '';
      document.getElementById('clientId').value = msg.driveConfig.clientId || '';
      document.getElementById('clientSecret').value = msg.driveConfig.clientSecret || '';
      document.getElementById('saveDriveSettings').checked = !!msg.driveConfig.rememberDriveSettings;
      document.getElementById('saveToken').checked = !!msg.driveConfig.rememberToken;
      document.getElementById('saveRefreshToken').checked = !!msg.driveConfig.rememberRefreshToken;
      document.getElementById('saveClientId').checked = !!msg.driveConfig.rememberClientId;
      document.getElementById('saveClientSecret').checked = !!msg.driveConfig.rememberClientSecret;
    }
    updateSelectedFrameCard();
    updateFoldersList();
    if (currentFolderId) {
      updateStylesList();
    }
  }
  else if (msg.type === 'code-generated') {
    btn.disabled = false;
    btn.textContent = 'Generate Footer';
    const addBtn = document.getElementById('addSelectedBtn');
    const addMultiBtn = document.getElementById('addSelectedMultiBtn');
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = 'Save to Collection';
    }
    if (addMultiBtn) {
      addMultiBtn.disabled = false;
      addMultiBtn.textContent = 'Save All Selected';
    }
    status.textContent = msg.message || '✓ Selection saved as a new footer style.';
    status.className = 'status ok';
    parent.postMessage({ pluginMessage: { type: 'request-styles' } }, '*');
    setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 3000);
  }
  else if (msg.type === 'save-progress') {
    const status = document.getElementById('status');
    status.textContent = `Saving ${msg.current}/${msg.total}: ${msg.frameName}...`;
    status.className = 'status';
  }
  else if (msg.type === 'save-started') {
    status.textContent = msg.action === 'multi' ? 'Saving multiple selections…' : 'Saving selection…';
    status.className = 'status';
  }
  else if (msg.type === 'save-debug') {
    const status = document.getElementById('status');
    status.textContent = `DEBUG: ${msg.message}` + (msg.error ? ` — ${msg.error}` : '');
    status.className = 'status';
  }
  else if (msg.type === 'drive-connected') {
    const ds = document.getElementById('driveStatus');
    ds.textContent = '✓ Drive connected';
    ds.className = 'status ok';
    if (msg.driveConfig) {
      document.getElementById('driveFolderId').value = msg.driveConfig.folderId || '';
      document.getElementById('driveToken').value = msg.driveConfig.token || '';
      document.getElementById('refreshToken').value = msg.driveConfig.refreshToken || '';
      document.getElementById('clientId').value = msg.driveConfig.clientId || '';
      document.getElementById('clientSecret').value = msg.driveConfig.clientSecret || '';
      document.getElementById('saveDriveSettings').checked = !!msg.driveConfig.rememberDriveSettings;
      document.getElementById('saveToken').checked = !!msg.driveConfig.rememberToken;
      document.getElementById('saveRefreshToken').checked = !!msg.driveConfig.rememberRefreshToken;
      document.getElementById('saveClientId').checked = !!msg.driveConfig.rememberClientId;
      document.getElementById('saveClientSecret').checked = !!msg.driveConfig.rememberClientSecret;
    }
    setTimeout(() => { ds.textContent = ''; ds.className = 'status'; }, 2500);
  }
  else if (msg.type === 'error') {
    const ds = document.getElementById('driveStatus');
    status.textContent = '✗ ' + msg.message;
    status.className = 'status err';
    const btn = document.getElementById('genBtn');
    btn.disabled = false;
    btn.textContent = 'Generate Footer';
    const addBtn = document.getElementById('addSelectedBtn');
    const addMultiBtn = document.getElementById('addSelectedMultiBtn');
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = 'Save to Collection';
    }
    if (addMultiBtn) {
      addMultiBtn.disabled = false;
      addMultiBtn.textContent = 'Save All Selected';
    }
    if (ds) {
      ds.textContent = '✗ ' + msg.message;
      ds.className = 'status err';
    }
  }
  else if (msg.type === 'preview') {
    const img = document.querySelector(`.preview-box img[alt="preview-${msg.styleId}"]`);
    if (img) {
      img.src = 'data:image/png;base64,' + msg.data;
    }
  }
});

// ── Utilities ──────────────────────────────────────────
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return (text || '').replace(/[&<>"']/g, m => map[m]);
}

function attachPreviewBoxPanHandlers() {
}

// ── Init ───────────────────────────────────────────────
// Attach events safely — the element may not exist in some views.
const addSelectedBtn = document.getElementById('addSelectedBtn');
if (addSelectedBtn) addSelectedBtn.addEventListener('click', addSelectedFooter);

const addSelectedMultiBtn = document.getElementById('addSelectedMultiBtn');
if (addSelectedMultiBtn) addSelectedMultiBtn.addEventListener('click', addSelectedMultipleFooters);

showFolderList();
