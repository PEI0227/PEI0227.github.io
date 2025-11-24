
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, LineSeries, Time, ColorType, IPriceLine, CrosshairMode, MouseEventParams } from 'lightweight-charts';
import { BarData, Marker, PositionLine, TrendLine } from '../types';

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
  volumeVisible?: boolean;
  colors?: ChartColors;
  priceLines?: number[]; // Horizontal lines
  trendLines?: TrendLine[]; // Diagonal lines
  positionLine?: PositionLine | null;
  cursorMode?: 'magnet' | 'free'; // 1 = Magnet, 0 = Free
  onChartClick?: (param: { price: number, time: number }) => void;
}

const DEFAULT_COLORS: ChartColors = {
  upColor: '#ff4d4f',
  downColor: '#4caf50',
  wickUpColor: '#ff4d4f',
  wickDownColor: '#4caf50',
};

// RSI Calculation Helper
const calculateRSI = (data: BarData[], period = 14) => {
  const rsiData: { time: Time; value: number }[] = [];
  if (data.length < period) return rsiData;

  let gains = 0;
  let losses = 0;

  // First average
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
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
  data, 
  symbolName, 
  markers = [], 
  volumeVisible = true,
  colors = DEFAULT_COLORS,
  priceLines = [],
  trendLines = [],
  positionLine = null,
  cursorMode = 'magnet',
  onChartClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  // Series Refs
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  
  // Objects Refs
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const posLineRef = useRef<IPriceLine | null>(null);

  // State
  const [activeInd, setActiveInd] = useState<'VOL' | 'RSI'>('VOL');
  const [svgLines, setSvgLines] = useState<{x1: number, y1: number, x2: number, y2: number, color: string}[]>([]);

  // Data Refs used in callbacks to avoid stale closures
  const latestTrendLines = useRef(trendLines);
  
  useEffect(() => {
    latestTrendLines.current = trendLines;
  }, [trendLines]);

  // Update SVG Lines Logic
  const updateSvgLines = useCallback(() => {
    // Safety check: if chart or series is destroyed, do nothing
    if (!chartRef.current || !candleSeriesRef.current) {
      setSvgLines([]);
      return;
    }
    
    const currentLines = latestTrendLines.current;
    if (!currentLines.length) {
      setSvgLines([]);
      return;
    }

    const timeScale = chartRef.current.timeScale();
    const series = candleSeriesRef.current;
    
    const newLines = currentLines.map(l => {
      const x1 = timeScale.timeToCoordinate(l.p1.time as Time);
      const x2 = timeScale.timeToCoordinate(l.p2.time as Time);
      
      const y1 = series.priceToCoordinate(l.p1.price);
      const y2 = series.priceToCoordinate(l.p2.price);

      // Robust check for coordinates (they can be null if off-screen or invalid)
      if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

      return { x1, y1, x2, y2, color: l.color };
    }).filter(Boolean) as {x1: number, y1: number, x2: number, y2: number, color: string}[];

    setSvgLines(newLines);
  }, []); 

  // 1. Initialize Chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#000' }, textColor: '#666' },
      grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
      crosshair: { mode: cursorMode === 'free' ? CrosshairMode.Normal : CrosshairMode.Magnet },
      timeScale: { borderColor: '#333', timeVisible: true, rightOffset: 5 },
      rightPriceScale: { borderColor: '#333', scaleMargins: { top: 0.1, bottom: 0.2 } },
      autoSize: false, 
    });

    // Main Candle Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor, 
      downColor: colors.downColor,
      borderVisible: false, 
      wickUpColor: colors.wickUpColor, 
      wickDownColor: colors.wickDownColor,
    });
    candleSeriesRef.current = candleSeries;

    // Volume Series (Histogram)
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay
    });
    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

    // RSI Series (Line)
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#9932CC',
      lineWidth: 1,
      priceScaleId: 'rsi',
      visible: false,
    });
    chart.priceScale('rsi').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0.05 },
      visible: false, 
    });
    rsiSeriesRef.current = rsiSeries;

    chartRef.current = chart;

    // Click Handler for Drawing
    chart.subscribeClick((param: MouseEventParams) => {
        if (!onChartClick || !candleSeriesRef.current || !param.point) return;
        
        const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
        let time = param.time;

        // Fallback for whitespace: convert coordinate to time if param.time is undefined
        if (!time && chartRef.current) {
             time = chartRef.current.timeScale().coordinateToTime(param.point.x);
        }

        if (time !== undefined && price !== null) {
            onChartClick({ price, time: time as number });
        }
    });

    // Subscribe to events for SVG lines
    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        updateSvgLines();
    });

    // Resize Observer with debounce to prevent Loop Error
    const resizeObserver = new ResizeObserver((entries) => {
      setTimeout(() => {
        if (!chartRef.current || !containerRef.current) return;
        const { width, height } = entries[0].contentRect;
        chartRef.current.applyOptions({ width, height });
        updateSvgLines();
      }, 0);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
      rsiSeriesRef.current = null;
    };
  }, []); 


  // 2. Handle Data Updates
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volSeriesRef.current) return;

    // Update Data
    candleSeriesRef.current.setData(data);
    
    // Update Indicators
    if (activeInd === 'VOL') {
      const volData = data.map(d => ({
        time: d.time as Time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(255,77,79,0.3)' : 'rgba(76,175,80,0.3)'
      }));
      volSeriesRef.current.setData(volData);
    } else if (activeInd === 'RSI' && rsiSeriesRef.current) {
       const rsiData = calculateRSI(data);
       rsiSeriesRef.current.setData(rsiData);
    }
    
    updateSvgLines();
  }, [data, activeInd]);


  // 3. Handle Markers Updates (Separate Effect for Stability)
  useEffect(() => {
    if (!candleSeriesRef.current || !markers) return;
    
    // CRITICAL: Lightweight Charts requires markers to be sorted by time.
    // We sort a copy to avoid mutating props.
    const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);

    try {
      (candleSeriesRef.current as any).setMarkers(sortedMarkers);
    } catch (e) {
      console.error("Failed to set markers", e);
    }
  }, [markers]);


  // 4. Handle Colors Update
  useEffect(() => {
    if (candleSeriesRef.current && chartRef.current) {
       candleSeriesRef.current.applyOptions({
         upColor: colors.upColor,
         downColor: colors.downColor,
         wickUpColor: colors.wickUpColor,
         wickDownColor: colors.wickDownColor,
       });
    }
  }, [colors]);

  // 5. Handle Indicator Toggle
  useEffect(() => {
    if (!volSeriesRef.current || !rsiSeriesRef.current || !chartRef.current) return;
    volSeriesRef.current.applyOptions({ visible: activeInd === 'VOL' });
    rsiSeriesRef.current.applyOptions({ visible: activeInd === 'RSI' });
  }, [activeInd]);

  // 6. Handle Position Line
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;
    
    if (posLineRef.current) {
      try {
        candleSeriesRef.current.removePriceLine(posLineRef.current);
      } catch(e) {}
      posLineRef.current = null;
    }

    if (positionLine) {
       posLineRef.current = candleSeriesRef.current.createPriceLine({
         price: positionLine.price,
         color: positionLine.pnl >= 0 ? '#ff4d4f' : '#4caf50',
         lineWidth: 1,
         lineStyle: 2, 
         axisLabelVisible: true,
         title: positionLine.text || 'Pos',
       });
    }
  }, [positionLine]);

  // 7. Handle Horizontal Price Lines
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;
    
    priceLinesRef.current.forEach(l => {
       try { candleSeriesRef.current?.removePriceLine(l); } catch(e){}
    });
    priceLinesRef.current = [];

    priceLines.forEach(price => {
      const l = candleSeriesRef.current?.createPriceLine({
        price,
        color: '#d4af37',
        lineWidth: 1,
        axisLabelVisible: true,
        lineStyle: 0,
      });
      if(l) priceLinesRef.current.push(l);
    });
  }, [priceLines]);

  // 8. Handle Cursor Mode
  useEffect(() => {
      if (chartRef.current) {
        chartRef.current.applyOptions({
            crosshair: { mode: cursorMode === 'free' ? CrosshairMode.Normal : CrosshairMode.Magnet }
        });
      }
  }, [cursorMode]);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Symbol Label */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <div className="text-xl font-bold text-white drop-shadow-md select-none">{symbolName}</div>
      </div>

      {/* Indicators Toggle (Moved down for better access) */}
      <div className="absolute top-[50px] left-3 z-20 pointer-events-auto bg-black/40 p-1 rounded backdrop-blur-sm border border-[#333] flex gap-1">
          <button 
            onClick={() => setActiveInd('VOL')}
            className={`px-2 py-0.5 text-[10px] rounded border ${activeInd === 'VOL' ? 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            VOL
          </button>
          <button 
            onClick={() => setActiveInd('RSI')}
            className={`px-2 py-0.5 text-[10px] rounded border ${activeInd === 'RSI' ? 'bg-[#9932CC]/20 text-[#9932CC] border-[#9932CC]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            RSI
          </button>
      </div>

      {/* SVG Overlay for Trend Lines */}
      <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full overflow-hidden">
         {svgLines.map((line, idx) => (
            <line 
               key={idx}
               x1={line.x1} y1={line.y1}
               x2={line.x2} y2={line.y2}
               stroke={line.color}
               strokeWidth="2"
            />
         ))}
      </svg>
    </div>
  );
};
