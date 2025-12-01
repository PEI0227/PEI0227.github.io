import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, LineSeries, Time, ColorType, IPriceLine, CrosshairMode, MouseEventParams, Logical, CandlestickData } from 'lightweight-charts';
import { BarData, Marker, PositionLine, TrendLine, MacroEvent, AIPattern } from '../types';

interface ChartColors {
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
}

interface ChartWidgetProps {
  data: BarData[];
  symbolName: string;
  markers?: Marker[];
  macroEvents?: MacroEvent[]; // New Prop
  aiPatterns?: AIPattern[];   // New Prop
  volumeVisible?: boolean;
  colors?: ChartColors;
  priceLines?: number[]; 
  trendLines?: TrendLine[]; 
  positionLine?: PositionLine | null;
  cursorMode?: 'magnet' | 'free'; 
  theme?: 'dark' | 'light';
  onChartClick?: (param: { price: number, time: number, logical?: number, point?: {x: number, y: number} }) => void;
}

const DEFAULT_COLORS: ChartColors = {
  upColor: '#ff4d4f', downColor: '#4caf50', wickUpColor: '#ff4d4f', wickDownColor: '#4caf50',
};

const calculateRSI = (data: BarData[], period = 14) => {
  const rsiData: { time: Time; value: number }[] = [];
  if (data.length < period) return rsiData;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change; else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    let gain = change > 0 ? change : 0;
    let loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    rsiData.push({ time: data[i].time as Time, value: rsi });
  }
  return rsiData;
};

export const ChartWidget: React.FC<ChartWidgetProps> = ({ 
  data, symbolName, markers = [], macroEvents = [], aiPatterns = [], volumeVisible = true, colors = DEFAULT_COLORS, priceLines = [], trendLines = [], positionLine = null, cursorMode = 'magnet', theme = 'dark', onChartClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const posLineRef = useRef<IPriceLine | null>(null);
  
  const [activeInd, setActiveInd] = useState<'VOL' | 'RSI'>('VOL');
  const [svgLines, setSvgLines] = useState<{x1: number, y1: number, x2: number, y2: number, color: string}[]>([]);
  
  // HTML Overlay State
  const [overlays, setOverlays] = useState<{type: 'macro'|'ai', x: number, y: number, data: any}[]>([]);

  const latestTrendLines = useRef(trendLines);
  const latestMacro = useRef(macroEvents);
  const latestAI = useRef(aiPatterns);

  // Update Refs
  useEffect(() => { latestTrendLines.current = trendLines; }, [trendLines]);
  useEffect(() => { latestMacro.current = macroEvents; }, [macroEvents]);
  useEffect(() => { latestAI.current = aiPatterns; }, [aiPatterns]);

  // Main Render Loop for SVG & Overlays
  const updateVisuals = useCallback(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const series = candleSeriesRef.current;

    // 1. Trend Lines
    const currentLines = latestTrendLines.current || [];
    const newSvgLines = currentLines.map(l => {
      let x1 = null, x2 = null;
      if (l.p1.logical !== undefined) x1 = timeScale.logicalToCoordinate(l.p1.logical as Logical);
      else if (l.p1.time) x1 = timeScale.timeToCoordinate(l.p1.time as Time);

      if (l.p2.logical !== undefined) x2 = timeScale.logicalToCoordinate(l.p2.logical as Logical);
      else if (l.p2.time) x2 = timeScale.timeToCoordinate(l.p2.time as Time);

      const y1 = series.priceToCoordinate(l.p1.price);
      const y2 = series.priceToCoordinate(l.p2.price);
      
      if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
      return { x1, y1, x2, y2, color: l.color };
    }).filter(Boolean) as any[];
    setSvgLines(newSvgLines);

    // 2. Macro & AI Overlays
    const newOverlays: any[] = [];
    
    // Macro
    (latestMacro.current || []).forEach(evt => {
        const x = timeScale.timeToCoordinate(evt.time as Time);
        if (x !== null) {
            newOverlays.push({ type: 'macro', x, y: 0, data: evt }); // y will be handled in CSS (bottom)
        }
    });

    // AI
    (latestAI.current || []).forEach(p => {
        const x = timeScale.timeToCoordinate(p.time as Time);
        const y = series.priceToCoordinate(p.price);
        if (x !== null && y !== null) {
            newOverlays.push({ type: 'ai', x, y, data: p });
        }
    });
    setOverlays(newOverlays);

  }, []);

  // Initialization
  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = theme === 'dark';
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: isDark ? '#000000' : '#ffffff' }, textColor: isDark ? '#666666' : '#333333' },
      grid: { vertLines: { color: isDark ? '#1a1a1a' : '#f0f0f0' }, horzLines: { color: isDark ? '#1a1a1a' : '#f0f0f0' } },
      crosshair: { mode: cursorMode === 'free' ? CrosshairMode.Normal : CrosshairMode.Magnet },
      timeScale: { borderColor: isDark ? '#333333' : '#e0e0e0', timeVisible: true, rightOffset: 5 },
      rightPriceScale: { borderColor: isDark ? '#333333' : '#e0e0e0', scaleMargins: { top: 0.1, bottom: 0.2 } },
      autoSize: false, 
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor, downColor: colors.downColor, borderVisible: false, wickUpColor: colors.wickUpColor, wickDownColor: colors.wickDownColor,
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' });
    volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volSeriesRef.current = volSeries;

    const rsiSeries = chart.addSeries(LineSeries, { color: '#9932CC', lineWidth: 1, priceScaleId: 'rsi', visible: false });
    chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.8, bottom: 0.05 }, visible: false });
    rsiSeriesRef.current = rsiSeries;

    chartRef.current = chart;

    chart.subscribeClick((param: MouseEventParams) => {
        if (!onChartClick || !candleSeriesRef.current || !param.point || !chartRef.current) return;
        const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
        let time = param.time;
        const logical = chartRef.current.timeScale().coordinateToLogical(param.point.x);
        
        if (!time && chartRef.current && logical !== null) {
            const data = candleSeriesRef.current.data();
            if (data.length > 0) {
                const lastBar = data[data.length - 1];
                const diff = logical - (data.length - 1);
                if (diff > 0) { time = ((lastBar.time as number) + Math.ceil(diff) * 60) as Time; }
            }
            if (!time) time = (Date.now() / 1000) as Time;
        }
        if (price !== null) {
            onChartClick({ price, time: (time as number), logical: logical || undefined, point: param.point });
        }
    });

    chart.timeScale().subscribeVisibleTimeRangeChange(() => { 
        requestAnimationFrame(updateVisuals); 
    });

    const resizeObserver = new ResizeObserver((entries) => {
        setTimeout(() => {
            if (!chartRef.current || !containerRef.current) return;
            const { width, height } = entries[0].contentRect;
            chartRef.current.applyOptions({ width, height });
            updateVisuals();
        }, 0);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
        resizeObserver.disconnect();
        if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [theme]); 

  // Data Update
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volSeriesRef.current) return;
    candleSeriesRef.current.setData(data as unknown as CandlestickData<Time>[]);
    
    if (activeInd === 'VOL') {
      const volData = data.map(d => ({ time: d.time as Time, value: d.volume, color: d.close >= d.open ? 'rgba(255,77,79,0.3)' : 'rgba(76,175,80,0.3)' }));
      volSeriesRef.current.setData(volData);
    } else if (activeInd === 'RSI' && rsiSeriesRef.current) {
       const rsiData = calculateRSI(data);
       rsiSeriesRef.current.setData(rsiData);
    }

    // Set Trade Markers
    if (candleSeriesRef.current) {
        const series = candleSeriesRef.current as any;
        if (typeof series.setMarkers === 'function') {
            try {
                const sortedMarkers = (markers || []).slice().sort((a, b) => a.time - b.time);
                series.setMarkers(sortedMarkers);
            } catch (e) { console.error(e); }
        }
    }
    
    requestAnimationFrame(updateVisuals);
  }, [data, markers, activeInd, updateVisuals]); 

  // Color & Indicator Effect
  useEffect(() => {
    if (candleSeriesRef.current) candleSeriesRef.current.applyOptions({ upColor: colors.upColor, downColor: colors.downColor, wickUpColor: colors.wickUpColor, wickDownColor: colors.wickDownColor });
  }, [colors]);
  
  useEffect(() => {
    if (volSeriesRef.current) volSeriesRef.current.applyOptions({ visible: activeInd === 'VOL' });
    if (rsiSeriesRef.current) rsiSeriesRef.current.applyOptions({ visible: activeInd === 'RSI' });
  }, [activeInd]);

  // Position & Price Lines
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    if (posLineRef.current) { try{candleSeriesRef.current.removePriceLine(posLineRef.current)}catch(e){} posLineRef.current = null; }
    if (positionLine) posLineRef.current = candleSeriesRef.current.createPriceLine({ price: positionLine.price, color: positionLine.pnl >= 0 ? '#ff4d4f' : '#4caf50', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: positionLine.text || 'Pos' });
    
    priceLinesRef.current.forEach(l => { try{candleSeriesRef.current?.removePriceLine(l)}catch(e){} });
    priceLinesRef.current = [];
    priceLines.forEach(price => {
      const l = candleSeriesRef.current?.createPriceLine({ price, color: '#d4af37', lineWidth: 1, axisLabelVisible: true, lineStyle: 0 });
      if(l) priceLinesRef.current.push(l);
    });
  }, [positionLine, priceLines]);

  useEffect(() => { if (chartRef.current) chartRef.current.applyOptions({ crosshair: { mode: cursorMode === 'free' ? CrosshairMode.Normal : CrosshairMode.Magnet } }); }, [cursorMode]);

  const isDark = theme === 'dark';

  return (
    <div className="relative w-full h-full" ref={containerRef} style={{ backgroundColor: isDark ? '#000000' : '#ffffff' }}>
      <div className="absolute top-3 left-3 z-20 pointer-events-none"><div className={`text-xl font-bold drop-shadow-md select-none ${isDark ? 'text-white' : 'text-gray-800'}`}>{symbolName}</div></div>
      <div className={`absolute top-[50px] left-3 z-20 pointer-events-auto p-1 rounded backdrop-blur-sm border flex gap-1 ${isDark ? 'bg-black/40 border-[#333]' : 'bg-white/60 border-gray-300'}`}>
          <button onClick={() => setActiveInd('VOL')} className={`px-2 py-0.5 text-[10px] rounded border ${activeInd === 'VOL' ? 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]' : 'text-gray-500 border-transparent hover:text-gray-400'}`}>VOL</button>
          <button onClick={() => setActiveInd('RSI')} className={`px-2 py-0.5 text-[10px] rounded border ${activeInd === 'RSI' ? 'bg-[#9932CC]/20 text-[#9932CC] border-[#9932CC]' : 'text-gray-500 border-transparent hover:text-gray-400'}`}>RSI</button>
      </div>

      {/* SVG Overlay (Trend Lines) */}
      <svg className="absolute inset-0 pointer-events-none z-30 w-full h-full overflow-hidden">
         {svgLines.map((line, idx) => (
            <line key={idx} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color} strokeWidth="2" />
         ))}
      </svg>

      {/* HTML Overlay (Macro & AI) - Z-40 to be above everything */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          {overlays.map((item, idx) => {
              if (item.type === 'macro') {
                  return (
                      <div key={`macro-${idx}`} 
                           className="absolute pointer-events-auto group cursor-help transition-transform hover:scale-110"
                           style={{ left: item.x, bottom: '20px', transform: 'translateX(-50%)' }}>
                          <div className={`w-3 h-3 rounded-full border border-white shadow-lg ${item.data.impact === 'high' ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`}></div>
                          <div className="w-[1px] h-[20px] bg-white/50 mx-auto"></div>
                          {/* Tooltip */}
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white p-2 text-xs rounded border border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <div className="font-bold text-[#d4af37] mb-1">{item.data.title}</div>
                              <div>{item.data.description}</div>
                          </div>
                      </div>
                  );
              }
              if (item.type === 'ai') {
                  const isBull = item.data.type === 'Bullish' || item.data.type === 'Support';
                  const isRes = item.data.type === 'Resistance';
                  return (
                      <div key={`ai-${idx}`}
                           className="absolute pointer-events-auto group cursor-help"
                           style={{ left: item.x, top: item.y, transform: 'translate(-50%, -50%)' }}>
                          <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm border ${isBull ? 'bg-blue-500/20 text-blue-400 border-blue-500' : (isRes ? 'bg-orange-500/20 text-orange-400 border-orange-500' : 'bg-red-500/20 text-red-400 border-red-500')}`}>
                              {item.data.label}
                          </div>
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.data.type} @ {item.data.price.toFixed(1)}
                          </div>
                      </div>
                  );
              }
              return null;
          })}
      </div>
    </div>
  );
};