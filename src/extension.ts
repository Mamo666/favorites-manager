import * as vscode from 'vscode';
import { FavoritesStore }        from './storage/FavoritesStore';
import { FavoritesTreeProvider } from './tree/FavoritesTreeProvider';
import { FilterController }      from './tree/FilterController';
import { registerAllCommands }   from './commands/index';
import { GroupTreeItem }          from './tree/FavoriteTreeItem';
import { VIEW_ID }               from './constants';

export function activate(context: vscode.ExtensionContext): void {

  // ── Core singletons ────────────────────────────────────────────────────────
  const store    = new FavoritesStore(context);
  const filter   = new FilterController();
  const provider = new FavoritesTreeProvider(store, filter);

  // ── Register tree view ─────────────────────────────────────────────────────
  const treeView = vscode.window.createTreeView(VIEW_ID, {
    treeDataProvider:      provider,
    showCollapseAll:       true,
    canSelectMany:         false,
    dragAndDropController: provider,
  });

  // Persist collapse/expand state
  treeView.onDidCollapseElement(({ element }) => {
    if (element instanceof GroupTreeItem) {
      store.setGroupCollapsed(element.group.id, true);
    }
  });

  treeView.onDidExpandElement(({ element }) => {
    if (element instanceof GroupTreeItem) {
      store.setGroupCollapsed(element.group.id, false);
    }
  });

  // ── Register commands ──────────────────────────────────────────────────────
  registerAllCommands(context, store, provider, filter);

  // ── Show filter state in the view title ───────────────────────────────────
  filter.onFilterChanged(f => {
    treeView.title = f ? `Favorites  [${f}]` : 'Favorites';
  });

  context.subscriptions.push(treeView, filter);
}

export function deactivate(): void {
  // Nothing needed; store writes happen immediately on each mutation
}
