# Favorites Manager

A VS Code extension to pin any file or folder as a favorite, organized with groups and custom aliases.

## Features

- **Right-click to add** — Right-click any file or folder in the Explorer and choose **Add to Favorites**
- **Sidebar panel** — Dedicated activity bar icon with a tree view of all your favorites
- **Custom aliases** — Rename a favorite for easier identification; both the alias and original filename are shown
- **Group management** — Create, rename, and delete groups; move items between groups
- **Search/filter** — Click the filter icon in the toolbar to filter favorites by name or path
- **Persistent storage** — Favorites are stored globally and survive across all workspaces and VS Code restarts
- **Health indicators** — Items pointing to files that no longer exist are marked with a warning icon

## Usage

### Adding favorites
1. Right-click a file or folder in the Explorer panel
2. Click **Add to Favorites**
3. Choose an existing group or create a new one

### Managing favorites
- **Set Alias**: Right-click an item in the Favorites panel → *Set Alias…*
- **Move to Group**: Right-click an item → *Move to Group…*
- **Remove**: Right-click an item → *Remove from Favorites*

### Managing groups
- **New Group**: Click the `+` button in the Favorites panel toolbar
- **Rename/Delete**: Right-click a group in the panel

### Filtering
- Click the filter icon (🔍) in the toolbar and type a search term
- Matches against aliases and file paths (case-insensitive)
- Click *Clear Filter* to reset
