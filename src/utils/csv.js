export function escapeCsv(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

export function toCsv(rows = [], headers = null) {
    if (!Array.isArray(rows) || rows.length === 0) return '';
    const cols = (headers && Array.isArray(headers) && headers.length > 0) ? headers : Object.keys(rows[0]);
    const headerLine = cols.map(c => escapeCsv(c)).join(',');
    const dataLines = rows.map(r => cols.map(c => escapeCsv(r && Object.prototype.hasOwnProperty.call(r, c) ? r[c] : '')).join(','));
    return [headerLine, ...dataLines].join('\r\n');
}
