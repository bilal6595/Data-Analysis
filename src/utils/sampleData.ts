import * as XLSX from 'xlsx';
import { AggregatedDataset } from '../types/data';
import { parseMultipleFiles } from './excelParser';

/**
 * Generates synthetic realistic data rows for uniform retail branches
 */
function generateRetailQuarterRows(quarter: string, filePrefix: string, rowCount: number): Record<string, any>[] {
  const regions = ['North America', 'Western Europe', 'Asia Pacific', 'Latin America'];
  const categories = ['Hardware Systems', 'Peripherals & Displays', 'Audio & Acoustics', 'Smart Accessories', 'Care Subscriptions'];
  const channels = ['Direct Online', 'Retail Store', 'Enterprise Partner'];

  const rows: Record<string, any>[] = [];
  const baseDates = {
    Q1: ['2024-01-15', '2024-02-10', '2024-03-22'],
    Q2: ['2024-04-12', '2024-05-18', '2024-06-25'],
    Q3: ['2024-07-14', '2024-08-19', '2024-09-28'],
    Q4: ['2024-10-10', '2024-11-20', '2024-12-18'],
  }[quarter] || ['2024-01-15', '2024-02-10', '2024-03-22'];

  for (let i = 1; i <= rowCount; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const date = baseDates[Math.floor(Math.random() * baseDates.length)];

    let basePrice = 280;
    if (category === 'Hardware Systems') basePrice = 1450;
    else if (category === 'Peripherals & Displays') basePrice = 620;
    else if (category === 'Audio & Acoustics') basePrice = 340;
    else if (category === 'Care Subscriptions') basePrice = 199;

    const units = Math.floor(Math.random() * 15) + 1;
    // Introduce an occasional outlier
    const isOutlier = i === 12 && quarter === 'Q3';
    const finalUnits = isOutlier ? 180 : units;

    const discountRate = Math.round((Math.random() * 0.18) * 100) / 100;
    const grossSales = Math.round(basePrice * finalUnits);
    const discountAmount = Math.round(grossSales * discountRate);
    const netRevenue = grossSales - discountAmount;
    const costOfGoods = Math.round(netRevenue * (0.42 + Math.random() * 0.1));
    const grossProfit = netRevenue - costOfGoods;
    const marginPct = Math.round((grossProfit / netRevenue) * 1000) / 10;
    const customerSatisfaction = Math.round((4.0 + Math.random() * 1.0) * 10) / 10;

    rows.push({
      Transaction_ID: `TXN-${quarter}-${1000 + i}`,
      Date: date,
      Quarter: `2024-${quarter}`,
      Region: region,
      Product_Category: category,
      Sales_Channel: channel,
      Units_Sold: finalUnits,
      Unit_Price: basePrice,
      Discount_Rate: discountRate,
      Net_Revenue: netRevenue,
      Cost_of_Goods: costOfGoods,
      Gross_Profit: grossProfit,
      Profit_Margin_Pct: marginPct,
      Satisfaction_Score: customerSatisfaction,
    });
  }

  return rows;
}

/**
 * Creates mock File objects formatted as Excel workbooks in memory
 */
export async function createSampleUniformFolderFiles(): Promise<File[]> {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const files: File[] = [];

  for (const q of quarters) {
    const rows = generateRetailQuarterRows(q, `Retail_Sales_2024_${q}`, 60);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Sales_${q}`);

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = `Retail_Branch_2024_${q}.xlsx`;
    const file = new File([excelBuffer], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      lastModified: Date.now() - (4 - quarters.indexOf(q)) * 86400000 * 30,
    });
    // mock webkitRelativePath
    Object.defineProperty(file, 'webkitRelativePath', {
      value: `Quarterly_Reports_2024/${fileName}`,
      writable: false,
    });
    files.push(file);
  }

  return files;
}

/**
 * Loads sample aggregated dataset directly
 */
export async function loadSampleDataset(): Promise<AggregatedDataset> {
  const files = await createSampleUniformFolderFiles();
  return parseMultipleFiles(files);
}

/**
 * Download a zip or sample files to user's disk so they can test their folder picker
 */
export async function downloadSampleFilesIndividually() {
  const files = await createSampleUniformFolderFiles();
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // slight delay
    await new Promise(r => setTimeout(r, 200));
  }
}
