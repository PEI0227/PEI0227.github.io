import { SymbolInfo, BarData } from './types';

export const SYMBOLS: SymbolInfo[] = [
  { code: 'ag2512', name: '沪银2512', basePrice: 7100, multiplier: 15, volatility: 0.008, sector: 'metal' },
  { code: 'au2512', name: '沪金2512', basePrice: 600, multiplier: 1000, volatility: 0.005, sector: 'metal' },
  { code: 'rb2501', name: '螺纹2501', basePrice: 3300, multiplier: 10, volatility: 0.006, sector: 'metal' },
  { code: 'hc2501', name: '热卷2501', basePrice: 3400, multiplier: 10, volatility: 0.007, sector: 'metal' },
  { code: 'ss2501', name: '不锈钢2501', basePrice: 13500, multiplier: 5, volatility: 0.006, sector: 'metal' },
  { code: 'cu2501', name: '沪铜2501', basePrice: 68000, multiplier: 5, volatility: 0.007, sector: 'metal' },
  { code: 'al2501', name: '沪铝2501', basePrice: 19000, multiplier: 5, volatility: 0.006, sector: 'metal' },
  { code: 'zn2501', name: '沪锌2501', basePrice: 21000, multiplier: 5, volatility: 0.008, sector: 'metal' },
  
  { code: 'sc2501', name: '原油2501', basePrice: 530, multiplier: 1000, volatility: 0.015, sector: 'energy' },
  { code: 'fu2501', name: '燃油2501', basePrice: 3000, multiplier: 10, volatility: 0.012, sector: 'energy' },
  { code: 'pg2501', name: 'LPG2501', basePrice: 4800, multiplier: 20, volatility: 0.014, sector: 'energy' },
  { code: 'j2501',  name: '焦炭2501', basePrice: 2000, multiplier: 100, volatility: 0.011, sector: 'energy' },
  
  { code: 'FG2501', name: '玻璃2501', basePrice: 1200, multiplier: 20, volatility: 0.012, sector: 'chemical' },
  { code: 'SA2501', name: '纯碱2501', basePrice: 1600, multiplier: 20, volatility: 0.015, sector: 'chemical' },
  { code: 'MA2501', name: '甲醇2501', basePrice: 2400, multiplier: 10, volatility: 0.010, sector: 'chemical' },
  { code: 'TA2501', name: 'PTA2501',  basePrice: 5800, multiplier: 5, volatility: 0.009, sector: 'chemical' },
  
  { code: 'lh2501', name: '生猪2501', basePrice: 14500, multiplier: 16, volatility: 0.010, sector: 'agri' },
  { code: 'p2501',  name: '棕榈2501', basePrice: 7200, multiplier: 10, volatility: 0.009, sector: 'agri' },
  { code: 'm2501',  name: '豆粕2501', basePrice: 3100, multiplier: 10, volatility: 0.008, sector: 'agri' },
  
  { code: 'IF2501', name: '沪深300', basePrice: 3400, multiplier: 300, volatility: 0.012, sector: 'index' },
];

// Consistent random seed helper
let seed = 123456;
const random = () => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const generateMarketData = (totalBars: number, timeFrameMult: number = 1): Record<string, BarData[]> => {
  // Reset seed to ensure reproducibility for the same session, but allow variation if needed
  seed = Date.now(); 
  
  const allData: Record<string, BarData[]> = {};
  const startTime = Math.floor(new Date("2024-01-01 09:00").getTime() / 1000);

  // 1. Global Market Trend (Macro)
  const macroTrend = new Array(totalBars).fill(0).map(() => (random() - 0.5) * 0.004);
  
  // 2. Sector Trends (Mid-level correlation)
  const sectors = Array.from(new Set(SYMBOLS.map(s => s.sector)));
  const sectorTrends: Record<string, number[]> = {};
  sectors.forEach(sec => {
     sectorTrends[sec] = new Array(totalBars).fill(0).map(() => (random() - 0.5) * 0.008);
  });

  SYMBOLS.forEach(sym => {
    const bars: BarData[] = [];
    let price = sym.basePrice * (1 + (random() - 0.5) * 0.05); 
    
    // Unique noise offset per symbol to prevent identical charts
    const uniqueOffset = random() * 1000; 

    for (let i = 0; i < totalBars; i++) {
      // Base Volatility
      const vol = sym.volatility * Math.sqrt(timeFrameMult);
      const noise = (Math.sin(uniqueOffset + i * 0.1) * 0.001) + ((random() - 0.5) * vol);
      
      // Correlation factors
      const macro = macroTrend[i]; 
      const sect = sectorTrends[sym.sector][i];

      // Weighted change: 50% idiosyncratic (unique), 30% sector, 20% macro
      // Increased idiosyncratic weight to fix "charts look the same" issue
      const percentChange = (noise * 0.5) + (sect * 0.3) + (macro * 0.2);
      
      const close = price * (1 + percentChange);
      const high = Math.max(price, close) * (1 + Math.abs(random() * vol * 0.6));
      const low = Math.min(price, close) * (1 - Math.abs(random() * vol * 0.6));
      
      // Volume simulation
      const moveSize = Math.abs(close - price) / price;
      const baseVol = 10000;
      const volume = Math.floor(baseVol * (1 + moveSize * 200) * (0.2 + random()));

      bars.push({
        time: startTime + i * 60 * timeFrameMult,
        open: price,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    allData[sym.code] = bars;
  });

  return allData;
};