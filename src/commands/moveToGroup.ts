import * as vscode from 'vscode';
import { FavoritesStore }        from '../storage/FavoritesStore';
import { FavoritesTreeProvider } from '../tree/FavoritesTreeProvider';
import { FavItemTreeItem }        from '../tree/FavoriteTreeItem';

export async function moveToGroup(
  node: FavItemTreeItem | { id: string } | undefined,
  store: FavoritesStore,
  provider: FavoritesTreeProvider
): Promise<void> {
  if (!node) { return; }

  // Accept both a tree item and a plain { id } object
  const id   = node instanceof FavItemTreeItem ? node.item.id : node.id;
  const item = store.getItems().find(i => i.id === id);
  if (!item) { return; }

  const groups = store.getGroups();
  const picks: vscode.QuickPickItem[] = [
    { label: '$(inbox) Ungrouped', description: '__ungrouped__', picked: item.groupId === null },
    ...groups.map(g => ({
      label:       `$(folder) ${g.label}`,
      description: g.id,
      picked:      g.id === item.groupId,
    })),
    { label: '$(add) Create new group…', description: '__new__' },
  ];

  const picked = await vscode.window.showQuickPick(picks, {
    title:       'Move to Group',
    placeHolder: 'Select destination group',
  });

  if (!picked) { return; }

  let targetGroupId: string | null = null;

  if (picked.description === '__new__') {
    const name = await vscode.window.showInputBox({
      prompt: 'New group name',
      validateInput: v => v.trim() ? undefined : 'Name cannot be empty',
    });
    if (!name) { return; }
    const newGroup = await store.createGroup(name);
    targetGroupId = newGroup.id;
  } else if (picked.description && picked.description !== '__ungrouped__') {
    targetGroupId = picked.description;
  }

  await store.moveItemToGroup(item.id, targetGroupId);
  provider.refresh();
}
