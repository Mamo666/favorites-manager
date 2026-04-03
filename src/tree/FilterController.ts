import * as vscode from 'vscode';
import { CONTEXT_KEY } from '../constants';

export class FilterController implements vscode.Disposable {

  private _filter = '';
  private readonly _onChange = new vscode.EventEmitter<string>();
  readonly onFilterChanged = this._onChange.event;

  get current(): string { return this._filter; }

  set(value: string): void {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === this._filter) { return; }
    this._filter = trimmed;
    // Update the VS Code context key so the "Clear Filter" button shows/hides
    vscode.commands.executeCommand(
      'setContext',
      CONTEXT_KEY.FILTER_ACTIVE,
      !!this._filter
    );
    this._onChange.fire(this._filter);
  }

  clear(): void { this.set(''); }

  matches(text: string): boolean {
    if (!this._filter) { return true; }
    return text.toLowerCase().includes(this._filter);
  }

  dispose(): void { this._onChange.dispose(); }
}
