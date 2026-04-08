import * as vscode from 'vscode';
import { FavoritesStore }        from '../storage/FavoritesStore';
import { FavoritesTreeProvider } from '../tree/FavoritesTreeProvider';
import { FilterController }      from '../tree/FilterController';
import { CMD }                   from '../constants';
import { addToFavorites }        from './addToFavorites';
import { renameAlias }           from './renameAlias';
import { moveToGroup }           from './moveToGroup';
import { createGroup, renameGroup, deleteGroup } from './groupCommands';
import { FavItemTreeItem, GroupTreeItem }        from '../tree/FavoriteTreeItem';
import { FsEntryTreeItem }                        from '../tree/FsEntryTreeItem';
import { ItemHealth, FavoriteKind }              from '../types';

export function registerAllCommands(
  ctx:      vscode.ExtensionContext,
  store:    FavoritesStore,
  provider: FavoritesTreeProvider,
  filter:   FilterController
): void {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reg = (id: string, fn: (...args: any[]) => unknown) =>
    ctx.subscriptions.push(vscode.commands.registerCommand(id, fn));

  // ── Add to favorites (from explorer right-click or fsEntry right-click) ──
  reg(CMD.ADD_FILE, (uriOrNode?: vscode.Uri | FsEntryTreeItem) => {
    // When invoked from view/item/context on an FsEntryTreeItem, VS Code passes
    // the tree node; extract its resourceUri for the add flow.
    const uri = uriOrNode instanceof FsEntryTreeItem
      ? uriOrNode.resourceUri
      : uriOrNode as vscode.Uri | undefined;
    return addToFavorites(uri, store, provider);
  });

  // ── Remove item ───────────────────────────────────────────────────────────
  reg(CMD.REMOVE_ITEM, async (node?: FavItemTreeItem) => {
    if (!node) { return; }
    const confirmed = await vscode.window.showWarningMessage(
      `Remove "${node.item.alias ?? require('path').basename(node.item.fsPath)}" from favorites?`,
      { modal: true },
      'Remove'
    );
    if (!confirmed) { return; }
    await store.removeItem(node.item.id);
    provider.refresh();
  });

  // ── Rename alias ──────────────────────────────────────────────────────────
  reg(CMD.RENAME_ALIAS, (node?: FavItemTreeItem) =>
    renameAlias(node, store, provider)
  );

  // ── Open item (inline button: preview only, no reveal) ───────────────────
  reg(CMD.OPEN_ITEM, async (node?: FavItemTreeItem) => {
    if (!node) { return; }
    if (node.item.health === ItemHealth.Missing) {
      vscode.window.showWarningMessage(
        `"${node.item.fsPath}" no longer exists on disk.`
      );
      return;
    }
    const uri = vscode.Uri.file(node.item.fsPath);
    if (node.item.kind === FavoriteKind.File) {
      await vscode.window.showTextDocument(uri, { preview: true });
    } else {
      await vscode.commands.executeCommand('revealInExplorer', uri);
    }
  });

  // ── Open and Reveal (single-click: reveal in Explorer + preview open) ────
  reg(CMD.OPEN_AND_REVEAL, async (node?: FavItemTreeItem) => {
    if (!node) { return; }
    if (node.item.health === ItemHealth.Missing) {
      vscode.window.showWarningMessage(
        `"${node.item.fsPath}" no longer exists on disk.`
      );
      return;
    }
    const uri = vscode.Uri.file(node.item.fsPath);
    await vscode.commands.executeCommand('revealInExplorer', uri);
    if (node.item.kind === FavoriteKind.File) {
      await vscode.window.showTextDocument(uri, { preview: true });
    }
  });

  // ── Reveal in Explorer ────────────────────────────────────────────────────
  reg(CMD.REVEAL, async (node?: FavItemTreeItem) => {
    if (!node) { return; }
    await vscode.commands.executeCommand(
      'revealInExplorer',
      vscode.Uri.file(node.item.fsPath)
    );
  });

  // ── Move to group ─────────────────────────────────────────────────────────
  reg(CMD.MOVE_TO_GROUP, (node?: FavItemTreeItem | { id: string }) =>
    moveToGroup(node, store, provider)
  );

  // ── Group management ──────────────────────────────────────────────────────
  reg(CMD.CREATE_GROUP, () => createGroup(store, provider));

  reg(CMD.RENAME_GROUP, (node?: GroupTreeItem) =>
    renameGroup(node, store, provider)
  );

  reg(CMD.DELETE_GROUP, (node?: GroupTreeItem) =>
    deleteGroup(node, store, provider)
  );

  // ── Filter ────────────────────────────────────────────────────────────────
  reg(CMD.SET_FILTER, async () => {
    const val = await vscode.window.showInputBox({
      title:       'Filter Favorites',
      value:       filter.current,
      placeHolder: 'Type to filter by name or path… (empty = clear)',
      prompt:      'Filter is case-insensitive, matches alias and path',
    });
    if (val !== undefined) { filter.set(val); }
  });

  reg(CMD.CLEAR_FILTER, () => filter.clear());

  // ── Refresh ───────────────────────────────────────────────────────────────
  reg(CMD.REFRESH, () => provider.refresh());
}
