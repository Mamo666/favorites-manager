import * as vscode from 'vscode';
import { FavoritesData, FavoriteItem, FavoriteGroup, FavoriteKind } from '../types';
import { STORAGE_KEY, SCHEMA_VERSION } from '../constants';
import { generateId } from '../utils/idUtils';

export class FavoritesStore {

  private data: FavoritesData;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.data = this.load();
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  private load(): FavoritesData {
    const raw = this.context.globalState.get<FavoritesData>(STORAGE_KEY);
    if (!raw) { return this.emptyData(); }
    return this.migrate(raw);
  }

  async save(): Promise<void> {
    await this.context.globalState.update(STORAGE_KEY, this.data);
  }

  private emptyData(): FavoritesData {
    return { version: SCHEMA_VERSION, groups: [], items: [] };
  }

  // ── Migration ─────────────────────────────────────────────────────────────

  private migrate(data: FavoritesData): FavoritesData {
    // Future schema upgrades go here as: if (data.version < N) { ... }
    data.version = SCHEMA_VERSION;
    return data;
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  getItems(): FavoriteItem[] { return this.data.items; }
  getGroups(): FavoriteGroup[] { return this.data.groups; }

  /** Returns null if path already exists (duplicate guard). */
  async addItem(
    fsPath: string,
    kind: FavoriteKind,
    groupId: string | null,
    alias?: string | null
  ): Promise<FavoriteItem | null> {
    const duplicate = this.data.items.find(
      i => i.fsPath === fsPath && i.groupId === (groupId ?? null)
    );
    if (duplicate) { return null; }

    const item: FavoriteItem = {
      id:        generateId(),
      kind,
      fsPath,
      alias:     alias?.trim() || null,
      groupId:   groupId ?? null,
      addedAt:   Date.now(),
      sortOrder: this.nextSortOrder(groupId),
    };
    this.data.items.push(item);
    await this.save();
    return item;
  }

  async removeItem(id: string): Promise<void> {
    this.data.items = this.data.items.filter(i => i.id !== id);
    await this.save();
  }

  async setAlias(id: string, alias: string | null): Promise<void> {
    const item = this.data.items.find(i => i.id === id);
    if (!item) { return; }
    item.alias = alias?.trim() || null;
    await this.save();
  }

  async moveItemToGroup(id: string, groupId: string | null): Promise<void> {
    const item = this.data.items.find(i => i.id === id);
    if (!item) { return; }
    item.groupId   = groupId;
    item.sortOrder = this.nextSortOrder(groupId);
    await this.save();
  }

  /**
   * Move item to targetGroupId and insert it before insertBeforeId.
   * Pass null for insertBeforeId to append at the end.
   * Re-normalises sortOrder (0, 1, 2, …) for all items in the target group.
   */
  async reorderItem(
    id: string,
    targetGroupId: string | null,
    insertBeforeId: string | null
  ): Promise<void> {
    const item = this.data.items.find(i => i.id === id);
    if (!item) { return; }
    item.groupId = targetGroupId;

    // Build ordered sibling list (excluding the dragged item itself)
    const siblings = this.data.items
      .filter(i => i.groupId === targetGroupId && i.id !== id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const insertIdx = insertBeforeId
      ? siblings.findIndex(i => i.id === insertBeforeId)
      : -1;
    siblings.splice(insertIdx === -1 ? siblings.length : insertIdx, 0, item);

    // Re-assign contiguous sortOrder values
    siblings.forEach((i, idx) => { i.sortOrder = idx; });
    await this.save();
  }

  private nextSortOrder(groupId: string | null): number {
    const siblings = this.data.items.filter(i => i.groupId === groupId);
    return siblings.length === 0 ? 0 : Math.max(...siblings.map(i => i.sortOrder)) + 1;
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  async createGroup(label: string, parentId: string | null = null): Promise<FavoriteGroup> {
    const group: FavoriteGroup = {
      id:        generateId(),
      label:     label.trim(),
      parentId,
      collapsed: false,
      sortOrder: this.data.groups.length,
    };
    this.data.groups.push(group);
    await this.save();
    return group;
  }

  async renameGroup(id: string, label: string): Promise<void> {
    const group = this.data.groups.find(g => g.id === id);
    if (!group) { return; }
    group.label = label.trim();
    await this.save();
  }

  /**
   * @param strategy  'delete'  — permanently remove all items in the group
   *                  'ungroup' — move items to ungrouped (groupId = null)
   */
  async deleteGroup(id: string, strategy: 'delete' | 'ungroup'): Promise<void> {
    const affectedGroupIds = this.collectGroupIds(id);

    if (strategy === 'delete') {
      this.data.items = this.data.items.filter(
        i => i.groupId === null || !affectedGroupIds.has(i.groupId)
      );
    } else {
      this.data.items = this.data.items.map(i =>
        (i.groupId !== null && affectedGroupIds.has(i.groupId))
          ? { ...i, groupId: null }
          : i
      );
    }

    this.data.groups = this.data.groups.filter(g => !affectedGroupIds.has(g.id));
    await this.save();
  }

  /** Recursively collect a group and all its descendants */
  private collectGroupIds(rootId: string): Set<string> {
    const result = new Set<string>([rootId]);
    // Keep iterating until no new IDs are added (handles arbitrary depth)
    let changed = true;
    while (changed) {
      changed = false;
      for (const g of this.data.groups) {
        if (g.parentId && result.has(g.parentId) && !result.has(g.id)) {
          result.add(g.id);
          changed = true;
        }
      }
    }
    return result;
  }

  async setGroupCollapsed(id: string, collapsed: boolean): Promise<void> {
    const group = this.data.groups.find(g => g.id === id);
    if (!group) { return; }
    group.collapsed = collapsed;
    await this.save();
  }
}
