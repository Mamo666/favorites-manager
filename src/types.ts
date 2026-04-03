// ─── Enums ────────────────────────────────────────────────────────────────────

export enum FavoriteKind {
  File   = 'file',
  Folder = 'folder',
}

export enum ItemHealth {
  Ok      = 'ok',
  Missing = 'missing',
  Unknown = 'unknown',
}

// ─── Core data shapes (persisted to globalState) ─────────────────────────────

/** One pinned file or folder */
export interface FavoriteItem {
  id:        string;        // UUID, stable across renames
  kind:      FavoriteKind;
  fsPath:    string;        // Absolute path (OS-native separators)
  alias:     string | null; // User-set nickname; null = use basename
  groupId:   string | null; // null = "Ungrouped"
  addedAt:   number;        // Date.now() timestamp
  sortOrder: number;        // Manual ordering index within a group
}

/** One group node */
export interface FavoriteGroup {
  id:        string;
  label:     string;
  parentId:  string | null; // null = top-level; supports one level of nesting
  collapsed: boolean;       // Persisted collapse state
  sortOrder: number;
}

/** Top-level storage shape — the single object stored in globalState */
export interface FavoritesData {
  version: number;          // Schema version, start at 1; used for migrations
  groups:  FavoriteGroup[];
  items:   FavoriteItem[];
}

// ─── Runtime-only (not persisted) ────────────────────────────────────────────

/** FavoriteItem augmented with live health status */
export interface FavoriteItemRuntime extends FavoriteItem {
  health: ItemHealth;
}

// ─── Command argument types ───────────────────────────────────────────────────

export interface TreeNodeArg {
  kind: 'item' | 'group';
  id:   string;
}
