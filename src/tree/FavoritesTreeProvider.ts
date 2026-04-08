import * as vscode from 'vscode';
import * as fs     from 'fs';
import * as path   from 'path';
import { FavoritesStore }                from '../storage/FavoritesStore';
import { FilterController }              from './FilterController';
import { GroupTreeItem, FavItemTreeItem } from './FavoriteTreeItem';
import { FsEntryTreeItem }               from './FsEntryTreeItem';
import { FavoriteGroup, FavoriteItem, FavoriteItemRuntime, ItemHealth, FavoriteKind } from '../types';

type AnyTreeItem = GroupTreeItem | FavItemTreeItem | FsEntryTreeItem;

const DND_MIME = 'application/vnd.code.tree.favoritesview';

export class FavoritesTreeProvider
  implements vscode.TreeDataProvider<AnyTreeItem>,
             vscode.TreeDragAndDropController<AnyTreeItem>
{
  private readonly _onDidChangeTreeData =
    new vscode.EventEmitter<AnyTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /** Runtime health cache: itemId → ItemHealth */
  private healthCache = new Map<string, ItemHealth>();

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  readonly dropMimeTypes = [DND_MIME];
  readonly dragMimeTypes = [DND_MIME];

  handleDrag(
    source: readonly AnyTreeItem[],
    dataTransfer: vscode.DataTransfer
  ): void {
    const ids = source
      .filter((n): n is FavItemTreeItem => n instanceof FavItemTreeItem)
      .map(n => n.item.id);
    if (ids.length === 0) { return; }
    dataTransfer.set(DND_MIME, new vscode.DataTransferItem(ids));
  }

  async handleDrop(
    target: AnyTreeItem | undefined,
    dataTransfer: vscode.DataTransfer
  ): Promise<void> {
    const raw = dataTransfer.get(DND_MIME);
    if (!raw) { return; }
    const ids: string[] = raw.value;

    let targetGroupId:  string | null = null;
    let insertBeforeId: string | null = null;

    if (target instanceof FavItemTreeItem) {
      targetGroupId  = target.item.groupId;
      insertBeforeId = target.item.id;
    } else if (target instanceof GroupTreeItem) {
      targetGroupId  = target.group.id;
      insertBeforeId = null; // append to end of group
    }
    // else: drop on empty space → ungrouped, append

    for (const id of ids) {
      await this.store.reorderItem(id, targetGroupId, insertBeforeId);
    }
    this.refresh();
  }

  constructor(
    private readonly store:  FavoritesStore,
    private readonly filter: FilterController
  ) {
    filter.onFilterChanged(() => this.refresh());
  }

  refresh(item?: AnyTreeItem): void {
    if (!item) {
      this.healthCache.clear(); // full re-check on full refresh
    }
    this._onDidChangeTreeData.fire(item);
  }

  // ── TreeDataProvider ──────────────────────────────────────────────────────

  getTreeItem(element: AnyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AnyTreeItem): vscode.ProviderResult<AnyTreeItem[]> {
    if (!element) {
      return this.getRootChildren();
    }
    if (element instanceof GroupTreeItem) {
      return this.getGroupChildren(element.group);
    }
    // Expand a favorited folder to browse its real filesystem contents
    if (element instanceof FavItemTreeItem && element.item.kind === FavoriteKind.Folder) {
      return this.getFsChildren(element.item.fsPath);
    }
    // Recursively expand sub-directories inside a favorited folder
    if (element instanceof FsEntryTreeItem &&
        (element.entryKind & vscode.FileType.Directory) !== 0) {
      return this.getFsChildren(element.fsPath);
    }
    return [];
  }

  // ── Filesystem children (for favorited & sub-folders) ────────────────────

  private async getFsChildren(dirPath: string): Promise<FsEntryTreeItem[]> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));
      return entries
        .sort(([aName, aType], [bName, bType]) => {
          // Directories first, then alphabetical
          const aIsDir = (aType & vscode.FileType.Directory) !== 0;
          const bIsDir = (bType & vscode.FileType.Directory) !== 0;
          if (aIsDir !== bIsDir) { return aIsDir ? -1 : 1; }
          return aName.localeCompare(bName);
        })
        .map(([name, type]) => new FsEntryTreeItem(path.join(dirPath, name), type));
    } catch {
      return [];
    }
  }

  // ── Root level: top-level groups + ungrouped items ────────────────────────

  private getRootChildren(): AnyTreeItem[] {
    const groups = this.store.getGroups()
      .filter(g => g.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const results: AnyTreeItem[] = [];

    // 1. Top-level groups (with filter-aware pruning)
    for (const group of groups) {
      if (this.groupHasVisibleContent(group)) {
        results.push(new GroupTreeItem(group));
      }
    }

    // 2. Ungrouped items that match filter
    const ungrouped = this.store.getItems()
      .filter(i => i.groupId === null)
      .filter(i => this.itemMatchesFilter(i))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const item of ungrouped) {
      results.push(new FavItemTreeItem(this.toRuntime(item)));
    }

    return results;
  }

  private getGroupChildren(group: FavoriteGroup): AnyTreeItem[] {
    const results: AnyTreeItem[] = [];

    // Sub-groups
    const subgroups = this.store.getGroups()
      .filter(g => g.parentId === group.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const sg of subgroups) {
      if (this.groupHasVisibleContent(sg)) {
        results.push(new GroupTreeItem(sg));
      }
    }

    // Items in this group
    const items = this.store.getItems()
      .filter(i => i.groupId === group.id)
      .filter(i => this.itemMatchesFilter(i))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const item of items) {
      results.push(new FavItemTreeItem(this.toRuntime(item)));
    }

    return results;
  }

  // ── Filter helpers ────────────────────────────────────────────────────────

  private itemMatchesFilter(item: FavoriteItem): boolean {
    if (!this.filter.current) { return true; }
    return (
      (item.alias ? this.filter.matches(item.alias) : false) ||
      this.filter.matches(item.fsPath)
    );
  }

  private groupHasVisibleContent(group: FavoriteGroup): boolean {
    if (!this.filter.current) { return true; }

    const directItems = this.store.getItems().filter(i => i.groupId === group.id);
    if (directItems.some(i => this.itemMatchesFilter(i))) { return true; }

    const subgroups = this.store.getGroups().filter(g => g.parentId === group.id);
    return subgroups.some(sg => this.groupHasVisibleContent(sg));
  }

  // ── Health check ──────────────────────────────────────────────────────────

  private toRuntime(item: FavoriteItem): FavoriteItemRuntime {
    if (!this.healthCache.has(item.id)) {
      let health: ItemHealth;
      try {
        health = fs.existsSync(item.fsPath) ? ItemHealth.Ok : ItemHealth.Missing;
      } catch {
        health = ItemHealth.Missing;
      }
      this.healthCache.set(item.id, health);
    }
    return { ...item, health: this.healthCache.get(item.id)! };
  }
}
