import * as vscode from 'vscode';
import * as path   from 'path';
import { FavoriteItemRuntime, FavoriteGroup, ItemHealth, FavoriteKind } from '../types';
import { CTX } from '../constants';

// ─── Group Node ───────────────────────────────────────────────────────────────

export class GroupTreeItem extends vscode.TreeItem {
  constructor(public readonly group: FavoriteGroup) {
    super(
      group.label,
      group.collapsed
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.Expanded
    );
    this.id           = group.id;
    this.contextValue = CTX.GROUP;
    this.iconPath     = new vscode.ThemeIcon('folder');
    this.tooltip      = `Group: ${group.label}`;
  }
}

// ─── Favorite Item Node ───────────────────────────────────────────────────────

export class FavItemTreeItem extends vscode.TreeItem {
  constructor(public readonly item: FavoriteItemRuntime) {
    super('', item.kind === FavoriteKind.Folder && item.health !== ItemHealth.Missing
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None
    );

    const basename  = path.basename(item.fsPath);
    const isMissing = item.health === ItemHealth.Missing;

    // ── Label: "alias  (originalName)" or just "originalName" ────────────────
    if (item.alias) {
      // Plain string label — no highlights, no background colour
      this.label       = `${item.alias}  (${basename})`;
      this.description = path.dirname(item.fsPath);
    } else {
      this.label       = basename;
      this.description = path.dirname(item.fsPath);
    }

    // ── Tooltip ──────────────────────────────────────────────────────────────
    const lines = [
      `**${item.alias ?? basename}**`,
      item.alias ? `Original: \`${basename}\`` : '',
      `Path: \`${item.fsPath}\``,
      isMissing ? `\n⚠️ *File no longer exists on disk*` : '',
    ].filter(Boolean);

    this.tooltip = new vscode.MarkdownString(lines.join('\n\n'));

    // ── Icon ─────────────────────────────────────────────────────────────────
    if (isMissing) {
      this.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('problemsWarningIcon.foreground')
      );
    } else {
      // Both files and folders: use resourceUri so the file-icon-theme
      // renders them with consistent padding/alignment
      this.resourceUri = vscode.Uri.file(item.fsPath);
    }

    // ── Context value (drives context-menu when= clauses) ────────────────────
    const healthStr = isMissing ? 'missing' : 'ok';
    this.contextValue = `favoriteItem_${item.kind}_${healthStr}`;

    // ── Command: single-click reveals in Explorer + opens file as preview ────
    if (!isMissing) {
      this.command = {
        command:   'favorites.openAndReveal',
        title:     'Open and Reveal',
        arguments: [this],
      };
    }

    this.id = item.id;
  }
}
