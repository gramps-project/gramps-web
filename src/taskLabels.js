// Maps Celery task function names (as returned by GET /api/tasks/) to
// translation keys used in the UI (= English label strings, looked up with
// the _() helper at render time).
//
// Celery may return either short names ("import_file") or fully-qualified
// module paths ("gramps_webapi.api.tasks.import_file").  Only short names are
// stored here; stripTaskPrefix() normalises fully-qualified names before lookup.
//
// For unknown names prettifyTaskName() provides a reasonable fallback.

export const TASK_LABELS = {
  // --- Import / export ---
  import_file: 'Import',
  export_db: 'Export',
  generate_report: 'Report',
  export_media: 'Export media',
  import_media_archive: 'Import Media Files',

  // --- Search / OCR ---
  search_reindex_full: 'Update search index',
  search_reindex_full_semantic: 'Regenerate semantic search index',
  search_reindex_incremental: 'Update search index',
  search_reindex_incremental_semantic: 'Update semantic search index',
  media_ocr: 'Text Recognition',

  // --- Database ---
  check_repair_database: 'Check and Repair Database',
  verify_database: 'Verify the Data',
  upgrade_database_schema: 'Upgrade database',
  delete_objects: 'Delete all objects',
  // process_transactions covers both undo and the Sync addon — use a generic
  // label since we cannot distinguish the two at the Celery task-name level.
  process_transactions: 'Process transactions',
}

// Maps Celery short names → the frontend taskName attribute used on
// <grampsjs-task-progress-indicator> elements.  Enables inline indicators to
// reconnect to running tasks after navigation or page reload.
export const CELERY_TO_TASK_NAME = {
  // --- Import / export ---
  import_file: 'importFile',
  export_db: 'exportFile',
  generate_report: 'generateReport',
  export_media: 'exportMedia',
  import_media_archive: 'importMedia',

  // --- Search / OCR ---
  search_reindex_full: 'searchReindexFull',
  search_reindex_full_semantic: 'searchReindexFullSemantic',
  search_reindex_incremental: 'searchReindexIncremental',
  search_reindex_incremental_semantic: 'searchReindexIncrementalSemantic',
  media_ocr: 'runOcr',

  // --- Database ---
  check_repair_database: 'repairDb',
  verify_database: 'verifyDb',
  upgrade_database_schema: 'upgradeDb',
  delete_objects: 'deleteObjects',
  // process_transactions: no single taskName — serves both undo and Sync addon
}

/** Strip a fully-qualified Celery module prefix, e.g.
 *  "gramps_webapi.api.tasks.import_file" → "import_file" */
export function stripTaskPrefix(name) {
  if (!name) return ''
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(dot + 1)
}

/** Look up a human label (= translation key) for a Celery task name (handles
 *  both short and fully-qualified forms).  Falls back to a prettified version
 *  of the name. */
export function getTaskLabel(name) {
  if (!name) return ''
  const label = TASK_LABELS[name] ?? TASK_LABELS[stripTaskPrefix(name)]
  return label ?? prettifyTaskName(name)
}

/** Map a Celery name to the frontend taskName attribute value. */
export function getTaskName(name) {
  if (!name) return ''
  return (
    CELERY_TO_TASK_NAME[name] ??
    CELERY_TO_TASK_NAME[stripTaskPrefix(name)] ??
    ''
  )
}

/** Convert a snake_case Celery name to a readable fallback, stripping any
 *  module prefix first, e.g. "gramps_webapi.api.tasks.import_file" →
 *  "Import file" */
export function prettifyTaskName(name) {
  if (!name) return ''
  return stripTaskPrefix(name)
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
}
