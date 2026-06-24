export const COLORS = {
  spawn: 0x4caf50,
  exit: 0xf44336,
  key: 0xffc107,
  treasure: 0x9c27b0,
  connector: 0x78909c,
  corridor: 0xb0bec5,
  lockedDoor: 0xff5722,
  room: 0x37474f,
  background: 0x212121,
};

/** CSS hex strings for UI legend (kept in sync with COLORS). */
export const COLOR_HEX = {
  spawn: '#4caf50',
  exit: '#f44336',
  key: '#ffc107',
  treasure: '#9c27b0',
  connector: '#78909c',
  corridor: '#b0bec5',
  lockedDoor: '#ff5722',
  room: '#37474f',
};

/** Human-readable labels for room types and map elements. */
export const TYPE_LABELS = {
  spawn: 'Spawn',
  exit: 'Exit',
  key: 'Key',
  treasure: 'Treasure',
  connector: 'Connector',
  corridor: 'Corridor',
  lockedDoor: 'Locked door',
  room: 'Room',
};

/** Sidebar / overlay legend entries in display order. */
export const LEGEND_ITEMS = [
  { key: 'spawn', label: TYPE_LABELS.spawn },
  { key: 'exit', label: TYPE_LABELS.exit },
  { key: 'key', label: TYPE_LABELS.key },
  { key: 'treasure', label: TYPE_LABELS.treasure },
  { key: 'connector', label: TYPE_LABELS.connector },
  { key: 'corridor', label: TYPE_LABELS.corridor },
  { key: 'lockedDoor', label: TYPE_LABELS.lockedDoor },
  { key: 'room', label: TYPE_LABELS.room },
];
