import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, LineSeries, Time, ColorType, IPriceLine, CrosshairMode, MouseEventParams, Logical, CandlestickData, Coordinate, BarPrice } from 'lightweight-charts';
import { BarData, Marker, PositionLine, TrendLine, MacroEvent, AIPattern, UserPriceLine } from '../types';

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
  macroEvents?: MacroEvent[]; 
  aiPatterns?: AIPattern[];   
  volumeVisible?: boolean;
  colors?: ChartColors;
  priceLines?: UserPriceLine[]; 
  trendLines?: TrendLine[]; 
  positionLine?: PositionLine | null;
  cursorMode?: 'magnet' | 'free'; 
  theme?: 'dark' | 'light';
  onChartClick?: (param: { price: number, time: number, logical?: number, point?: {x: number, y: number} }) => void;
  onSelectDrawing?: (id: number, type: 'trend' | 'price', x: number, y: number) => void;
  draftPoint?: { time: number, price: number, logical?: number } | null;
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
  data, symbolName, markers = [], macroEvents = [], aiPatterns = [], volumeVisible = true, colors = DEFAULT_COLORS, priceLines = [], trendLines = [], positionLine = null, cursorMode = 'magnet', theme = 'dark', onChartClick, onSelectDrawing, draftPoint
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const posLineRef = useRef<IPriceLine | null>(null);
  
  const [activeInd, setActiveInd] = useState<'VOL' | 'RSI'>('VOL');
  const [svgLines, setSvgLines] = useState<{
      id: number,
      type: 'trend' | 'price',
      x1: number, y1: number, x2: number, y2: number, 
      color: string, width: number, locked: boolean,
      ox1: number, oy1: number, ox2: number, oy2: number 
  }[]>([]);
  
  const [draftCircle, setDraftCircle] = useState<{x: number, y: number} | null>(null);
  const [chartDim, setChartDim] = useState({ w: 0, h: 0 }); 
  const [overlays, setOverlays] = useState<{type: 'macro'|'ai'|'marker'|'priceLineHandle', x: number, y: number, data: any}[]>([]);

  const latestTrendLines = useRef(trendLines);
  const latestPriceLines = useRef(priceLines);
  const latestMacro = useRef(macroEvents);
  const latestAI = useRef(aiPatterns);
  const latestMarkers = useRef(markers);
  const latestData = useRef(data);
  const latestDraftPoint = useRef(draftPoint);
  const onChartClickRef = useRef(onChartClick);
  const onSelectDrawingRef = useRef(onSelectDrawing);
  const cursorModeRef = useRef(cursorMode);

  useEffect(() => { latestTrendLines.current = trendLines; requestAnimationFrame(updateVisuals); }, [trendLines]);
  useEffect(() => { latestPriceLines.current = priceLines; requestAnimationFrame(updateVisuals); }, [priceLines]);
  useEffect(() => { latestMacro.current = macroEvents; requestAnimationFrame(updateVisuals); }, [macroEvents]);
  useEffect(() => { latestAI.current = aiPatterns; requestAnimationFrame(updateVisuals); }, [aiPatterns]);
  useEffect(() => { latestMarkers.current = markers; requestAnimationFrame(updateVisuals); }, [markers]);
  useEffect(() => { latestData.current = data; }, [data]);
  useEffect(() => { onChartClickRef.current = onChartClick; }, [onChartClick]);
  useEffect(() => { onSelectDrawingRef.current = onSelectDrawing; }, [onSelectDrawing]);
  useEffect(() => { cursorModeRef.current = cursorMode; }, [cursorMode]);
  
  useEffect(() => { 
      latestDraftPoint.current = draftPoint; 
      requestAnimationFrame(updateVisuals); 
  }, [draftPoint]);

  const updateVisuals = useCallback(() => {
    if (!chartRef.current || !candleSeriesRef.current || !containerRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const series = candleSeriesRef.current;
    
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // 0. Render Draft Point
    if (latestDraftPoint.current) {
        const dp = latestDraftPoint.current;
        let x = null;
        if (dp.logical !== undefined) {
            const coord = timeScale.logicalToCoordinate(dp.logical as Logical);
            if (coord !== null) x = coord;
        }
        if (x === null && dp.time) x = timeScale.timeToCoordinate(dp.time as Time);
        
        const y = series.priceToCoordinate(dp.price);
        
        if (x !== null && y !== null) {
            setDraftCircle({ x, y });
        } else {
            setDraftCircle(null);
        }
    } else {
        setDraftCircle(null);
    }

    // 1. Trend Lines (SVG)
    const currentLines = latestTrendLines.current || [];
    const trendSvg = currentLines.map(l => {
      let x1 = null, x2 = null;
      if (l.p1.logical !== undefined) {
         const coord = timeScale.logicalToCoordinate(l.p1.logical as Logical);
         if (coord !== null) x1 = coord;
      }
      if (x1 === null && l.p1.time) x1 = timeScale.timeToCoordinate(l.p1.time as Time);

      if (l.p2.logical !== undefined) {
         const coord = timeScale.logicalToCoordinate(l.p2.logical as Logical);
         if (coord !== null) x2 = coord;
      }
      if (x2 === null && l.p2.time) x2 = timeScale.timeToCoordinate(l.p2.time as Time);

      const y1 = series.priceToCoordinate(l.p1.price);
      const y2 = series.priceToCoordinate(l.p2.price);
      
      if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

      let ex1 = x1 as number, ey1 = y1 as number, ex2 = x2 as number, ey2 = y2 as number;
      
      if (width > 0) {
          const dx = (x2 as number) - (x1 as number);
          const dy = (y2 as number) - (y1 as number);
          
          if (Math.abs(dx) > 0.1) {
              const slope = dy / dx;
              ex1 = 0; ey1 = (y1 as number) - slope * (x1 as number);
              ex2 = width; ey2 = (y1 as number) + slope * (width - (x1 as number));
          } else {
              ex1 = x1 as number; ey1 = 0;
              ex2 = x2 as number; ey2 = height;
          }
      }

      return { 
          id: l.id,
          type: 'trend',
          x1: ex1, y1: ey1, 
          x2: ex2, y2: ey2, 
          color: l.color || '#d4af37', 
          width: l.lineWidth || 2,
          locked: !!l.locked,
          ox1: x1 as number, oy1: y1 as number,
          ox2: x2 as number, oy2: y2 as number
      };
    }).filter(Boolean) as any[];

    // Price Lines (Hit Areas)
    const priceSvg = (latestPriceLines.current || []).map(pl => {
        const y = series.priceToCoordinate(pl.price);
        if (y === null) return null;
        return {
            id: pl.id,
            type: 'price',
            x1: 0, x2: width,
            y1: y, y2: y,
            color: pl.color || '#d4af37', 
            width: pl.lineWidth || 1,       
            locked: !!pl.locked,
            ox1: 0, oy1: y, ox2: width, oy2: y
        };
    }).filter(Boolean) as any[];

    setSvgLines([...trendSvg, ...priceSvg]);

    // 2. Overlays (HTML)
    const newOverlays: any[] = [];
    const currentData = latestData.current;

    (latestMacro.current || []).forEach(evt => {
        const x = timeScale.timeToCoordinate(evt.time as Time);
        if (x !== null) newOverlays.push({ type: 'macro', x, y: 0, data: evt }); 
    });

    (latestAI.current || []).forEach(p => {
        const x = timeScale.timeToCoordinate(p.time as Time);
        const y = series.priceToCoordinate(p.price);
        if (x !== null && y !== null) newOverlays.push({ type: 'ai', x, y, data: p });
    });

    (latestMarkers.current || []).forEach(m => {
        const x = timeScale.timeToCoordinate(m.time as Time);
        const bar = currentData.find(b => b.time === m.time);
        if (x !== null && bar) {
            let y = 0;
            if (m.position === 'aboveBar') y = (series.priceToCoordinate(bar.high) || 0) - 20; 
            else if (m.position === 'belowBar') y = (series.priceToCoordinate(bar.low) || 0) + 20; 
            else y = series.priceToCoordinate(bar.close) || 0;
            
            if (y !== null) newOverlays.push({ type: 'marker', x, y, data: m });
        }
    });

    (latestPriceLines.current || []).forEach(pl => {
        const y = series.priceToCoordinate(pl.price);
        if (y !== null) {
            newOverlays.push({ 
                type: 'priceLineHandle', 
                x: width - 20, 
                y: y, 
                data: pl 
            });
        }
    });

    setOverlays(newOverlays);
  }, [chartDim]); 

  // Initialization
  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = theme === 'dark';
    
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
        setChartDim({ w: rect.width, h: rect.height });
    }

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
        const handler = onChartClickRef.current;
        if (!handler || !candleSeriesRef.current || !param.point || !chartRef.current) return;
        
        let price = candleSeriesRef.current.coordinateToPrice(param.point.y);
        let time = param.time;
        const logical = chartRef.current.timeScale().coordinateToLogical(param.point.x);
        
        if (!time && chartRef.current && logical !== null) {
            const data = candleSeriesRef.current.data();
            if (data.length > 0) {
                const lastBar = data[data.length - 1];
                const diff = logical - (data.length - 1);
                if (diff > 0) time = ((lastBar.time as number) + Math.ceil(diff) * 60) as Time; 
            }
            if (!time) time = (Date.now() / 1000) as Time;
        }

        if (cursorModeRef.current === 'magnet' && time && price !== null) {
            const dataArr = latestData.current || [];
            const bar = dataArr.find(b => b.time === time);
            if (bar) {
                const levels = [bar.open, bar.high, bar.low, bar.close];
                const closest = levels.reduce((prev, curr) => {
                    return (Math.abs(curr - (price as number)) < Math.abs(prev - (price as number))) ? curr : prev;
                });
                price = closest as BarPrice;
            }
        }

        if (price !== null) {
            handler({ price: price as number, time: (time as number), logical: logical || undefined, point: param.point });
        }
    });

    chart.timeScale().subscribeVisibleTimeRangeChange(() => { 
        requestAnimationFrame(updateVisuals); 
    });

    const resizeObserver = new ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
            if (!chartRef.current || !containerRef.current) return;
            const { width, height } = entries[0].contentRect;
            setChartDim({ w: width, h: height });
            chartRef.current.applyOptions({ width, height });
            updateVisuals();
        });
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
    requestAnimationFrame(updateVisuals);
  }, [data, activeInd, updateVisuals]); 

  // Colors
  useEffect(() => {
    if (candleSeriesRef.current) candleSeriesRef.current.applyOptions({ upColor: colors.upColor, downColor: colors.downColor, wickUpColor: colors.wickUpColor, wickDownColor: colors.wickDownColor });
  }, [colors]);
  
  // Indicators
  useEffect(() => {
    if (volSeriesRef.current) volSeriesRef.current.applyOptions({ visible: activeInd === 'VOL' });
    if (rsiSeriesRef.current) rsiSeriesRef.current.applyOptions({ visible: activeInd === 'RSI' });
  }, [activeInd]);

  // Position & Horizontal Price Lines (Native - Only for Labels now mostly, or keep sync)
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    
    // Clear old native lines
    if (posLineRef.current) { try{candleSeriesRef.current.removePriceLine(posLineRef.current)}catch(e){} posLineRef.current = null; }
    priceLinesRef.current.forEach(l => { try{candleSeriesRef.current?.removePriceLine(l)}catch(e){} });
    priceLinesRef.current = [];

    if (positionLine) posLineRef.current = candleSeriesRef.current.createPriceLine({ price: positionLine.price, color: positionLine.pnl >= 0 ? '#ff4d4f' : '#4caf50', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: positionLine.text || 'Pos' });
    
    // Keep native price lines for the price axis label support
    priceLines.forEach(pl => {
      const l = candleSeriesRef.current?.createPriceLine({ 
          price: pl.price, 
          color: pl.color || '#d4af37', 
          lineWidth: 0, // Make native line invisible, we use SVG overlay
          lineStyle: 0, 
          axisLabelVisible: true,
          title: pl.locked ? '🔒' : '' 
      });
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

      {/* HTML Overlay (Macro, AI, Markers, PriceLine Handles) - Z-90 */}
      <div className="absolute inset-0 pointer-events-none z-[90] overflow-hidden">
          {overlays.map((item, idx) => {
              if (item.type === 'macro') {
                  return (
                      <div key={`macro-${idx}`} className="absolute pointer-events-auto group cursor-help transition-transform hover:scale-110" style={{ left: item.x, bottom: '30px', transform: 'translateX(-50%)' }}>
                          <div className={`w-3 h-3 rounded-full border border-white shadow-lg ${item.data.impact === 'high' ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`}></div>
                          <div className="w-[1px] h-[30px] bg-white/50 mx-auto"></div>
                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 bg-black/90 text-white p-2 text-xs rounded border border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <div className="font-bold text-[#d4af37] mb-1">{item.data.title}</div><div>{item.data.description}</div>
                          </div>
                      </div>
                  );
              }
              if (item.type === 'ai') {
                  const isBull = item.data.type === 'Bullish' || item.data.type === 'Support';
                  const isRes = item.data.type === 'Resistance';
                  return (
                      <div key={`ai-${idx}`} className="absolute pointer-events-auto group cursor-help" style={{ left: item.x, top: item.y, transform: 'translate(-50%, -50%)' }}>
                          <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm border whitespace-nowrap ${isBull ? 'bg-blue-500/20 text-blue-400 border-blue-500' : (isRes ? 'bg-orange-500/20 text-orange-400 border-orange-500' : 'bg-red-500/20 text-red-400 border-red-500')}`}>{item.data.label}</div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-black/90 text-white p-2 text-xs rounded border border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <div className="font-bold text-[#33ccff] mb-0.5">[AI] {item.data.label}</div>
                              <div>{item.data.type} @ {item.data.price.toFixed(1)}</div>
                          </div>
                      </div>
                  );
              }
              if (item.type === 'marker') {
                  const isBuy = item.data.text === 'B'; const isSell = item.data.text === 'S';
                  return (
                      <div key={`marker-${idx}`} className="absolute pointer-events-auto" style={{ left: item.x, top: item.y, transform: 'translate(-50%, -50%)' }}>
                          <div className={`flex flex-col items-center justify-center font-bold`} style={{ color: item.data.color }}>
                             {isBuy && <i className="fas fa-arrow-up text-lg drop-shadow-md"></i>}
                             {isSell && <i className="fas fa-arrow-down text-lg drop-shadow-md"></i>}
                             {!isBuy && !isSell && <div className="w-2 h-2 rounded-full bg-white border border-black"></div>}
                             <span className="text-[9px] bg-black/60 text-white px-1 rounded mt-0.5 backdrop-blur-sm">{item.data.text}</span>
                          </div>
                      </div>
                  );
              }
              if (item.type === 'priceLineHandle') {
                  return (
                      <div 
                        key={`pl-handle-${idx}`}
                        className="absolute pointer-events-auto cursor-pointer hover:scale-125 transition-transform"
                        style={{ left: item.x, top: item.y, transform: 'translate(-50%, -50%)' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectDrawingRef.current && onSelectDrawingRef.current(item.data.id, 'price', e.clientX, e.clientY);
                        }}
                      >
                          <div className={`w-3 h-3 rounded-full border border-white shadow-sm ${item.data.locked ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      </div>
                  )
              }
              return null;
          })}
      </div>

      {/* SVG Overlay (Trend Lines) - Z-100 */}
      <svg 
        className="absolute top-0 left-0 pointer-events-none z-[100] overflow-visible"
        width={chartDim.w}
        height={chartDim.h}
        style={{ width: chartDim.w, height: chartDim.h }}
      >
         {/* Draft Point Circle */}
         {draftCircle && (
             <circle cx={draftCircle.x} cy={draftCircle.y} r={4} fill="#fff" stroke="#d4af37" strokeWidth="2" className="animate-pulse" />
         )}

         {svgLines.map((line, idx) => (
            <g key={idx} onDoubleClick={(e) => {
                e.stopPropagation();
                onSelectDrawingRef.current && onSelectDrawingRef.current(line.id, line.type, e.clientX, e.clientY);
            }} className="pointer-events-auto cursor-pointer hover:opacity-80">
               {/* Click Hit Area (Invisible but wide) */}
               <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="transparent" strokeWidth="20" />
               {/* Visible Line */}
               <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color} strokeWidth={line.width} strokeLinecap="round" />
               {/* Anchors - Only for Trend Lines */}
               {line.type === 'trend' && (
                   <>
                    <circle cx={line.ox1} cy={line.oy1} r={4} fill="#fff" stroke={line.color} strokeWidth="1" />
                    <circle cx={line.ox2} cy={line.oy2} r={4} fill="#fff" stroke={line.color} strokeWidth="1" />
                   </>
               )}
               {line.locked && (
                   <text x={(line.x1 + line.x2)/2} y={(line.y1 + line.y2)/2 - 8} fill={line.color} fontSize="12" textAnchor="middle">🔒</text>
               )}
            </g>
         ))}
      </svg>
    </div>
  );
};