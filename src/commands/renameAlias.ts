import * as vscode from 'vscode';
import * as path   from 'path';
import { FavoritesStore }        from '../storage/FavoritesStore';
import { FavoritesTreeProvider } from '../tree/FavoritesTreeProvider';
import { FavItemTreeItem }        from '../tree/FavoriteTreeItem';

export async function renameAlias(
  node: FavItemTreeItem | undefined,
  store: FavoritesStore,
  provider: FavoritesTreeProvider
): Promise<void> {
  if (!node) { return; }

  const item     = node.item;
  const basename = path.basename(item.fsPath);
  const current  = item.alias ?? '';

  const newAlias = await vscode.window.showInputBox({
    title:       'Set Alias for Favorite',
    prompt:      `Alias for "${basename}" — leave empty to use the original filename`,
    value:       current,
    placeHolder: basename,
    validateInput: (v) => v.length > 80 ? 'Alias must be ≤ 80 characters' : undefined,
  });

  if (newAlias === undefined) { return; } // cancelled

  await store.setAlias(item.id, newAlias || null);
  provider.refresh();
}
