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

export function writeSlot(slotId, save) {
  save.slotId = slotId;
  localStorage.setItem(key(`slot-${slotId}`), serializeSave(save));
}

export function autosave(save) {
  const prev = localStorage.getItem(key('autosave'));
  if (prev) localStorage.setItem(key('backup'), prev);
  localStorage.setItem(key('autosave'), serializeSave(save));
}

export function deleteSlot(slotId) {
  localStorage.removeItem(key(`slot-${slotId}`));
}

export function copySlot(from, to) {
  const save = readSlot(from);
  if (!save) return false;
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
  writeSlot(slotId, save);
  return save;
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
  const save = blankSave(slotId, profileName);
  writeSlot(slotId, save);
  return save;
}

export { blankSave, migrateSave, SAVE_VERSION };
