export const STORAGE_KEY    = 'favoritesManager.data';
export const SCHEMA_VERSION = 1;
export const VIEW_ID        = 'favoritesView';

export const CMD = {
  ADD_FILE:          'favorites.addFile',
  REMOVE_ITEM:       'favorites.removeItem',
  RENAME_ALIAS:      'favorites.renameAlias',
  OPEN_ITEM:         'favorites.openItem',
  OPEN_AND_REVEAL:   'favorites.openAndReveal',
  REVEAL:            'favorites.revealInExplorer',
  MOVE_TO_GROUP:     'favorites.moveToGroup',
  CREATE_GROUP:      'favorites.createGroup',
  RENAME_GROUP:      'favorites.renameGroup',
  DELETE_GROUP:      'favorites.deleteGroup',
  SET_FILTER:        'favorites.setFilter',
  CLEAR_FILTER:      'favorites.clearFilter',
  REFRESH:           'favorites.refresh',
} as const;

export const CTX = {
  ITEM_FILE_OK:        'favoriteItem_file_ok',
  ITEM_FILE_MISSING:   'favoriteItem_file_missing',
  ITEM_FOLDER_OK:      'favoriteItem_folder_ok',
  ITEM_FOLDER_MISSING: 'favoriteItem_folder_missing',
  GROUP:               'groupItem',
} as const;

export const CONTEXT_KEY = {
  FILTER_ACTIVE: 'favorites.filterActive',
} as const;
