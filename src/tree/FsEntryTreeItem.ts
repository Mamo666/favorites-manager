import * as vscode from 'vscode';
import * as path   from 'path';

/**
 * Represents a filesystem entry (file or directory) that is displayed when
 * the user expands a favorited folder.  These nodes are NOT stored in the
 * FavoritesStore — they are ephemeral, built on-the-fly from the real FS.
 */
export class FsEntryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly fsPath:    string,
    public readonly entryKind: vscode.FileType
  ) {
    const isDir = (entryKind & vscode.FileType.Directory) !== 0;

    super(
      path.basename(fsPath),
      isDir
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.resourceUri  = vscode.Uri.file(fsPath);
    this.id           = `fsentry:${fsPath}`;
    this.contextValue = isDir ? 'fsEntry_dir' : 'fsEntry_file';

    if (!isDir) {
      this.command = {
        command:   'vscode.open',
        title:     'Open',
        arguments: [vscode.Uri.file(fsPath)],
      };
    }
  }
}
