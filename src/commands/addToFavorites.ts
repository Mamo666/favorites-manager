import * as vscode from 'vscode';
import * as path   from 'path';
import { FavoritesStore }        from '../storage/FavoritesStore';
import { FavoritesTreeProvider } from '../tree/FavoritesTreeProvider';
import { FavoriteKind }          from '../types';

export async function addToFavorites(
  uri: vscode.Uri | undefined,
  store: FavoritesStore,
  provider: FavoritesTreeProvider
): Promise<void> {

  // Support both explorer right-click (uri provided) and command palette
  const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
  if (!targetUri) {
    vscode.window.showWarningMessage('No file selected to add to favorites.');
    return;
  }

  const fsPath = targetUri.fsPath;

  let kind: FavoriteKind;
  try {
    const stat = await vscode.workspace.fs.stat(targetUri);
    kind = stat.type === vscode.FileType.Directory
      ? FavoriteKind.Folder
      : FavoriteKind.File;
  } catch {
    vscode.window.showErrorMessage(`Cannot access: ${fsPath}`);
    return;
  }

  // ── Group picker ──────────────────────────────────────────────────────────
  const groups = store.getGroups();
  const picks: vscode.QuickPickItem[] = [
    { label: '$(inbox) Ungrouped', description: '__ungrouped__', picked: true },
    ...groups.map(g => ({
      label:       `$(folder) ${g.label}`,
      description: g.id,
    })),
    { label: '$(add) Create new group…', description: '__new__' },
  ];

  const picked = await vscode.window.showQuickPick(picks, {
    title:       `Add "${path.basename(fsPath)}" to Favorites`,
    placeHolder: 'Choose a group (Escape to cancel)',
  });

  if (!picked) { return; } // user pressed Escape

  let groupId: string | null = null;

  if (picked.description === '__new__') {
    const name = await vscode.window.showInputBox({
      prompt: 'New group name',
      validateInput: v => v.trim() ? undefined : 'Name cannot be empty',
    });
    if (!name) { return; }
    const newGroup = await store.createGroup(name);
    groupId = newGroup.id;
  } else if (picked.description && picked.description !== '__ungrouped__') {
    groupId = picked.description;
  }

  // ── Alias prompt ──────────────────────────────────────────────────────────
  const alias = await vscode.window.showInputBox({
    title:       `Set Alias for "${path.basename(fsPath)}"`,
    prompt:      'Optional alias — press Enter to skip',
    placeHolder: 'e.g. My Config File',
  });
  if (alias === undefined) { return; } // Escape = cancel entire flow

  // ── Duplicate guard ───────────────────────────────────────────────────────
  const added = await store.addItem(fsPath, kind, groupId, alias);
  if (added === null) {
    const existingItem = store.getItems().find(i => i.fsPath === fsPath)!;
    const groupLabel = existingItem.groupId
      ? (groups.find(g => g.id === existingItem.groupId)?.label ?? 'unknown group')
      : 'Ungrouped';

    const choice = await vscode.window.showWarningMessage(
      `"${path.basename(fsPath)}" is already in favorites (in "${groupLabel}").`,
      'Move to Different Group',
      'OK'
    );
    if (choice === 'Move to Different Group') {
      vscode.commands.executeCommand('favorites.moveToGroup', { id: existingItem.id });
    }
    return;
  }

  provider.refresh();
  vscode.window.showInformationMessage(
    `Added "${path.basename(fsPath)}" to favorites.`
  );
}
