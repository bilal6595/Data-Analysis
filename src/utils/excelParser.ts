import * as XLSX from 'xlsx';
import { ParsedFile, UniformityReport, AggregatedDataset } from '../types/data';
import { runFullAnalysis } from './analyticsEngine';

export interface ParseOptions {
  sheetIndex?: number;
  sheetName?: string;
}

/**
 * Normalizes column header strings
 */
function cleanHeader(header: any, index: number, seenHeaders: Set<string>): string {
  let name = String(header ?? '').trim();
  if (!name) {
    name = `Column_${index + 1}`;
  }
  let uniqueName = name;
  let counter = 1;
  while (seenHeaders.has(uniqueName.toLowerCase())) {
    counter++;
    uniqueName = `${name}_${counter}`;
  }
  seenHeaders.add(uniqueName.toLowerCase());
  return uniqueName;
}

/**
 * Convert cell value to properly typed JS primitive
 */
function normalizeCellValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'N/A' || trimmed === 'null' || trimmed === '-') {
      return null;
    }
    // Check if it's a numeric string with currency or formatting like "$1,240.50" or "(500.00)"
    const currencyOrNumericRegex = /^[+-]?[$€£¥]?\s*\(?[\d,]+(\.\d+)?\)?%?$/;
    if (currencyOrNumericRegex.test(trimmed)) {
      const cleanNum = trimmed
        .replace(/[$€£¥,]/g, '')
        .replace(/\((.*)\)/, '-$1')
        .replace(/%$/, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && isFinite(parsed)) {
        if (trimmed.endsWith('%')) {
          return parsed / 100;
        }
        return parsed;
      }
    }
    // Check if ISO date or standard date
    if (/^\d{4}-\d{2}-\d{2}(T|\b)/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return trimmed;
  }
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
  }
  return val;
}

/**
 * Reads an ArrayBuffer into worksheet data
 */
export function parseWorkbookBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  filePath: string = '',
  fileSize: number = 0,
  lastModified: number = Date.now(),
  options: ParseOptions = {}
): ParsedFile {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error(`Workbook "${fileName}" contains no sheets.`);
  }

  const targetSheetName = options.sheetName && sheetNames.includes(options.sheetName)
    ? options.sheetName
    : sheetNames[options.sheetIndex ?? 0];

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${targetSheetName}" not found in "${fileName}".`);
  }

  // Parse raw JSON array of arrays
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (rawRows.length === 0) {
    return {
      id: `${fileName}-${Date.now()}`,
      name: fileName,
      path: filePath || fileName,
      size: fileSize,
      lastModified,
      rowCount: 0,
      columns: [],
      data: [],
      sheetNames,
      selectedSheet: targetSheetName,
      isValidUniform: true,
      missingColumns: [],
      extraColumns: [],
    };
  }

  // Header detection: find first non-empty row
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (row && row.some(cell => cell !== null && String(cell).trim() !== '')) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex] || [];
  const seenHeaders = new Set<string>();
  const columns: string[] = [];

  for (let c = 0; c < headerRow.length; c++) {
    const colName = cleanHeader(headerRow[c], c, seenHeaders);
    columns.push(colName);
  }

  const dataRows: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;
    // Check if row has at least one valid cell
    const hasData = row.some(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasData) continue;

    const rowObj: Record<string, any> = {
      _source_file: fileName,
      _row_id: r,
    };
    for (let c = 0; c < columns.length; c++) {
      const colName = columns[c];
      rowObj[colName] = normalizeCellValue(row[c]);
    }
    dataRows.push(rowObj);
  }

  return {
    id: `${fileName}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: fileName,
    path: filePath || fileName,
    size: fileSize,
    lastModified,
    rowCount: dataRows.length,
    columns,
    data: dataRows,
    sheetNames,
    selectedSheet: targetSheetName,
    isValidUniform: true,
    missingColumns: [],
    extraColumns: [],
  };
}

/**
 * Parses multiple files (from folder upload or batch drag & drop)
 */
export async function parseMultipleFiles(files: File[]): Promise<AggregatedDataset> {
  const parsedFiles: ParsedFile[] = [];

  // Sort files by name so chronological files stay ordered (e.g. 2024-Q1, 2024-Q2 or Store_01, Store_02)
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  for (const file of sortedFiles) {
    const isExcelOrCsv = /\.(xlsx|xls|csv|tsv)$/i.test(file.name);
    if (!isExcelOrCsv) continue;

    try {
      const buffer = await file.arrayBuffer();
      // webkitRelativePath contains folder structure on Mac/Chrome
      const relativePath = (file as any).webkitRelativePath || file.name;
      const parsed = parseWorkbookBuffer(
        buffer,
        file.name,
        relativePath,
        file.size,
        file.lastModified
      );
      if (parsed.columns.length > 0) {
        parsedFiles.push(parsed);
      }
    } catch (err) {
      console.error(`Error parsing file ${file.name}:`, err);
    }
  }

  if (parsedFiles.length === 0) {
    throw new Error('No valid Excel (.xlsx, .xls) or CSV files could be parsed from the selected folder.');
  }

  // Evaluate Schema Uniformity across files
  const uniformity = evaluateUniformity(parsedFiles);

  // Mark files with missing/extra columns
  parsedFiles.forEach(file => {
    const fileColSet = new Set(file.columns.map(c => c.toLowerCase()));
    const missing = uniformity.canonicalColumns.filter(c => !fileColSet.has(c.toLowerCase()));
    const canonicalSet = new Set(uniformity.canonicalColumns.map(c => c.toLowerCase()));
    const extra = file.columns.filter(c => !canonicalSet.has(c.toLowerCase()));

    file.missingColumns = missing;
    file.extraColumns = extra;
    file.isValidUniform = missing.length === 0 && extra.length === 0;
  });

  // Merge rows into unified dataset
  const mergedRows: Record<string, any>[] = [];
  const canonicalColumns = uniformity.canonicalColumns;

  parsedFiles.forEach(file => {
    file.data.forEach(row => {
      const canonicalRow: Record<string, any> = {
        _source_file: file.name,
      };
      canonicalColumns.forEach(col => {
        // Match case-insensitively
        const originalKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase());
        canonicalRow[col] = originalKey ? row[originalKey] : null;
      });
      // Also preserve any extra columns if any
      Object.keys(row).forEach(k => {
        if (!k.startsWith('_') && !(k in canonicalRow)) {
          canonicalRow[k] = row[k];
        }
      });
      mergedRows.push(canonicalRow);
    });
  });

  // Calculate full statistical highlights, profiles, executive summaries
  const { columnProfiles, summary } = runFullAnalysis(mergedRows, canonicalColumns, parsedFiles);

  return {
    files: parsedFiles,
    mergedRows,
    columns: canonicalColumns,
    columnProfiles,
    uniformityReport: uniformity,
    summary,
    isMultiFile: parsedFiles.length > 1,
  };
}

/**
 * Evaluates column uniformity across multiple files
 */
export function evaluateUniformity(files: ParsedFile[]): UniformityReport {
  if (files.length === 0) {
    return {
      isUniform: true,
      canonicalColumns: [],
      totalFiles: 0,
      matchedFiles: 0,
      mismatchedFiles: 0,
      fileDetails: [],
      schemaRecommendations: [],
    };
  }

  // Count occurrence frequency of every column name (normalized lowercase)
  const colFrequency = new Map<string, { originalName: string; count: number }>();
  files.forEach(f => {
    f.columns.forEach(col => {
      const lower = col.toLowerCase();
      const existing = colFrequency.get(lower);
      if (existing) {
        existing.count += 1;
      } else {
        colFrequency.set(lower, { originalName: col, count: 1 });
      }
    });
  });

  // Canonical columns: columns present in the first file or present in majority of files
  // If first file has good representation, use its order; otherwise order by frequency
  const firstFileCols = files[0].columns;
  const canonicalSet = new Set<string>();
  const canonicalColumns: string[] = [];

  // Add columns that appear in at least 50% of the files or from first file
  firstFileCols.forEach(col => {
    canonicalColumns.push(col);
    canonicalSet.add(col.toLowerCase());
  });

  colFrequency.forEach(({ originalName, count }, lower) => {
    if (!canonicalSet.has(lower) && count >= Math.ceil(files.length / 2)) {
      canonicalColumns.push(originalName);
      canonicalSet.add(lower);
    }
  });

  // Check each file against canonical schema
  let matchedFiles = 0;
  let mismatchedFiles = 0;
  const recommendations: string[] = [];

  const fileDetails = files.map(file => {
    const fileColSet = new Set(file.columns.map(c => c.toLowerCase()));
    const missing = canonicalColumns.filter(c => !fileColSet.has(c.toLowerCase()));
    const extra = file.columns.filter(c => !canonicalSet.has(c.toLowerCase()));

    const isMatch = missing.length === 0 && extra.length === 0;
    if (isMatch) matchedFiles++;
    else mismatchedFiles++;

    let status: 'perfect' | 'subset' | 'divergent' = 'perfect';
    if (missing.length > 0 && extra.length === 0) status = 'subset';
    else if (missing.length > 0 || extra.length > 0) status = 'divergent';

    if (missing.length > 0) {
      recommendations.push(
        `File "${file.name}" is missing ${missing.length} expected column(s): ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}.`
      );
    }
    if (extra.length > 0) {
      recommendations.push(
        `File "${file.name}" has ${extra.length} unmapped additional column(s): ${extra.slice(0, 3).join(', ')}.`
      );
    }

    return {
      name: file.name,
      rowCount: file.rowCount,
      matchingCount: file.columns.length - missing.length,
      missingColumns: missing,
      extraColumns: extra,
      status,
    };
  });

  const isUniform = mismatchedFiles === 0;

  return {
    isUniform,
    canonicalColumns,
    totalFiles: files.length,
    matchedFiles,
    mismatchedFiles,
    fileDetails,
    schemaRecommendations: recommendations,
  };
}

/**
 * Exports data back to an Excel (.xlsx) file in browser memory
 */
export function exportToExcel(
  data: Record<string, any>[],
  columns: string[],
  fileName: string = 'LocalSheet_Analyzed_Export.xlsx'
) {
  // Filter out internal properties like _source_file, _row_id if desired or preserve them
  const exportRows = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      obj[col] = row[col] ?? '';
    });
    if (row._source_file) {
      obj['Source File'] = row._source_file;
    }
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidated Data');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports data to CSV in browser memory
 */
export function exportToCSV(
  data: Record<string, any>[],
  columns: string[],
  fileName: string = 'LocalSheet_Analyzed_Export.csv'
) {
  const exportRows = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      obj[col] = row[col] ?? '';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
