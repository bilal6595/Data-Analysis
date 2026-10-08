import {
  ColumnProfile,
  ColumnType,
  ParsedFile,
  AnalysisSummary,
  HeadlineKpi,
  AnomalyItem,
  CorrelationItem,
  DriverItem,
  DataQualityReport,
} from '../types/data';

/**
 * Infer column type from non-null sample values
 */
export function inferColumnType(values: any[]): ColumnType {
  const nonNulls = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNulls.length === 0) return 'string';

  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;

  for (const val of nonNulls.slice(0, 200)) {
    if (typeof val === 'number' && !isNaN(val)) {
      numCount++;
    } else if (typeof val === 'boolean') {
      boolCount++;
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      if (/^(true|false|yes|no)$/i.test(trimmed)) {
        boolCount++;
      } else if (!isNaN(Number(trimmed)) && trimmed !== '') {
        numCount++;
      } else if (!isNaN(Date.parse(trimmed)) && trimmed.length >= 8 && /\d{4}|\d{2}\/\d{2}/.test(trimmed)) {
        dateCount++;
      }
    }
  }

  const sampleSize = Math.min(nonNulls.length, 200);
  if (numCount / sampleSize >= 0.75) return 'number';
  if (dateCount / sampleSize >= 0.75) return 'date';
  if (boolCount / sampleSize >= 0.75) return 'boolean';
  return 'string';
}

/**
 * Formats numbers into human-readable compact or currency/comma strings
 */
export function formatMetricNumber(val: number | undefined | null, isCurrencyHint: boolean = false): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  const abs = Math.abs(val);

  const prefix = isCurrencyHint ? '$' : '';
  if (abs >= 1_000_000_000) {
    return `${prefix}${(val / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}B`;
  }
  if (abs >= 1_000_000) {
    return `${prefix}${(val / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  }
  if (abs >= 10_000) {
    return `${prefix}${(val / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
  }
  if (abs < 1 && abs > 0) {
    return `${prefix}${val.toLocaleString(undefined, { maximumFractionDigits: 3 })}`;
  }
  return `${prefix}${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/**
 * Calculates median and quartiles
 */
function getQuartiles(sorted: number[]): { median: number; q1: number; q3: number; iqr: number } {
  if (sorted.length === 0) return { median: 0, q1: 0, q3: 0, iqr: 0 };
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = sorted.length % 2 !== 0 ? sorted.slice(mid + 1) : sorted.slice(mid);

  const q1 = lowerHalf.length === 0 ? sorted[0] : (
    lowerHalf.length % 2 !== 0 ? lowerHalf[Math.floor(lowerHalf.length / 2)] : (lowerHalf[Math.floor(lowerHalf.length / 2) - 1] + lowerHalf[Math.floor(lowerHalf.length / 2)]) / 2
  );

  const q3 = upperHalf.length === 0 ? sorted[sorted.length - 1] : (
    upperHalf.length % 2 !== 0 ? upperHalf[Math.floor(upperHalf.length / 2)] : (upperHalf[Math.floor(upperHalf.length / 2) - 1] + upperHalf[Math.floor(upperHalf.length / 2)]) / 2
  );

  return { median, q1, q3, iqr: q3 - q1 };
}

/**
 * Generates descriptive profile for each column
 */
export function buildColumnProfiles(
  rows: Record<string, any>[],
  columns: string[]
): Record<string, ColumnProfile> {
  const profiles: Record<string, ColumnProfile> = {};

  columns.forEach(col => {
    const rawValues = rows.map(r => r[col]);
    const inferredType = inferColumnType(rawValues);
    const nonNullValues = rawValues.filter(v => v !== null && v !== undefined && v !== '');
    const nullCount = rows.length - nonNullValues.length;

    const profile: ColumnProfile = {
      name: col,
      type: inferredType,
      nullCount,
      uniqueCount: new Set(nonNullValues.map(v => String(v))).size,
      sampleValues: nonNullValues.slice(0, 5),
    };

    if (inferredType === 'number') {
      const numList = nonNullValues
        .map(v => (typeof v === 'number' ? v : parseFloat(String(v))))
        .filter(v => !isNaN(v) && isFinite(v))
        .sort((a, b) => a - b);

      if (numList.length > 0) {
        const sum = numList.reduce((acc, curr) => acc + curr, 0);
        const mean = sum / numList.length;
        const min = numList[0];
        const max = numList[numList.length - 1];

        // Variance & standard deviation
        const variance = numList.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (numList.length > 1 ? numList.length - 1 : 1);
        const stdDev = Math.sqrt(variance);

        const { median, q1, q3, iqr } = getQuartiles(numList);

        profile.min = min;
        profile.max = max;
        profile.mean = mean;
        profile.median = median;
        profile.stdDev = stdDev;
        profile.sum = sum;
        profile.q1 = q1;
        profile.q3 = q3;
        profile.iqr = iqr;
      }
    } else if (inferredType === 'string' || inferredType === 'boolean') {
      // Frequency distribution
      const counts: Record<string, number> = {};
      nonNullValues.forEach(v => {
        const str = String(v);
        counts[str] = (counts[str] || 0) + 1;
      });

      const sortedFreqs = Object.entries(counts)
        .map(([value, count]) => ({
          value,
          count,
          percentage: (count / Math.max(1, nonNullValues.length)) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      profile.topFrequencies = sortedFreqs;
    }

    profiles[col] = profile;
  });

  return profiles;
}

/**
 * Detects numerical outliers via IQR and extreme deviation
 */
export function detectAnomalies(
  rows: Record<string, any>[],
  profiles: Record<string, ColumnProfile>
): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];

  Object.entries(profiles).forEach(([col, profile]) => {
    if (profile.type !== 'number' || profile.q1 === undefined || profile.q3 === undefined || profile.iqr === undefined) {
      return;
    }

    // Skip if distribution has no spread (all identical values)
    if (profile.iqr === 0 || profile.stdDev === 0) return;

    const lowerBound = profile.q1 - 2.5 * profile.iqr;
    const upperBound = profile.q3 + 2.5 * profile.iqr;

    rows.forEach((row, idx) => {
      const val = row[col];
      if (typeof val !== 'number' || isNaN(val)) return;

      if (val < lowerBound || val > upperBound) {
        const isHigh = val > upperBound;
        const diffFromMedian = Math.abs(val - (profile.median ?? 0));
        const zScore = profile.stdDev ? diffFromMedian / profile.stdDev : 0;

        anomalies.push({
          id: `anomaly-${col}-${idx}`,
          column: col,
          value: val,
          rowIndex: idx + 1,
          expectedRange: `[${formatMetricNumber(lowerBound)} - ${formatMetricNumber(upperBound)}]`,
          deviation: `${zScore.toFixed(1)}σ ${isHigh ? 'above' : 'below'} mean`,
          severity: zScore > 3.5 ? 'high' : 'medium',
          rowSnippet: row,
        });
      }
    });
  });

  // Limit to most significant 25 anomalies ordered by severity
  return anomalies
    .sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0))
    .slice(0, 25);
}

/**
 * Computes Pearson correlation between numeric columns
 */
export function computeCorrelations(
  rows: Record<string, any>[],
  profiles: Record<string, ColumnProfile>
): CorrelationItem[] {
  const numericCols = Object.keys(profiles).filter(col => profiles[col].type === 'number');
  if (numericCols.length < 2) return [];

  const correlations: CorrelationItem[] = [];

  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const colA = numericCols[i];
      const colB = numericCols[j];

      const validPairs: [number, number][] = [];
      rows.forEach(r => {
        const valA = r[colA];
        const valB = r[colB];
        if (
          typeof valA === 'number' && !isNaN(valA) &&
          typeof valB === 'number' && !isNaN(valB)
        ) {
          validPairs.push([valA, valB]);
        }
      });

      if (validPairs.length < 5) continue;

      const n = validPairs.length;
      let sumA = 0;
      let sumB = 0;
      let sumAB = 0;
      let sumA2 = 0;
      let sumB2 = 0;

      validPairs.forEach(([a, b]) => {
        sumA += a;
        sumB += b;
        sumAB += a * b;
        sumA2 += a * a;
        sumB2 += b * b;
      });

      const numerator = n * sumAB - sumA * sumB;
      const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

      if (denominator === 0 || isNaN(denominator)) continue;

      const r = numerator / denominator;
      const absR = Math.abs(r);

      if (absR >= 0.35) {
        let strength: CorrelationItem['strength'] = 'none';
        let interpretation = '';

        if (r >= 0.7) {
          strength = 'strong_positive';
          interpretation = `Strong positive coupling: As ${colA} climbs, ${colB} tends to rise sharply.`;
        } else if (r >= 0.35) {
          strength = 'moderate_positive';
          interpretation = `Moderate positive association: ${colA} and ${colB} frequently track in the same direction.`;
        } else if (r <= -0.7) {
          strength = 'strong_negative';
          interpretation = `Strong inverse tradeoff: Higher ${colA} consistently corresponds to lower ${colB}.`;
        } else if (r <= -0.35) {
          strength = 'moderate_negative';
          interpretation = `Moderate inverse correlation: As ${colA} increases, ${colB} moderately declines.`;
        }

        correlations.push({
          var1: colA,
          var2: colB,
          coefficient: parseFloat(r.toFixed(3)),
          interpretation,
          strength,
        });
      }
    }
  }

  return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)).slice(0, 8);
}

/**
 * Computes Pareto and top driver metrics
 */
export function computeDrivers(
  rows: Record<string, any>[],
  profiles: Record<string, ColumnProfile>
): DriverItem[] {
  const categoricalCols = Object.keys(profiles).filter(
    col => profiles[col].type === 'string' && (profiles[col].uniqueCount <= 50 && profiles[col].uniqueCount > 1)
  );
  const numericCols = Object.keys(profiles).filter(col => profiles[col].type === 'number');

  if (categoricalCols.length === 0 || numericCols.length === 0) return [];

  // Pick top 2 most significant numeric columns (e.g. highest sum or volume)
  const sortedNumeric = [...numericCols].sort((a, b) => (profiles[b].sum ?? 0) - (profiles[a].sum ?? 0));
  const targetMetrics = sortedNumeric.slice(0, 2);

  const drivers: DriverItem[] = [];

  targetMetrics.forEach(metricCol => {
    categoricalCols.slice(0, 3).forEach(catCol => {
      const totals: Record<string, number> = {};
      let totalMetricSum = 0;

      rows.forEach(r => {
        const catVal = String(r[catCol] ?? 'Unspecified');
        const numVal = r[metricCol];
        if (typeof numVal === 'number' && !isNaN(numVal)) {
          totals[catVal] = (totals[catVal] || 0) + numVal;
          totalMetricSum += numVal;
        }
      });

      if (totalMetricSum <= 0) return;

      const sortedEntries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      if (sortedEntries.length > 0) {
        const [topCat, topVal] = sortedEntries[0];
        const share = (topVal / totalMetricSum) * 100;

        drivers.push({
          category: catCol,
          dimension: catCol,
          metric: metricCol,
          topContributor: topCat,
          sharePct: parseFloat(share.toFixed(1)),
          impactNarrative: `"${topCat}" generates ${share.toFixed(1)}% of all ${metricCol} (${formatMetricNumber(topVal)} of ${formatMetricNumber(totalMetricSum)}).`,
        });
      }
    });
  });

  return drivers.slice(0, 6);
}

/**
 * Evaluates temporal trends if a date column exists
 */
export function computeTimeSeriesTrend(
  rows: Record<string, any>[],
  profiles: Record<string, ColumnProfile>
): AnalysisSummary['timeSeriesInsight'] | undefined {
  const dateCols = Object.keys(profiles).filter(col => profiles[col].type === 'date');
  const numericCols = Object.keys(profiles).filter(col => profiles[col].type === 'number');

  if (dateCols.length === 0 || numericCols.length === 0) return undefined;

  const dateCol = dateCols[0];
  const primaryMetric = numericCols.find(c => /revenue|sales|amount|total|volume|profit|cost/i.test(c)) || numericCols[0];

  // Group by YYYY-MM
  const periodBuckets: Record<string, number> = {};

  rows.forEach(r => {
    const dVal = r[dateCol];
    const nVal = r[primaryMetric];
    if (dVal && typeof nVal === 'number' && !isNaN(nVal)) {
      const str = String(dVal);
      const ym = str.substring(0, 7); // YYYY-MM
      if (/^\d{4}-\d{2}$/.test(ym)) {
        periodBuckets[ym] = (periodBuckets[ym] || 0) + nVal;
      }
    }
  });

  const sortedPeriods = Object.entries(periodBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, value]) => ({ period, value }));

  if (sortedPeriods.length < 2) return undefined;

  const firstVal = sortedPeriods[0].value;
  const lastVal = sortedPeriods[sortedPeriods.length - 1].value;
  const growthRate = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;

  let overallTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (growthRate > 8) overallTrend = 'increasing';
  else if (growthRate < -8) overallTrend = 'decreasing';

  const summary = `${primaryMetric} tracked across ${sortedPeriods.length} time periods, moving from ${formatMetricNumber(firstVal)} in ${sortedPeriods[0].period} to ${formatMetricNumber(lastVal)} in ${sortedPeriods[sortedPeriods.length - 1].period} (${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}% net trend).`;

  return {
    dateColumn: dateCol,
    metricColumn: primaryMetric,
    overallTrend,
    summary,
    monthlyData: sortedPeriods,
  };
}

/**
 * Assesses data completeness, quality, and duplicate records
 */
export function assessDataQuality(
  rows: Record<string, any>[],
  columns: string[],
  parsedFiles: ParsedFile[]
): DataQualityReport {
  const totalCells = rows.length * Math.max(1, columns.length);
  let missingCells = 0;

  columns.forEach(col => {
    rows.forEach(r => {
      const val = r[col];
      if (val === null || val === undefined || val === '') {
        missingCells++;
      }
    });
  });

  // Check duplicate rows using fingerprint of first 5 columns
  const seenFingerprints = new Set<string>();
  let duplicateRows = 0;
  const checkCols = columns.slice(0, 5);

  rows.forEach(r => {
    const key = checkCols.map(c => String(r[c] ?? '')).join('|||');
    if (seenFingerprints.has(key)) {
      duplicateRows++;
    } else {
      seenFingerprints.add(key);
    }
  });

  const flags: DataQualityReport['flags'] = [];

  const missingPct = totalCells > 0 ? (missingCells / totalCells) * 100 : 0;
  if (missingPct > 15) {
    flags.push({
      type: 'warning',
      title: 'High Incompleteness Rate',
      description: `${missingPct.toFixed(1)}% of data cells are null or empty across imported files.`,
    });
  } else if (missingPct > 0) {
    flags.push({
      type: 'info',
      title: 'Minor Missingness',
      description: `${missingCells.toLocaleString()} empty values detected (${missingPct.toFixed(1)}% of cells).`,
    });
  }

  if (duplicateRows > 0) {
    flags.push({
      type: 'warning',
      title: 'Duplicate Rows Detected',
      description: `Identified ${duplicateRows.toLocaleString()} rows with matching structural keys.`,
    });
  }

  // Check multi-file uniform consistency
  const mismatched = parsedFiles.filter(f => !f.isValidUniform);
  if (mismatched.length > 0) {
    flags.push({
      type: 'critical',
      title: 'Schema Non-Uniformity',
      description: `${mismatched.length} file(s) deviated from the canonical column specification.`,
    });
  }

  // Quality score formula: 100 base, penalize for missingness, duplicates, non-uniform files
  let score = 100;
  score -= Math.min(30, missingPct * 1.5);
  score -= Math.min(25, (duplicateRows / Math.max(1, rows.length)) * 50);
  score -= mismatched.length * 10;
  const overallScore = Math.max(10, Math.min(100, Math.round(score)));

  return {
    overallScore,
    totalCells,
    missingCells,
    duplicateRows,
    typeInconsistencies: 0,
    flags,
  };
}

/**
 * Builds headline KPI cards
 */
export function buildHeadlineKpis(
  rows: Record<string, any>[],
  profiles: Record<string, ColumnProfile>,
  parsedFiles: ParsedFile[]
): HeadlineKpi[] {
  const kpis: HeadlineKpi[] = [];

  // Total records / rows
  kpis.push({
    id: 'total-rows',
    label: 'Total Analyzed Records',
    value: rows.length.toLocaleString(),
    secondary: parsedFiles.length > 1 ? `Aggregated across ${parsedFiles.length} files` : 'Single file source',
    badge: '100% Local In-Memory',
  });

  // Top numeric metrics
  const numericCols = Object.keys(profiles).filter(col => profiles[col].type === 'number');

  // Find revenue / total / volume / profit / cost or top metric
  const priorityNumeric = numericCols.find(c => /revenue|sales|total|amount/i.test(c)) || numericCols[0];

  if (priorityNumeric && profiles[priorityNumeric]) {
    const prof = profiles[priorityNumeric];
    const isCurrency = /revenue|sales|price|cost|amount|budget/i.test(priorityNumeric);
    kpis.push({
      id: 'kpi-primary-sum',
      label: `Total ${priorityNumeric}`,
      value: formatMetricNumber(prof.sum, isCurrency),
      secondary: `Avg ${formatMetricNumber(prof.mean, isCurrency)} · Median ${formatMetricNumber(prof.median, isCurrency)}`,
      trend: 'neutral',
    });
  }

  // Second numeric metric or volume count
  const secondNumeric = numericCols.filter(c => c !== priorityNumeric)[0];
  if (secondNumeric && profiles[secondNumeric]) {
    const prof = profiles[secondNumeric];
    const isCurrency = /revenue|sales|price|cost|amount|budget/i.test(secondNumeric);
    kpis.push({
      id: 'kpi-secondary-sum',
      label: `Total ${secondNumeric}`,
      value: formatMetricNumber(prof.sum, isCurrency),
      secondary: `Min ${formatMetricNumber(prof.min, isCurrency)} · Max ${formatMetricNumber(prof.max, isCurrency)}`,
      trend: 'neutral',
    });
  }

  // Schema Uniformity Metric
  const uniformFiles = parsedFiles.filter(f => f.isValidUniform).length;
  kpis.push({
    id: 'uniformity-score',
    label: 'Format Uniformity',
    value: `${((uniformFiles / Math.max(1, parsedFiles.length)) * 100).toFixed(0)}%`,
    secondary: `${uniformFiles} of ${parsedFiles.length} files matched schema perfectly`,
    trend: uniformFiles === parsedFiles.length ? 'up' : 'down',
  });

  return kpis;
}

/**
 * Synthesizes automated executive briefing paragraphs
 */
export function generateExecutiveNarrative(
  rows: Record<string, any>[],
  columns: string[],
  profiles: Record<string, ColumnProfile>,
  parsedFiles: ParsedFile[],
  drivers: DriverItem[],
  correlations: CorrelationItem[],
  anomalies: AnomalyItem[],
  timeTrend?: AnalysisSummary['timeSeriesInsight']
): string[] {
  const paragraphs: string[] = [];

  // Paragraph 1: Scope & File Uniformity Overview
  const fileWord = parsedFiles.length > 1 ? `${parsedFiles.length} uniform Excel files` : `1 Excel source file`;
  const rowCountFormatted = rows.length.toLocaleString();
  const colCount = columns.length;
  const uniformStatus = parsedFiles.every(f => f.isValidUniform)
    ? 'All files matched the canonical schema specification seamlessly without column drift.'
    : 'Minor column variations were detected across files and harmonized into the canonical layout.';

  paragraphs.push(
    `This audit synthesizes ${rowCountFormatted} operational records across ${colCount} dimensions extracted from ${fileWord}. ${uniformStatus} All calculations executed entirely within local memory on your device, ensuring zero external transmission of sensitive figures.`
  );

  // Paragraph 2: Core Volume & Concentration Drivers
  const numericCols = Object.keys(profiles).filter(col => profiles[col].type === 'number');
  if (numericCols.length > 0) {
    const topMetric = numericCols.find(c => /revenue|sales|total|amount/i.test(c)) || numericCols[0];
    const prof = profiles[topMetric];
    const isCurrency = /revenue|sales|price|cost|amount|budget/i.test(topMetric);
    let driverText = '';

    const relevantDriver = drivers.find(d => d.metric === topMetric) || drivers[0];
    if (relevantDriver) {
      driverText = ` Notable concentration exists in ${relevantDriver.dimension}, where "${relevantDriver.topContributor}" accounts for ${relevantDriver.sharePct}% of aggregate ${topMetric}.`;
    }

    paragraphs.push(
      `Volume for "${topMetric}" totals ${formatMetricNumber(prof.sum, isCurrency)}, running at an average of ${formatMetricNumber(prof.mean, isCurrency)} per entry with a standard deviation of ${formatMetricNumber(prof.stdDev, isCurrency)}.${driverText}`
    );
  }

  // Paragraph 3: Time Series & Trend Direction
  if (timeTrend) {
    paragraphs.push(
      `Temporal trajectory: ${timeTrend.summary} The distribution exhibits an ${timeTrend.overallTrend} trajectory across monitored calendar intervals.`
    );
  }

  // Paragraph 4: Risk, Variance & Statistical Outliers
  if (anomalies.length > 0) {
    const highSev = anomalies.filter(a => a.severity === 'high');
    paragraphs.push(
      `Statistical anomaly profiling identified ${anomalies.length} entries deviating beyond 2.5 interquartile spreads (${highSev.length} high-severity outliers). These warrant operational spot-checks to verify whether they represent high-magnitude transactions or data-entry artifacts.`
    );
  } else {
    paragraphs.push(
      `Data stability is strong: no extreme numerical outliers exceeding 2.5 interquartile bounds were identified across continuous fields.`
    );
  }

  // Paragraph 5: Inter-variable Correlations & Strategic Dynamics
  if (correlations.length > 0) {
    const topCorr = correlations[0];
    paragraphs.push(
      `Structural correlation discovery: ${topCorr.interpretation} (Pearson r = ${topCorr.coefficient > 0 ? '+' : ''}${topCorr.coefficient}). Understanding this coupling enables better forecasting and sensitivity modeling.`
    );
  }

  return paragraphs;
}

/**
 * Master analysis pipeline run on parsed data
 */
export function runFullAnalysis(
  rows: Record<string, any>[],
  columns: string[],
  parsedFiles: ParsedFile[]
): { columnProfiles: Record<string, ColumnProfile>; summary: AnalysisSummary } {
  const columnProfiles = buildColumnProfiles(rows, columns);
  const anomalies = detectAnomalies(rows, columnProfiles);
  const correlations = computeCorrelations(rows, columnProfiles);
  const drivers = computeDrivers(rows, columnProfiles);
  const timeSeriesInsight = computeTimeSeriesTrend(rows, columnProfiles);
  const qualityReport = assessDataQuality(rows, columns, parsedFiles);
  const headlineKpis = buildHeadlineKpis(rows, columnProfiles, parsedFiles);
  const executiveNarrative = generateExecutiveNarrative(
    rows,
    columns,
    columnProfiles,
    parsedFiles,
    drivers,
    correlations,
    anomalies,
    timeSeriesInsight
  );

  const summary: AnalysisSummary = {
    executiveNarrative,
    headlineKpis,
    drivers,
    anomalies,
    correlations,
    timeSeriesInsight,
    qualityReport,
  };

  return {
    columnProfiles,
    summary,
  };
}
