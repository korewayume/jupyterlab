// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ActivityMonitor
} from '@jupyterlab/coreutils';

import {
  ABCWidgetFactory, DocumentRegistry, IDocumentWidget, DocumentWidget
} from '@jupyterlab/docregistry';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  DataGrid
} from '@phosphor/datagrid';

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import {
  CSVDelimiter
} from './toolbar';

import {
  DSVModel
} from './model';

/**
 * The class name added to a CSV viewer.
 */
const CSV_CLASS = 'jp-CSVViewer';

/**
 * The class name added to a CSV viewer datagrid.
 */
const CSV_GRID_CLASS = 'jp-CSVViewer-grid';

/**
 * The timeout to wait for change activity to have ceased before rendering.
 */
const RENDER_TIMEOUT = 1000;


/**
 * A viewer for CSV tables.
 */
export
class CSVViewer extends Widget {
  /**
   * Construct a new CSV viewer.
   */
  constructor(options: CSVViewer.IOptions) {
    super();

    let context = this._context = options.context;
    let layout = this.layout = new PanelLayout();

    this.addClass(CSV_CLASS);

    this._grid = new DataGrid();
    this._grid.addClass(CSV_GRID_CLASS);
    this._grid.headerVisibility = 'all';
    layout.addWidget(this._grid);

    this._context.ready.then(() => {
      this._updateGrid();
      this._ready.resolve(undefined);
      // Throttle the rendering rate of the widget.
      this._monitor = new ActivityMonitor({
        signal: context.model.contentChanged,
        timeout: RENDER_TIMEOUT
      });
      this._monitor.activityStopped.connect(this._updateGrid, this);
    });
  }

  /**
   * The CSV widget's context.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * A promise that resolves when the csv viewer is ready.
   */
  get ready() {
    return this._ready.promise;
  }

  /**
   * The delimiter for the file.
   */
  get delimiter(): string {
    return this._delimiter;
  }
  set delimiter(value: string) {
    if (value === this._delimiter) {
      return;
    }
    this._delimiter = value;
    this._updateGrid();
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this._monitor) {
      this._monitor.dispose();
    }
    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Create the model for the grid.
   */
  private _updateGrid(): void {
    let data: string = this._context.model.toString();
    let delimiter = this._delimiter;
    let oldModel = this._grid.model as DSVModel;
    this._grid.model = new DSVModel({ data, delimiter });
    if (oldModel) {
      oldModel.dispose();
    }
  }

  private _context: DocumentRegistry.Context;
  private _grid: DataGrid;
  private _monitor: ActivityMonitor<any, any> | null = null;
  private _delimiter = ',';
  private _ready = new PromiseDelegate<void>();
}


/**
 * A namespace for `CSVViewer` statics.
 */
export
namespace CSVViewer {
  /**
   * Instantiation options for CSV widgets.
   */
  export
  interface IOptions {
    /**
     * The document context for the CSV being rendered by the widget.
     */
    context: DocumentRegistry.Context;
  }
}


/**
 * A widget factory for CSV widgets.
 */
export
class CSVViewerFactory extends ABCWidgetFactory<IDocumentWidget<CSVViewer>> {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): IDocumentWidget<CSVViewer> {
    const content = new CSVViewer({ context });
    const widget = new DocumentWidget({ content, context, ready: content.ready });
    const csvDelimiter = new CSVDelimiter({ selected: content.delimiter });
    widget.toolbar.addItem('delimiter', csvDelimiter);
    csvDelimiter.delimiterChanged.connect((sender: CSVDelimiter, delimiter: string) => { content.delimiter = delimiter; });
    return widget;
  }
}
