export type ColumnType = 'number' | 'string' | 'date' | 'boolean';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  sampleValues: any[];
  // Numeric metrics
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  sum?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  // Categorical metrics
  topFrequencies?: { value: string; count: number; percentage: number }[];
}

export interface ParsedFile {
  id: string;
  name: string;
  path?: string;
  size: number;
  lastModified?: number;
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
  sheetNames: string[];
  selectedSheet: string;
  isValidUniform: boolean;
  missingColumns: string[];
  extraColumns: string[];
}

export interface UniformityReport {
  isUniform: boolean;
  canonicalColumns: string[];
  totalFiles: number;
  matchedFiles: number;
  mismatchedFiles: number;
  fileDetails: {
    name: string;
    rowCount: number;
    matchingCount: number;
    missingColumns: string[];
    extraColumns: string[];
    status: 'perfect' | 'subset' | 'divergent';
  }[];
  schemaRecommendations: string[];
}

export interface AnomalyItem {
  id: string;
  column: string;
  value: any;
  rowIndex: number;
  expectedRange: string;
  deviation: string;
  severity: 'high' | 'medium';
  rowSnippet: Record<string, any>;
}

export interface CorrelationItem {
  var1: string;
  var2: string;
  coefficient: number;
  interpretation: string;
  strength: 'strong_positive' | 'moderate_positive' | 'none' | 'moderate_negative' | 'strong_negative';
}

export interface HeadlineKpi {
  id: string;
  label: string;
  value: string;
  secondary?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  badge?: string;
}

export interface DriverItem {
  category: string;
  dimension: string;
  metric: string;
  topContributor: string;
  sharePct: number;
  impactNarrative: string;
}

export interface DataQualityReport {
  overallScore: number; // 0 to 100
  totalCells: number;
  missingCells: number;
  duplicateRows: number;
  typeInconsistencies: number;
  flags: {
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
  }[];
}

export interface AnalysisSummary {
  executiveNarrative: string[];
  headlineKpis: HeadlineKpi[];
  drivers: DriverItem[];
  anomalies: AnomalyItem[];
  correlations: CorrelationItem[];
  timeSeriesInsight?: {
    dateColumn: string;
    metricColumn: string;
    overallTrend: 'increasing' | 'decreasing' | 'cyclical' | 'stable';
    summary: string;
    monthlyData: { period: string; value: number }[];
  };
  qualityReport: DataQualityReport;
}

export interface AggregatedDataset {
  files: ParsedFile[];
  mergedRows: Record<string, any>[];
  columns: string[];
  columnProfiles: Record<string, ColumnProfile>;
  uniformityReport: UniformityReport;
  summary: AnalysisSummary;
  isMultiFile: boolean;
}
