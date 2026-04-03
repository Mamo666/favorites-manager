import * as vscode from 'vscode';
import { FavoritesStore }        from '../storage/FavoritesStore';
import { FavoritesTreeProvider } from '../tree/FavoritesTreeProvider';
import { GroupTreeItem }          from '../tree/FavoriteTreeItem';

export async function createGroup(
  store: FavoritesStore,
  provider: FavoritesTreeProvider
): Promise<void> {
  const name = await vscode.window.showInputBox({
    title:  'New Favorites Group',
    prompt: 'Enter group name',
    validateInput: v => v.trim() ? undefined : 'Name cannot be empty',
  });
  if (!name) { return; }
  await store.createGroup(name);
  provider.refresh();
}

export async function renameGroup(
  node: GroupTreeItem | undefined,
  store: FavoritesStore,
  provider: FavoritesTreeProvider
): Promise<void> {
  if (!node) { return; }

  const newName = await vscode.window.showInputBox({
    title:         'Rename Group',
    value:         node.group.label,
    validateInput: v => v.trim() ? undefined : 'Name cannot be empty',
  });
  if (!newName) { return; }
  await store.renameGroup(node.group.id, newName);
  provider.refresh();
}

export async function deleteGroup(
  node: GroupTreeItem | undefined,
  store: FavoritesStore,
  provider: FavoritesTreeProvider
): Promise<void> {
  if (!node) { return; }

  const itemCount = store.getItems()
    .filter(i => i.groupId === node.group.id).length;

  let strategy: 'delete' | 'ungroup';

  if (itemCount > 0) {
    const answer = await vscode.window.showWarningMessage(
      `Group "${node.group.label}" contains ${itemCount} item(s). What should happen to them?`,
      { modal: true },
      'Move to Ungrouped',
      'Delete Items Too'
    );
    if (!answer) { return; } // cancelled
    strategy = answer === 'Delete Items Too' ? 'delete' : 'ungroup';
  } else {
    const confirmed = await vscode.window.showWarningMessage(
      `Delete empty group "${node.group.label}"?`,
      { modal: true },
      'Delete'
    );
    if (!confirmed) { return; }
    strategy = 'ungroup';
  }

  await store.deleteGroup(node.group.id, strategy);
  provider.refresh();
}
