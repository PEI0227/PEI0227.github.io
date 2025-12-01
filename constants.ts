import { SymbolInfo, BarData, MacroEvent, TimeFrame } from './types';

export const SYMBOLS: SymbolInfo[] = [
  // Precious Metals
  { code: 'ag2512', name: '沪银2512', basePrice: 7100, multiplier: 15, volatility: 0.008, sector: 'metal', marginRate: 0.12, fee: 3 },
  { code: 'au2512', name: '沪金2512', basePrice: 600, multiplier: 1000, volatility: 0.005, sector: 'metal', marginRate: 0.10, fee: 10 },
  
  // Base Metals
  { code: 'rb2501', name: '螺纹2501', basePrice: 3300, multiplier: 10, volatility: 0.006, sector: 'metal', marginRate: 0.13, fee: 5 },
  { code: 'hc2501', name: '热卷2501', basePrice: 3400, multiplier: 10, volatility: 0.007, sector: 'metal', marginRate: 0.13, fee: 5 },
  { code: 'ss2501', name: '不锈钢2501', basePrice: 13500, multiplier: 5, volatility: 0.006, sector: 'metal', marginRate: 0.10, fee: 5 },
  { code: 'cu2501', name: '沪铜2501', basePrice: 68000, multiplier: 5, volatility: 0.007, sector: 'metal', marginRate: 0.10, fee: 20 },
  { code: 'al2501', name: '沪铝2501', basePrice: 19000, multiplier: 5, volatility: 0.006, sector: 'metal', marginRate: 0.10, fee: 6 },
  { code: 'zn2501', name: '沪锌2501', basePrice: 21000, multiplier: 5, volatility: 0.008, sector: 'metal', marginRate: 0.10, fee: 6 },
  
  // Energy
  { code: 'sc2501', name: '原油2501', basePrice: 530, multiplier: 1000, volatility: 0.015, sector: 'energy', marginRate: 0.15, fee: 20 },
  { code: 'fu2501', name: '燃油2501', basePrice: 3000, multiplier: 10, volatility: 0.012, sector: 'energy', marginRate: 0.15, fee: 2 },
  { code: 'pg2501', name: 'LPG2501', basePrice: 4800, multiplier: 20, volatility: 0.014, sector: 'energy', marginRate: 0.15, fee: 10 },
  { code: 'j2501',  name: '焦炭2501', basePrice: 2000, multiplier: 100, volatility: 0.011, sector: 'energy', marginRate: 0.18, fee: 30 }, 
  
  // Chemicals
  { code: 'FG2501', name: '玻璃2501', basePrice: 1200, multiplier: 20, volatility: 0.012, sector: 'chemical', marginRate: 0.15, fee: 6 },
  { code: 'SA2501', name: '纯碱2501', basePrice: 1600, multiplier: 20, volatility: 0.015, sector: 'chemical', marginRate: 0.15, fee: 6 },
  { code: 'MA2501', name: '甲醇2501', basePrice: 2400, multiplier: 10, volatility: 0.010, sector: 'chemical', marginRate: 0.10, fee: 3 },
  { code: 'TA2501', name: 'PTA2501',  basePrice: 5800, multiplier: 5, volatility: 0.009, sector: 'chemical', marginRate: 0.10, fee: 3 },
  
  // Agriculture
  { code: 'lh2501', name: '生猪2501', basePrice: 14500, multiplier: 16, volatility: 0.010, sector: 'agri', marginRate: 0.15, fee: 20 },
  { code: 'p2501',  name: '棕榈2501', basePrice: 7200, multiplier: 10, volatility: 0.009, sector: 'agri', marginRate: 0.10, fee: 5 },
  { code: 'm2501',  name: '豆粕2501', basePrice: 3100, multiplier: 10, volatility: 0.008, sector: 'agri', marginRate: 0.10, fee: 2 },
  
  // Financial Index
  { code: 'IF2501', name: '沪深300', basePrice: 3400, multiplier: 300, volatility: 0.012, sector: 'index', marginRate: 0.12, fee: 50 },
];

const REAL_MACRO_EVENTS: { date: string, title: string, desc: string, impact: 'high'|'medium'|'low', bias: number }[] = [
    { date: '2024-01-31', title: '美联储利率决议', desc: '维持利率不变，鲍威尔暗示3月降息可能性低。', impact: 'high', bias: -0.015 },
    { date: '2024-02-13', title: '美国CPI数据', desc: '1月CPI同比增3.1%，高于预期，通胀粘性顽固。', impact: 'medium', bias: -0.008 },
    { date: '2024-03-20', title: '美联储利率决议', desc: '点阵图维持年内三次降息预期，市场情绪提振。', impact: 'high', bias: 0.012 },
    { date: '2024-04-12', title: '中东局势升级', desc: '地缘政治风险加剧，黄金原油避险大涨。', impact: 'high', bias: 0.02 },
    { date: '2024-05-01', title: '美联储利率决议', desc: '宣布放缓缩表速度，被视为鸽派信号。', impact: 'medium', bias: 0.005 },
    { date: '2024-06-07', title: '非农就业数据', desc: '新增非农就业大超预期，降息预期延后。', impact: 'high', bias: -0.01 },
    { date: '2024-07-15', title: '主要经济体GDP', desc: '二季度GDP增速放缓，衰退担忧重燃。', impact: 'medium', bias: -0.005 },
    { date: '2024-08-23', title: '杰克逊霍尔年会', desc: '鲍威尔发出明确降息信号：“时机已经成熟”。', impact: 'high', bias: 0.015 },
    { date: '2024-09-18', title: '美联储首次降息', desc: '大幅降息50个基点，开启宽松周期。', impact: 'high', bias: 0.025 },
    { date: '2024-11-05', title: '美国大选日', desc: '大选结果出炉，市场短期剧烈波动。', impact: 'high', bias: 0.0 },
    { date: '2024-12-18', title: '年终经济展望', desc: '主要机构上调明年增长预期。', impact: 'low', bias: 0.003 },
    { date: '2025-01-20', title: '总统就职典礼', desc: '新政策纲领发布，关注能源与贸易政策。', impact: 'medium', bias: 0.005 },
    { date: '2025-03-19', title: '一季度议息会议', desc: '根据通胀路径调整利率路径。', impact: 'high', bias: -0.005 },
    { date: '2025-06-15', title: '年中通胀报告', desc: '核心PCE回落至2%目标位。', impact: 'medium', bias: 0.008 },
    { date: '2025-09-20', title: '全球央行年会', desc: '讨论后QE时代的货币政策协同。', impact: 'medium', bias: 0.0 },
    { date: '2025-11-11', title: 'OPEC+会议', desc: '产油国达成新的减产协议，油价异动。', impact: 'high', bias: 0.015 }
];

let seed = 123456;
const random = () => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const MAX_END_DATE_TIMESTAMP = Math.floor(new Date("2025-11-30T23:59:59Z").getTime() / 1000);
const DAY_SECONDS = 86400;

export const generateMarketData = (startDateStr: string, timeframe: TimeFrame): { data: Record<string, BarData[]>, macroEvents: MacroEvent[] } => {
  seed = Date.now(); 
  
  // Force UTC
  const start = new Date(startDateStr + "T00:00:00Z");
  const startTimestamp = Math.floor(start.getTime() / 1000);
  
  let timeStep = DAY_SECONDS; 
  let volMult = 1.0;

  switch (timeframe) {
      case '15m': timeStep = 900; volMult = 0.2; break;
      case '1h':  timeStep = 3600; volMult = 0.4; break;
      case '4h':  timeStep = 14400; volMult = 0.6; break;
      case '1D':  timeStep = 86400; volMult = 1.0; break;
  }

  const maxPossibleBars = Math.floor((MAX_END_DATE_TIMESTAMP - startTimestamp) / timeStep);
  const totalBars = Math.min(3000, maxPossibleBars);

  if (totalBars <= 0) return { data: {}, macroEvents: [] };

  const dailyBiasMap: Record<string, { impact: number, bias: number }> = {};
  
  REAL_MACRO_EVENTS.forEach(evt => {
     dailyBiasMap[evt.date] = {
        impact: evt.impact === 'high' ? 3.0 : (evt.impact === 'medium' ? 1.5 : 1.0),
        bias: evt.bias
     };
  });

  const allData: Record<string, BarData[]> = {};
  const generatedTimestamps: number[] = [];

  SYMBOLS.forEach((sym, symIndex) => {
    const bars: BarData[] = [];
    let price = sym.basePrice * (1 + (random() - 0.5) * 0.05); 
    const uniqueOffset = random() * 1000; 

    for (let i = 0; i < totalBars; i++) {
      const currentTime = startTimestamp + i * timeStep;
      
      if (symIndex === 0) generatedTimestamps.push(currentTime);

      const currentDate = new Date(currentTime * 1000).toISOString().split('T')[0];
      
      let macroVolMult = 1.0;
      let macroBias = 0;
      
      if (dailyBiasMap[currentDate]) {
          macroVolMult = dailyBiasMap[currentDate].impact;
          macroBias = dailyBiasMap[currentDate].bias * (timeframe === '1D' ? 1 : (1 / (86400/timeStep)));
      }

      const vol = sym.volatility * volMult * macroVolMult;
      const noise = (Math.sin(uniqueOffset + i * 0.1) * 0.001 * volMult) + ((random() - 0.5) * vol);
      const sect = (random() - 0.5) * 0.005 * volMult;
      const percentChange = noise + sect + macroBias;
      
      const close = price * (1 + percentChange);
      const high = Math.max(price, close) * (1 + Math.abs(random() * vol * 0.6));
      const low = Math.min(price, close) * (1 - Math.abs(random() * vol * 0.6));
      const baseVol = 10000 / volMult;
      const moveSize = Math.abs(close - price) / price;
      const volume = Math.floor(baseVol * (1 + moveSize * 200) * (0.2 + random()) * macroVolMult);

      bars.push({
        time: currentTime,
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

  const alignedMacroEvents: MacroEvent[] = [];
  
  // 1. Guaranteed Start Event
  if (generatedTimestamps.length > 0) {
      alignedMacroEvents.push({
          id: 'macro-start',
          time: generatedTimestamps[0],
          title: '系统启动',
          description: '复盘开始，市场流动性注入。',
          impact: 'low'
      });
  }
  
  // 2. Real Macro Events
  REAL_MACRO_EVENTS.forEach(evt => {
     // Find exactly matching bar (or closest previous if intra-day)
     // Use string comparison to be safe against second-offsets
     const targetTime = generatedTimestamps.find(ts => {
         const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
         return dateStr === evt.date;
     });

     if (targetTime) {
         alignedMacroEvents.push({
             id: `macro-${evt.date}`,
             time: targetTime, 
             title: evt.title,
             description: evt.desc,
             impact: evt.impact
         });
     }
  });

  return { data: allData, macroEvents: alignedMacroEvents };
};