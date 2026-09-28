/**
 * CSV Generation and Sanitization Service
 * Implements FR-115 - FR-120:
 * - RFC 4180 compliant CSV formatting
 * - Spreadsheet Formula Injection (CSV Injection) Mitigation:
 *   Prefixes values starting with '=', '+', '-', '@', '\t', '\r' with a single quote (')
 * - UTF-8 BOM (\uFEFF) prefix for seamless Unicode rendering across Excel, Numbers, and Google Sheets
 */

/**
 * Sanitizes a single cell value to prevent formula injection and escape quotes
 * @param {any} val - Cell value
 * @returns {string} - Escaped and sanitized CSV cell string
 */
const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // Normalize line endings
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Defense against Spreadsheet Formula Injection (FR-119)
  // If the cell begins with =, +, -, @, tab, or CR, prefix with a single quote (')
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Escape double quotes by doubling them per RFC 4180
  const escaped = str.replace(/"/g, '""');

  return `"${escaped}"`;
};

/**
 * Converts headers and row data into an RFC 4180 CSV string with UTF-8 BOM
 * @param {Array<string>} headers - Header column names
 * @param {Array<Array<any>>} rows - 2D array of rows
 * @returns {string} - Complete CSV content
 */
const buildCsvString = (headers, rows) => {
  const BOM = '\uFEFF';
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(','));

  return BOM + [headerLine, ...rowLines].join('\r\n');
};

/**
 * Formats a list of Application Mongoose documents or plain objects for CSV export (FR-117)
 * Columns: id, company name, job title, location, status, salary min, salary max,
 * currency, salary period, application url, applied date, follow-up date, deadline date,
 * created at, updated at.
 * @param {Array<Object>} applications - Applications array
 * @returns {string} - Formatted CSV string
 */
const generateApplicationsCsv = (applications) => {
  const headers = [
    'Application ID',
    'Company Name',
    'Job Title',
    'Location',
    'Status',
    'Salary Min',
    'Salary Max',
    'Salary Currency',
    'Salary Period',
    'Application URL',
    'Applied Date',
    'Follow-Up Date',
    'Deadline Date',
    'Notes',
    'Created At',
    'Updated At',
  ];

  const rows = applications.map((app) => [
    app._id ? String(app._id) : '',
    app.companyName || '',
    app.jobTitle || '',
    app.location || '',
    app.status || '',
    app.salary?.min !== undefined && app.salary?.min !== null ? app.salary.min : '',
    app.salary?.max !== undefined && app.salary?.max !== null ? app.salary.max : '',
    app.salary?.currency || '',
    app.salary?.period || '',
    app.applicationUrl || '',
    app.appliedDate ? new Date(app.appliedDate).toISOString() : '',
    app.followUpDate ? new Date(app.followUpDate).toISOString() : '',
    app.deadlineDate ? new Date(app.deadlineDate).toISOString() : '',
    app.notes || '',
    app.createdAt ? new Date(app.createdAt).toISOString() : '',
    app.updatedAt ? new Date(app.updatedAt).toISOString() : '',
  ]);

  return buildCsvString(headers, rows);
};

/**
 * Formats Application History events for CSV export (FR-118)
 * Columns: application id, company name, job title, event type,
 * from status, to status, timestamp, note.
 * @param {Array<Object>} history - History records array
 * @returns {string} - Formatted CSV string
 */
const generateHistoryCsv = (history) => {
  const headers = [
    'Application ID',
    'Company Name',
    'Job Title',
    'Event Type',
    'From Status',
    'To Status',
    'Timestamp',
    'Note',
  ];

  const rows = history.map((h) => [
    h.applicationId?._id ? String(h.applicationId._id) : (h.applicationId ? String(h.applicationId) : ''),
    h.applicationId?.companyName || h.companyName || '',
    h.applicationId?.jobTitle || h.jobTitle || '',
    h.eventType || '',
    h.fromStatus || '',
    h.toStatus || '',
    h.timestamp ? new Date(h.timestamp).toISOString() : (h.createdAt ? new Date(h.createdAt).toISOString() : ''),
    h.note || '',
  ]);

  return buildCsvString(headers, rows);
};

module.exports = {
  sanitizeCsvCell,
  buildCsvString,
  generateApplicationsCsv,
  generateHistoryCsv,
};
