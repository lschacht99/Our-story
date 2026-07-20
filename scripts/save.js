// Browser save manager: three DS-style slots + autosave + backup,
// export/import, migrations on load.
import { blankSave, migrateSave, serializeSave, deserializeSave, SAVE_VERSION } from './save-core.js';

const PREFIX = 'ourstory';
const LEGACY_KEY = 'hamsa-missing-journey-png-v2';
export const SLOT_IDS = [1, 2, 3];

function key(name) { return `${PREFIX}-${name}`; }

export function readSlot(slotId) {
  const text = localStorage.getItem(key(`slot-${slotId}`));
  if (!text) return null;
  return deserializeSave(text);
}

export function readAutosave() {
  const text = localStorage.getItem(key('autosave'));
  return text ? deserializeSave(text) : null;
}

export function readBackup() {
  const text = localStorage.getItem(key('backup'));
  return text ? deserializeSave(text) : null;
}

export function readSlotBackup(slotId) {
  const text = localStorage.getItem(key(`slot-${slotId}-backup`));
  return text ? deserializeSave(text) : null;
}

function stamped(save) {
  save.lastSavedAt = new Date().toISOString();
  return serializeSave(save);
}

export function writeSlot(slotId, save) {
  save.slotId = slotId;
  const slotKey = key(`slot-${slotId}`);
  const text = stamped(save);
  if (!deserializeSave(text)) throw new Error('Save validation failed');
  localStorage.setItem(slotKey, text);
  return save.lastSavedAt;
}

// Preserve a meaningful checkpoint before scene transitions, puzzle awards,
// imports or overwrites. Ordinary draft keystrokes must never rotate recovery.
export function checkpointSlot(slotId) {
  const previous = localStorage.getItem(key(`slot-${slotId}`));
  if (!previous || !deserializeSave(previous)) return false;
  localStorage.setItem(key(`slot-${slotId}-backup`), previous);
  return true;
}

export function autosave(save) {
  const prev = localStorage.getItem(key('autosave'));
  if (prev) localStorage.setItem(key('backup'), prev);
  localStorage.setItem(key('autosave'), stamped(save));
  return save.lastSavedAt;
}

export function manualSave(save) {
  if (!save?.slotId || !SLOT_IDS.includes(Number(save.slotId))) return null;
  writeSlot(Number(save.slotId), save);
  autosave(save);
  return save.lastSavedAt;
}

export function deleteSlot(slotId) {
  localStorage.removeItem(key(`slot-${slotId}`));
  localStorage.removeItem(key(`slot-${slotId}-backup`));
}

export function copySlot(from, to) {
  const save = readSlot(from);
  if (!save) return false;
  checkpointSlot(to);
  writeSlot(to, { ...save });
  return true;
}

export function renameSlot(slotId, name) {
  const save = readSlot(slotId);
  if (!save) return false;
  save.profileName = String(name || 'Nomads').slice(0, 24);
  writeSlot(slotId, save);
  return true;
}

export function exportSlot(slotId) {
  const save = readSlot(slotId);
  return save ? serializeSave(save) : null;
}

export function importToSlot(slotId, text) {
  const save = deserializeSave(text);
  if (!save) return null;
  checkpointSlot(slotId);
  writeSlot(slotId, save);
  return save;
}

export function restoreSlotBackup(slotId) {
  const backup = readSlotBackup(slotId);
  if (!backup) return null;
  writeSlot(slotId, backup);
  return backup;
}

// One-time adoption of the old chapter-1 prototype save, if present and
// no new-format slot exists yet. Never erases the legacy blob on failure.
export function adoptLegacySave() {
  if (SLOT_IDS.some((id) => readSlot(id))) return null;
  const text = localStorage.getItem(LEGACY_KEY);
  if (!text) return null;
  try {
    const migrated = migrateSave(JSON.parse(text));
    if (migrated) {
      writeSlot(1, migrated);
      return migrated;
    }
  } catch { /* leave legacy data untouched */ }
  return null;
}

export function newGame(slotId, profileName) {
  checkpointSlot(slotId);
  const save = blankSave(slotId, profileName);
  writeSlot(slotId, save);
  return save;
}

export { blankSave, migrateSave, SAVE_VERSION };
