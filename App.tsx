import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SYMBOLS, generateMarketData } from './constants';
import { SymbolInfo, BarData, GameState, Order, Position, Marker, TradeRecord, Toast, PositionLine, DrawingTool, TrendLine, Point, TimeFrame, MacroEvent, AIPattern } from './types';
import { ChartWidget } from './components/ChartWidget';
import { Onboarding } from './components/Onboarding';

// --- Visual Effects Components ---

const RainEffect = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = "01日元金木水火土BTCETH$$$%%%";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) drops[i] = 1;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      ctx.fillStyle = '#0F0'; 
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-20" />; 
};

const ZenEffect = ({ isDark }: { isDark: boolean }) => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div key={i} className={`absolute rounded-full blur-xl animate-pulse ${isDark ? 'bg-white/10' : 'bg-black/5'}`}
             style={{
               width: Math.random() * 100 + 50 + 'px',
               height: Math.random() * 100 + 50 + 'px',
               top: Math.random() * 100 + '%',
               left: Math.random() * 100 + '%',
               animationDuration: Math.random() * 5 + 5 + 's'
             }} 
        />
      ))}
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[], isDark: boolean }> = ({ toasts, isDark }) => (
  <div className="fixed top-14 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded shadow-lg backdrop-blur-md border flex items-center gap-3 animate-[slideInRight_0.3s] ${t.type === 'success' ? 'bg-green-600/90 border-green-500/50 text-white' : (t.type === 'warn' || t.type === 'error' ? 'bg-red-600/90 border-red-500/50 text-white' : (isDark ? 'bg-gray-800/90 border-gray-600 text-gray-200' : 'bg-white/90 border-gray-300 text-gray-800'))}`}>
         <i className={`fas fa-${t.type === 'success' ? 'check-circle' : (t.type === 'warn' ? 'exclamation-triangle' : 'info-circle')}`}></i>
         <span className="text-xs font-bold">{t.message}</span>
      </div>
    ))}
  </div>
);

const Header: React.FC<{ reset: () => void, toggleTheme: () => void, isDark: boolean }> = ({ reset, toggleTheme, isDark }) => (
  <header className="h-[40px] bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0 z-50 shadow-sm transition-colors duration-300">
    <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)]">
      <i className="fas fa-chart-line text-[#d4af37]"></i>
      <span className="tracking-wide">期货通 PRO</span>
      <span className="text-[10px] text-[var(--text-sub)] font-normal ml-1 border border-[var(--border)] px-1 rounded">V19.0 AI-Macro</span>
    </div>
    <div className="flex gap-2">
      <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-1 text-xs text-[var(--text-sub)] hover:bg-[var(--hover)] hover:text-[var(--text-main)] rounded transition-all">
         <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i> {isDark ? '浅色' : '深色'}
      </button>
      <div className="w-[1px] bg-[var(--border)] h-4 self-center mx-1"></div>
      <button onClick={reset} className="flex items-center gap-2 px-3 py-1 text-xs text-[var(--text-sub)] hover:bg-[var(--hover)] hover:text-[var(--text-main)] rounded transition-all">
        <i className="fas fa-redo"></i> 重置系统
      </button>
    </div>
  </header>
);

// Advanced AI Logic - High Sensitivity
const detectAIPatterns = (data: BarData[], cursor: number): AIPattern[] => {
  if (data.length === 0 || cursor < 20) return [];
  
  const patterns: AIPattern[] = [];
  // Scan visual range
  const startIdx = Math.max(0, cursor - 100);

  for (let i = startIdx + 2; i <= cursor; i++) {
      const c = data[i]; // Center bar
      const l1 = data[i-1];
      const l2 = data[i-2];
      
      // Pivot High (Resistance)
      if (c.high > l1.high && c.high > l2.high) {
          // Check right side if data exists
          if (i < data.length - 1) {
             const r1 = data[i+1];
             if (r1 && c.high > r1.high) {
                patterns.push({ id: c.time * 10 + 1, time: c.time, price: c.high, type: 'Resistance', label: 'R' });
             }
          } else {
             patterns.push({ id: c.time * 10 + 1, time: c.time, price: c.high, type: 'Resistance', label: 'R' });
          }
      }

      // Pivot Low (Support)
      if (c.low < l1.low && c.low < l2.low) {
         if (i < data.length - 1) {
             const r1 = data[i+1];
             if (r1 && c.low < r1.low) {
                patterns.push({ id: c.time * 10 + 2, time: c.time, price: c.low, type: 'Support', label: 'S' });
             }
         } else {
             patterns.push({ id: c.time * 10 + 2, time: c.time, price: c.low, type: 'Support', label: 'S' });
         }
      }
      
      // Moving Average Cross
      if (i > 10) {
          const getMA = (idx: number, period: number) => {
              let sum = 0;
              for(let k=0; k<period; k++) sum += data[idx-k].close;
              return sum/period;
          }
          const ma5_curr = getMA(i, 5);
          const ma10_curr = getMA(i, 10);
          const ma5_prev = getMA(i-1, 5);
          const ma10_prev = getMA(i-1, 10);
          
          if (ma5_prev <= ma10_prev && ma5_curr > ma10_curr) {
              patterns.push({ id: c.time * 10 + 3, time: c.time, price: c.low * 0.99, type: 'Bullish', label: 'Buy' });
          }
          if (ma5_prev >= ma10_prev && ma5_curr < ma10_curr) {
              patterns.push({ id: c.time * 10 + 4, time: c.time, price: c.high * 1.01, type: 'Bearish', label: 'Sell' });
          }
      }
  }
  return patterns;
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false); 
  
  const [mainSymbolCode, setMainSymbolCode] = useState(SYMBOLS[0].code);
  const [secSymbolCode, setSecSymbolCode] = useState(SYMBOLS[2].code);
  const [mode, setMode] = useState<'single' | 'dual'>('single');
  const [startDateInput, setStartDateInput] = useState('2024-01-01');

  const [allData, setAllData] = useState<Record<string, BarData[]>>({});
  const [macroEvents, setMacroEvents] = useState<MacroEvent[]>([]);
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false, speed: 1000, cursor: 200, totalBars: 3000, money: 100000, initMoney: 100000, tradeCount: 0, winCount: 0,
    timeframe: '1D', startDate: '2024-01-01', showMacro: false, showAI: false
  });
  
  const [position, setPosition] = useState<Position | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]); 
  
  const [drawTool, setDrawTool] = useState<DrawingTool>('cursor');
  const [cursorMode, setCursorMode] = useState<'magnet' | 'free'>('magnet');
  const [userLines, setUserLines] = useState<number[]>([]); 
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]); 
  const [draftPoint, setDraftPoint] = useState<Point | null>(null); 
  const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string } | null>(null);

  const [qty, setQty] = useState(1);
  const [orderType, setOrderType] = useState<'Market'|'Limit'|'Stop'>('Market');
  const [limitPrice, setLimitPrice] = useState<string>('');

  const timerRef = useRef<number | null>(null);
  const gameStateRef = useRef(gameState); 
  gameStateRef.current = gameState; 

  const mainColors = useMemo(() => ({ upColor: '#ff4d4f', downColor: '#4caf50', wickUpColor: '#ff4d4f', wickDownColor: '#4caf50' }), []);
  const secColors = useMemo(() => ({ upColor: '#33ccff', downColor: '#ff9900', wickUpColor: '#33ccff', wickDownColor: '#ff9900' }), []);

  const startSystem = (money: number, symbol: string, viewMode: 'single'|'dual', start: string) => {
    const { data, macroEvents } = generateMarketData(start, gameState.timeframe); 
    const totalBars = data[symbol]?.length || 3000;

    setAllData(data);
    setMacroEvents(macroEvents);
    setGameState(prev => ({ 
        ...prev, money, initMoney: money, cursor: 200, isPlaying: false, speed: 1000, startDate: start, totalBars 
    }));
    setMainSymbolCode(symbol);
    setMode(viewMode);
    setIsSetupOpen(false);
    setIsOnboarding(true); 
  };

  const changeTimeframe = (tf: TimeFrame) => {
    const { data, macroEvents } = generateMarketData(gameState.startDate, tf);
    const totalBars = data[mainSymbolCode]?.length || 3000;
    
    setAllData(data);
    setMacroEvents(macroEvents);
    setGameState(prev => ({ ...prev, timeframe: tf, cursor: 200, isPlaying: false, totalBars }));
    setMarkers([]);
    setPendingOrders([]);
    setHistory([]); 
    setPosition(null);
    showToast(`周期切换至 ${tf}, 数据已重置`, 'info');
  };

  const reset = () => {
    if(timerRef.current) clearInterval(timerRef.current);
    setIsResultOpen(false);
    setShowHistory(false);
    setIsSetupOpen(true);
    setPosition(null);
    setPendingOrders([]);
    setHistory([]);
    setMarkers([]);
    setUserLines([]);
    setTrendLines([]);
    setDraftPoint(null);
    setToasts([]);
    setDrawTool('cursor');
    setGameState({ isPlaying: false, speed: 1000, cursor: 200, totalBars: 3000, money: 100000, initMoney: 100000, tradeCount: 0, winCount: 0, timeframe: '1D', startDate: '2024-01-01', showMacro: false, showAI: false });
  };

  const showToast = (message: string, type: 'success'|'info'|'warn'|'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const mainSymbolInfo = SYMBOLS.find(s => s.code === mainSymbolCode)!;
  const currentBar = allData[mainSymbolCode]?.[gameState.cursor];

  const usedMargin = useMemo(() => {
    if (!position || !currentBar) return 0;
    return position.avgPrice * position.qty * mainSymbolInfo.multiplier * mainSymbolInfo.marginRate;
  }, [position, mainSymbolCode, mainSymbolInfo]);

  const floatingPnl = useMemo(() => {
    if (!position || !currentBar) return 0;
    return (currentBar.close - position.avgPrice) * position.qty * position.direction * mainSymbolInfo.multiplier;
  }, [position, currentBar, mainSymbolCode]);

  const totalEquity = gameState.money + floatingPnl;
  const freeMargin = totalEquity - usedMargin;

  const checkMargin = (price: number, quantity: number): { ok: boolean, required: number } => {
    const required = price * mainSymbolInfo.multiplier * quantity * mainSymbolInfo.marginRate;
    return { ok: required <= freeMargin, required };
  };

  const tick = () => {
    const current = gameStateRef.current;
    if (current.cursor >= current.totalBars - 1) {
      finishGame();
      return;
    }
    const nextCursor = current.cursor + 1;
    const currentBar = allData[mainSymbolCode]?.[nextCursor];
    if(!currentBar) return;
    setGameState(prev => ({ ...prev, cursor: nextCursor }));
    checkOrders(currentBar);
  };

  const togglePlay = () => {
    if (gameState.isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState(prev => ({ ...prev, isPlaying: false }));
    } else {
      if (gameState.cursor >= gameState.totalBars - 1) return;
      timerRef.current = window.setInterval(tick, gameState.speed);
      setGameState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  useEffect(() => {
    if (gameState.isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(tick, gameState.speed);
    }
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.speed, gameState.isPlaying, mainSymbolCode]); 

  // --- Prop Computation ---
  
  // Trade Markers only
  const tradeMarkers = useMemo(() => {
    return markers.sort((a,b)=>a.time - b.time);
  }, [markers]);

  // AI Props
  const visibleAI = useMemo(() => {
      if (!gameState.showAI || !allData[mainSymbolCode]) return [];
      return detectAIPatterns(allData[mainSymbolCode], gameState.cursor);
  }, [gameState.showAI, allData, mainSymbolCode, gameState.cursor]);

  // Macro Props
  const visibleMacro = useMemo(() => {
      if (!gameState.showMacro) return [];
      // Only show events up to current time? No, show all for replay context usually
      // But let's show all so user can see what's coming
      return macroEvents;
  }, [gameState.showMacro, macroEvents]);


  const checkOrders = (bar: BarData) => {
    setPendingOrders(prevOrders => {
      const remainingOrders: Order[] = [];
      prevOrders.forEach(order => {
        let triggered = false;
        let execPrice = order.price;

        if (order.type === 'Stop') {
          if ((order.direction === 1 && bar.high >= order.price) || (order.direction === -1 && bar.low <= order.price)) {
            triggered = true; execPrice = order.price; 
          }
        } 
        else if (order.type === 'Limit') {
          if (order.direction === 1 && bar.low <= order.price) {
            triggered = true; execPrice = order.price; 
          }
          if (order.direction === -1 && bar.high >= order.price) {
             triggered = true; execPrice = order.price;
          }
        }

        if (triggered) {
          let isReducing = false;
          if (position && position.direction !== order.direction) isReducing = true;
          if (!isReducing) {
             const marginCheck = checkMargin(execPrice, order.qty);
             if (!marginCheck.ok) {
                showToast(`保证金不足，条件/限价单已取消`, 'error');
                return; 
             }
          }
          executeTrade(order.direction, order.qty, execPrice, bar.time);
          showToast(`${order.type === 'Stop' ? '条件单' : '限价单'}触发成交`, 'success');
        } else {
          remainingOrders.push(order);
        }
      });
      return remainingOrders;
    });
  };

  const executeTrade = (dir: 1 | -1, qty: number, price: number, time: number) => {
    const fee = qty * mainSymbolInfo.fee;
    setGameState(prev => ({ ...prev, money: prev.money - fee }));
    setPosition(prevPos => {
      const recordBase = { id: Date.now(), time, symbol: mainSymbolCode, price, qty, direction: dir, fee };
      if (!prevPos || prevPos.qty === 0) {
        addMarker(time, dir === 1 ? 'buy' : 'sell');
        setHistory(prev => [...prev, { ...recordBase, type: 'Open' }]);
        return { symbol: mainSymbolCode, direction: dir, qty: qty, avgPrice: price };
      } 
      if (prevPos.direction === dir) {
        const totalVal = (prevPos.qty * prevPos.avgPrice) + (qty * price);
        const newQty = prevPos.qty + qty;
        addMarker(time, dir === 1 ? 'buy' : 'sell');
        setHistory(prev => [...prev, { ...recordBase, type: 'Open' }]);
        return { ...prevPos, qty: newQty, avgPrice: totalVal / newQty };
      } 
      const closeQty = Math.min(prevPos.qty, qty);
      const pnl = (price - prevPos.avgPrice) * closeQty * prevPos.direction * mainSymbolInfo.multiplier;
      const isWin = pnl > 0;
      setGameState(gs => ({ ...gs, money: gs.money + pnl, tradeCount: gs.tradeCount + 1, winCount: gs.winCount + (isWin ? 1 : 0) }));
      setHistory(prev => [...prev, { ...recordBase, type: 'Close', qty: closeQty, pnl }]);
      const remaining = qty - closeQty;
      addMarker(time, 'close');
      if (remaining === 0) { return null; } else {
        addMarker(time, dir === 1 ? 'buy' : 'sell');
        setHistory(prev => [...prev, { ...recordBase, type: 'Reverse', qty: remaining }]);
        return { symbol: mainSymbolCode, direction: dir, qty: remaining, avgPrice: price };
      }
    });
  };

  const submitOrder = (dir: 1 | -1) => {
    const bar = allData[mainSymbolCode]?.[gameState.cursor];
    if (!bar) return;
    let estPrice = bar.close;
    if (orderType !== 'Market' && limitPrice) estPrice = parseFloat(limitPrice);
    
    let isReducing = false;
    if (position && position.direction !== dir) isReducing = true;
    if (!isReducing) {
       const marginCheck = checkMargin(estPrice, qty);
       if (!marginCheck.ok) {
          showToast(`保证金不足! 需: ${Math.floor(marginCheck.required)}`, 'error');
          return;
       }
    }
    if (orderType === 'Market') {
      executeTrade(dir, qty, bar.close, bar.time);
      showToast('市价单已成交');
      return;
    }
    const price = parseFloat(limitPrice);
    if (!price) { showToast('请输入有效价格', 'info'); return; }
    if (orderType === 'Limit') {
       if ((dir === 1 && price >= bar.close) || (dir === -1 && price <= bar.close)) {
          executeTrade(dir, qty, bar.close, bar.time);
          showToast(`限价单即时成交`, 'success');
          return;
       }
    }
    setPendingOrders(prev => [...prev, { id: Date.now(), symbol: mainSymbolCode, type: orderType, direction: dir, qty, price, timestamp: bar.time }]);
    showToast('委托挂单已提交', 'info');
  };

  const cancelOrder = (id: number) => {
    setPendingOrders(prev => prev.filter(o => o.id !== id));
    showToast('委托已撤销', 'info');
  };

  const addMarker = (time: number, type: 'buy' | 'sell' | 'close') => {
    const color = type === 'buy' ? '#ff4d4f' : (type === 'sell' ? '#4caf50' : (isDark ? '#ffffff' : '#333333'));
    const shape = type === 'buy' ? 'arrowUp' : (type === 'sell' ? 'arrowDown' : 'circle');
    const position = type === 'buy' ? 'belowBar' : (type === 'sell' ? 'aboveBar' : 'inBar');
    const text = type === 'close' ? 'Close' : (type === 'buy' ? 'B' : 'S');
    setMarkers(prev => [...prev, { time, color, shape, position, text, size: 2 }]);
  };

  const handleChartClick = (param: { price: number, time: number, logical?: number, point?: {x: number, y: number} }) => {
    // Note: Tooltip for Macro/AI is now handled by ChartWidget's HTML overlay hover events
    // We only handle drawing clicks here
    
    if (drawTool === 'horizontal') {
      setUserLines(prev => [...prev, param.price]);
      showToast('已绘制水平线');
    }
    else if (drawTool === 'trend') {
      const p = { time: param.time, price: param.price, logical: param.logical };
      if (!draftPoint) {
        setDraftPoint(p);
        showToast('起点已设置，请点击终点', 'info');
      } else {
        setTrendLines(prev => [...prev, { id: Date.now(), p1: draftPoint, p2: p, color: '#d4af37' }]);
        setDraftPoint(null);
        showToast('趋势线绘制完成');
      }
    }
  };

  const clearDrawings = () => {
    setUserLines([]); setTrendLines([]); setDraftPoint(null); showToast('画线已清除');
  };

  const handleOrderBookDbClick = (price: string) => {
     setOrderType('Limit'); setLimitPrice(price); showToast('已填充限价单价格');
  };

  const finishGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState(prev => ({ ...prev, isPlaying: false }));
    let finalMoney = gameState.money;
    if (position && position.qty > 0) {
      const bar = allData[mainSymbolCode]?.[gameState.cursor];
      if (bar) {
        const pnl = (bar.close - position.avgPrice) * position.qty * position.direction * mainSymbolInfo.multiplier;
        finalMoney += pnl;
      }
    }
    setGameState(gs => ({ ...gs, money: finalMoney }));
    setIsResultOpen(true);
    const pnl = finalMoney - gameState.initMoney;
    if (pnl > 0) {
       // @ts-ignore
       window.confetti && window.confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
  };

  const formatNum = (n: number) => Math.floor(n).toLocaleString();
  const formatTime = (t: number) => new Date(t * 1000).toLocaleTimeString();
  const formatDate = (t: number) => new Date(t * 1000).toLocaleDateString();

  const posLineData: PositionLine | null = useMemo(() => {
    if (!position) return null;
    return {
      price: position.avgPrice,
      pnl: floatingPnl,
      text: `Avg: ${position.avgPrice.toFixed(1)} (${floatingPnl > 0 ? '+' : ''}${floatingPnl.toFixed(0)})`
    };
  }, [position, floatingPnl]);

  const orderBookData = useMemo(() => {
    if (!currentBar) return { asks: [], bids: [] };
    const asks = [5,4,3,2,1].map(i => {
       const price = (currentBar.close + i * mainSymbolInfo.basePrice * 0.0001).toFixed(0);
       const seed = currentBar.time + i;
       const vol = Math.floor((Math.sin(seed) * 10000 % 100)) + 10;
       return { i, price, vol: Math.abs(vol), width: Math.min(Math.abs(vol), 100) };
    });
    const bids = [1,2,3,4,5].map(i => {
       const price = (currentBar.close - i * mainSymbolInfo.basePrice * 0.0001).toFixed(0);
       const seed = currentBar.time - i;
       const vol = Math.floor((Math.sin(seed) * 10000 % 100)) + 10;
       return { i, price, vol: Math.abs(vol), width: Math.min(Math.abs(vol), 100) };
    });
    return { asks, bids };
  }, [currentBar, mainSymbolCode]);

  return (
    <div 
      className="flex flex-col h-screen text-xs select-none bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-300"
      style={{
        '--bg-app': isDark ? '#000000' : '#f0f2f5',
        '--bg-panel': isDark ? '#1e1e1e' : '#ffffff',
        '--border': isDark ? '#333333' : '#e5e7eb',
        '--text-main': isDark ? '#e0e0e0' : '#1f2937',
        '--text-sub': isDark ? '#888888' : '#6b7280',
        '--hover': isDark ? '#333333' : '#f3f4f6',
        '--input-bg': isDark ? '#000000' : '#f9fafb',
      } as React.CSSProperties}
    >
      <ToastContainer toasts={toasts} isDark={isDark} />
      <Header reset={reset} toggleTheme={toggleTheme} isDark={isDark} />
      
      <div className="flex flex-1 overflow-hidden">
        <div id="sidebar-area" className="w-[240px] flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)] transition-colors duration-300">
          <div className={`grid grid-cols-[1.4fr_1fr_1fr] px-3 py-3 border-b border-[var(--border)] font-bold text-sm ${isDark ? 'bg-[#252526] text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
            <span>合约</span><span>最新</span><span>涨跌</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {SYMBOLS.map(sym => {
              const isActive = sym.code === mainSymbolCode;
              const bar = allData[sym.code]?.[gameState.cursor]; 
              if(!bar) return null;
              const chg = (bar.close - bar.open) / bar.open * 100;
              const colorClass = chg > 0 ? 'text-red-500' : (chg < 0 ? 'text-green-500' : 'text-[var(--text-main)]');
              return (
                <div key={sym.code} 
                     onClick={() => {
                        setMainSymbolCode(sym.code); setPosition(null); setMarkers([]); setPendingOrders([]); setHistory([]); setUserLines([]); setTrendLines([]);
                     }}
                     className={`grid grid-cols-[1.4fr_1fr_1fr] px-3 py-3 border-b border-[var(--border)] items-center cursor-pointer hover:bg-[var(--hover)] transition-colors relative ${isActive ? (isDark ? 'bg-[#2d2d2d]' : 'bg-blue-50') : ''}`}>
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#d4af37]"></div>}
                  <div>
                    <div className={`font-bold text-sm ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-sub)]'}`}>{sym.name}</div>
                    <div className={`font-mono text-xs ${isActive ? 'text-[#d4af37]' : 'text-[var(--text-sub)]'}`}>{sym.code.toUpperCase()}</div>
                  </div>
                  <div className={`text-right font-mono font-bold text-sm ${colorClass}`}>{bar.close.toFixed(sym.sector === 'metal' ? 2 : 0)}</div>
                  <div className={`text-right font-mono text-sm ${colorClass}`}>{chg > 0 ? '+' : ''}{chg.toFixed(2)}%</div>
                </div>
              )
            })}
          </div>
        </div>

        <div id="chart-area-wrapper" className="flex-1 flex flex-col bg-[var(--bg-panel)] min-w-0 relative">
           <div className={`flex-1 ${mode === 'dual' ? `grid grid-cols-2 gap-1 ${isDark ? 'bg-[#333]' : 'bg-gray-300'}` : 'block'}`}>
             <div className="relative overflow-hidden w-full h-full group/chart1" style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
               {allData[mainSymbolCode] && (
                 <ChartWidget 
                    data={allData[mainSymbolCode].slice(0, gameState.cursor + 1)} 
                    symbolName={SYMBOLS.find(s=>s.code===mainSymbolCode)?.name || ''}
                    markers={tradeMarkers}
                    macroEvents={visibleMacro}
                    aiPatterns={visibleAI}
                    volumeVisible={true}
                    priceLines={userLines}
                    trendLines={trendLines}
                    positionLine={posLineData}
                    cursorMode={cursorMode}
                    onChartClick={handleChartClick}
                    colors={mainColors}
                    theme={theme}
                 />
               )}
               <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                 <button 
                   onClick={() => setGameState(p => ({...p, showMacro: !p.showMacro}))}
                   className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] border transition-all shadow-md ${gameState.showMacro ? 'bg-orange-500/20 border-orange-500 text-orange-500' : (isDark ? 'bg-black/40 border-[#444] text-gray-400' : 'bg-white/80 border-gray-300 text-gray-500')}`}
                   title="显示宏观事件 (底部时间轴)"
                 >
                   <i className="fas fa-globe"></i> 宏观
                 </button>
                 <button 
                   onClick={() => setGameState(p => ({...p, showAI: !p.showAI}))}
                   className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] border transition-all shadow-md ${gameState.showAI ? 'bg-purple-500/20 border-purple-500 text-purple-400 animate-pulse' : (isDark ? 'bg-black/40 border-[#444] text-gray-400' : 'bg-white/80 border-gray-300 text-gray-500')}`}
                   title="开启AI技术分析识别 (图表标注)"
                 >
                   <i className="fas fa-robot"></i> AI助手
                 </button>
               </div>
               <div className="absolute top-2 right-2 z-20 flex gap-1 transition-opacity duration-200 opacity-0 group-hover/chart1:opacity-100">
                  <button onClick={() => setCursorMode(m => m === 'magnet' ? 'free' : 'magnet')} className={`p-1.5 rounded border ${isDark ? 'bg-black/60 text-gray-300 border-[#444] hover:bg-[#333]' : 'bg-white/80 text-gray-600 border-gray-300 hover:bg-gray-100'} min-w-[26px]`}><i className={`fas fa-${cursorMode === 'magnet' ? 'magnet' : 'mouse-pointer'} text-xs`}></i></button>
                  <div className={`w-[1px] mx-1 ${isDark ? 'bg-[#444]' : 'bg-gray-300'}`}></div>
                  <button onClick={() => setDrawTool(t => t === 'cursor' ? 'horizontal' : 'cursor')} className={`p-1.5 rounded border ${drawTool === 'horizontal' ? 'bg-[#d4af37] text-black border-[#d4af37]' : (isDark ? 'bg-black/60 text-gray-300 border-[#444] hover:bg-[#333]' : 'bg-white/80 text-gray-600 border-gray-300 hover:bg-gray-100')}`}><i className="fas fa-arrows-alt-h text-xs"></i></button>
                  <button onClick={() => setDrawTool(t => t === 'cursor' ? 'trend' : 'cursor')} className={`p-1.5 rounded border ${drawTool === 'trend' ? 'bg-[#d4af37] text-black border-[#d4af37]' : (isDark ? 'bg-black/60 text-gray-300 border-[#444] hover:bg-[#333]' : 'bg-white/80 text-gray-600 border-gray-300 hover:bg-gray-100')}`}><i className="fas fa-slash text-xs"></i></button>
                  <button onClick={clearDrawings} className={`p-1.5 rounded border ${isDark ? 'bg-black/60 text-gray-300 border-[#444] hover:bg-[#333]' : 'bg-white/80 text-gray-600 border-gray-300 hover:bg-gray-100'}`}><i className="fas fa-trash text-xs"></i></button>
               </div>
               {/* Note: Tooltip for Macro/AI is now in ChartWidget overlays */}
               {drawTool !== 'cursor' && <div className="absolute top-10 right-2 z-10 bg-black/70 text-[#d4af37] px-2 py-1 text-[10px] rounded border border-[#d4af37] animate-pulse pointer-events-none">{drawTool === 'horizontal' ? '点击图表绘制水平线' : (draftPoint ? '请点击第二个点' : '请点击第一个点')}</div>}
             </div>
             {mode === 'dual' && (
               <div className={`relative overflow-hidden group border-l w-full h-full ${isDark ? 'bg-black border-[#222]' : 'bg-white border-gray-300'}`}>
                  {allData[secSymbolCode] && <ChartWidget data={allData[secSymbolCode].slice(0, gameState.cursor + 1)} symbolName="" volumeVisible={true} colors={secColors} theme={theme} />}
                  <div className="absolute top-2 left-2 z-20">
                    <select className={`backdrop-blur-sm text-[#33ccff] border text-xs py-1 px-2 rounded outline-none hover:border-[#33ccff] transition-colors ${isDark ? 'bg-black/60 border-[#444]' : 'bg-white/80 border-gray-300'}`} value={secSymbolCode} onChange={(e) => setSecSymbolCode(e.target.value)}>
                      {SYMBOLS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                    </select>
                  </div>
               </div>
             )}
           </div>

           <div id="playback-controls" className="h-[42px] bg-[var(--bg-panel)] border-t border-[var(--border)] flex items-center px-3 gap-4 shrink-0 z-30 relative transition-colors duration-300">
              <div className={`flex items-center gap-1 p-0.5 rounded border ${isDark ? 'bg-[#2a2a2a] border-[#333]' : 'bg-gray-100 border-gray-200'}`}>
                 {(['15m', '1h', '4h', '1D'] as const).map(tf => (
                   <button key={tf} onClick={() => changeTimeframe(tf)} className={`px-2 py-0.5 text-[10px] rounded transition-colors ${gameState.timeframe === tf ? 'bg-[#d4af37] text-black font-bold' : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'}`}>{tf}</button>
                 ))}
              </div>
              <div className={`w-[1px] bg-[var(--border)] h-4 mx-1`}></div>
              <button onClick={togglePlay} className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${gameState.isPlaying ? 'bg-[#d4af37] text-black border-[#d4af37]' : (isDark ? 'bg-[#333] text-gray-300 border-[#444] hover:bg-[#444]' : 'bg-gray-200 text-gray-600 border-gray-300 hover:bg-gray-300')}`}><i className={`fas fa-${gameState.isPlaying ? 'pause' : 'play'}`}></i></button>
              <div className="flex-1 flex flex-col justify-center group">
                 <div className="flex justify-between text-[10px] text-[var(--text-sub)] font-mono mb-1">
                    <span>{currentBar ? formatDate(currentBar.time) + ' ' + formatTime(currentBar.time) : '--:--'}</span>
                    <span>{(gameState.cursor / (gameState.totalBars-1) * 100).toFixed(1)}%</span>
                 </div>
                 <input type="range" min={0} max={gameState.totalBars - 1} value={gameState.cursor} onChange={(e) => { setGameState(p => ({ ...p, cursor: parseInt(e.target.value) })); if (timerRef.current) clearInterval(timerRef.current); if (gameState.isPlaying) timerRef.current = window.setInterval(tick, gameState.speed); }} className={`w-full h-1 rounded-lg appearance-none cursor-pointer ${isDark ? 'bg-[#333] hover:bg-[#444]' : 'bg-gray-300 hover:bg-gray-400'}`} />
              </div>
              <div className={`flex items-center gap-2 p-1 rounded border ${isDark ? 'bg-[#2a2a2a] border-[#333]' : 'bg-gray-100 border-gray-200'}`}>
                 <span className="text-[10px] text-[var(--text-sub)] px-1">速度</span>
                 <select value={gameState.speed} onChange={(e) => setGameState(p => ({...p, speed: parseInt(e.target.value)}))} className={`bg-transparent text-xs outline-none border-none cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <option value={1000}>1.0x</option>
                    <option value={200}>5.0x</option>
                    <option value={50}>20x</option>
                    <option value={10}>Max</option>
                 </select>
              </div>
           </div>
        </div>

        <div id="trade-panel" className="w-[280px] flex flex-col bg-[var(--bg-panel)] border-l border-[var(--border)] transition-colors duration-300">
          <div className="shrink-0 border-b border-[var(--border)] py-1 font-mono text-xs" title="双击价格快速填单">
            {orderBookData.asks.map(item => (
               <div key={`ask-${item.i}`} onDoubleClick={() => handleOrderBookDbClick(item.price)} className="relative flex justify-between px-3 h-[18px] items-center hover:bg-[var(--hover)] z-0 cursor-pointer">
                 <div className="absolute top-0 right-0 bottom-0 bg-green-900/20 z-[-1] transition-all duration-300" style={{ width: `${item.width}%` }}></div>
                 <span className="text-green-500 z-10">卖{item.i}</span><span className="text-green-500 z-10">{item.price}</span><span className="text-gray-500 z-10">{item.vol}</span>
               </div>
            ))}
            <div className={`flex justify-center items-center my-1 py-1 text-sm font-bold border-y border-[var(--border)] ${isDark ? 'bg-[#222]' : 'bg-gray-100'} ${currentBar?.close >= currentBar?.open ? 'text-red-500' : 'text-green-500'}`}>{currentBar?.close.toFixed(0) || '----'} <span className="ml-2 text-[10px] text-gray-500">最新价</span></div>
            {orderBookData.bids.map(item => (
               <div key={`bid-${item.i}`} onDoubleClick={() => handleOrderBookDbClick(item.price)} className="relative flex justify-between px-3 h-[18px] items-center hover:bg-[var(--hover)] z-0 cursor-pointer">
                 <div className="absolute top-0 right-0 bottom-0 bg-red-900/20 z-[-1] transition-all duration-300" style={{ width: `${item.width}%` }}></div>
                 <span className="text-red-500 z-10">买{item.i}</span><span className="text-red-500 z-10">{item.price}</span><span className="text-gray-500 z-10">{item.vol}</span>
               </div>
            ))}
          </div>

          <div className={`shrink-0 p-4 border-b border-[var(--border)] ${isDark ? 'bg-[#191919]' : 'bg-gray-50'}`}>
            <div className="flex justify-between mb-2 items-center"><span className="text-[var(--text-sub)] text-xs">动态权益 (Equity)</span><span className="font-mono text-lg font-bold text-[#d4af37] tracking-wide">{formatNum(totalEquity)}</span></div>
            <div className="flex justify-between items-center mb-1"><span className="text-[var(--text-sub)] text-xs">可用资金 (Free)</span><span className="font-mono text-sm font-bold text-[var(--text-main)]">{formatNum(freeMargin)}</span></div>
            <div className="flex justify-between items-center"><span className="text-[var(--text-sub)] text-xs">持仓盈亏 (PnL)</span><span className={`font-mono text-sm font-bold ${floatingPnl > 0 ? 'text-red-500' : (floatingPnl < 0 ? 'text-green-500' : 'text-gray-400')}`}>{floatingPnl > 0 ? '+' : ''}{formatNum(floatingPnl)}</span></div>
          </div>

          <div className="shrink-0 p-4 border-b border-[var(--border)]">
            <div className={`flex p-0.5 rounded mb-3 ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-200'}`}>
              {(['Market', 'Limit', 'Stop'] as const).map(t => (
                <div key={t} onClick={() => setOrderType(t)} className={`flex-1 text-center py-1.5 cursor-pointer rounded text-[10px] transition-all ${orderType === t ? (isDark ? 'bg-[#444] text-white' : 'bg-white text-gray-800 shadow-sm') : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'}`}>{t === 'Market' ? '市价' : (t === 'Limit' ? '限价' : '条件')}</div>
              ))}
            </div>
            {orderType !== 'Market' && (
              <div className="mb-2 animate-[fadeIn_0.2s]">
                 <div className="flex justify-between text-[var(--text-sub)] mb-1 text-[10px]"><span>委托价格</span><span>{orderType === 'Limit' ? '低买高卖' : '突破成交'}</span></div>
                 <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder={currentBar?.close.toFixed(0)} className="w-full bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text-main)] text-right px-2 py-1.5 font-mono rounded focus:border-[#d4af37] outline-none transition-colors" />
              </div>
            )}
            <div className="mb-3">
              <div className="flex justify-between text-[var(--text-sub)] mb-1 text-[10px]"><span>下单数量 (手)</span><span className="text-[9px] opacity-70">保证金: {(mainSymbolInfo.marginRate * 100).toFixed(0)}%</span></div>
              <div className="flex gap-1">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className={`w-8 border border-[var(--border)] text-[var(--text-sub)] hover:text-[var(--text-main)] rounded-l active:bg-[var(--hover)] ${isDark ? 'bg-[#222]' : 'bg-gray-100'}`}>-</button>
                <input type="number" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 bg-[var(--input-bg)] border-y border-[var(--border)] text-[var(--text-main)] text-center font-mono py-1.5 outline-none focus:border-[#666]" />
                <button onClick={() => setQty(qty + 1)} className={`w-8 border border-[var(--border)] text-[var(--text-sub)] hover:text-[var(--text-main)] rounded-r active:bg-[var(--hover)] ${isDark ? 'bg-[#222]' : 'bg-gray-100'}`}>+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => submitOrder(1)} className="py-2 bg-[#8b1a1a] hover:bg-[#a61e1e] active:bg-[#701515] text-white font-bold rounded text-sm flex flex-col items-center transition-colors shadow-lg"><span>买入开多</span><span className="text-[9px] opacity-70 font-normal">LONG</span></button>
               <button onClick={() => submitOrder(-1)} className="py-2 bg-[#1a661e] hover:bg-[#1f8024] active:bg-[#145218] text-white font-bold rounded text-sm flex flex-col items-center transition-colors shadow-lg"><span>卖出开空</span><span className="text-[9px] opacity-70 font-normal">SHORT</span></button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto flex flex-col ${isDark ? 'bg-[#161616]' : 'bg-gray-50'}`}>
             {pendingOrders.length > 0 && (
               <div className="mb-2 border-b border-[var(--border)]">
                  <div className={`px-4 py-1 text-gray-500 text-[10px] font-bold ${isDark ? 'bg-[#222]' : 'bg-gray-200'}`}>当前委托 Pending</div>
                  {pendingOrders.map(o => (
                    <div key={o.id} className="px-4 py-2 border-b border-[var(--border)] flex justify-between items-center hover:bg-[var(--hover)] group">
                       <div className="flex flex-col"><span className={`text-[11px] font-bold ${o.direction === 1 ? 'text-red-400' : 'text-green-400'}`}>{o.type === 'Limit' ? '限价' : '条件'}{o.direction === 1 ? '买入' : '卖出'}</span><span className="text-[10px] text-[var(--text-sub)] font-mono">@ {o.price} x {o.qty}</span></div>
                       <button onClick={() => cancelOrder(o.id)} className={`text-[10px] border border-[var(--border)] px-2 py-0.5 rounded text-[var(--text-sub)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-colors`}>撤单</button>
                    </div>
                  ))}
               </div>
             )}
             <div className={`px-4 py-2 text-gray-500 text-[11px] border-y border-[var(--border)] font-bold ${isDark ? 'bg-[#222]' : 'bg-gray-200'}`}>当前持仓 Position</div>
             {!position || position.qty === 0 ? (
               <div className="flex-1 flex items-center justify-center text-[var(--text-sub)] text-xs flex-col gap-2 opacity-50 min-h-[100px]"><i className="fas fa-box-open text-2xl"></i><span>无持仓</span></div>
             ) : (
               <div className={`p-4 animate-[slideIn_0.2s] ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                 <div className="flex justify-between mb-2"><span className="font-bold text-[var(--text-main)] text-sm">{SYMBOLS.find(s=>s.code===position.symbol)?.name}</span><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${position.direction === 1 ? 'bg-red-600' : 'bg-green-600'}`}>{position.direction === 1 ? '多单' : '空单'}</span></div>
                 <div className="grid grid-cols-2 gap-y-1 text-[11px] text-[var(--text-sub)] mb-3"><div>均价 <span className={`font-mono ml-1 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{position.avgPrice.toFixed(1)}</span></div><div>现价 <span className={`font-mono ml-1 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{currentBar?.close.toFixed(1)}</span></div><div>手数 <span className={`font-mono ml-1 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{position.qty}</span></div><div>占用 <span className={`font-mono ml-1 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{usedMargin.toFixed(0)}</span></div></div>
                 <div className="flex justify-between items-end border-t border-[var(--border)] pt-2"><span className="text-[var(--text-sub)] text-[10px]">浮动盈亏</span><span className={`font-mono text-xl font-bold ${floatingPnl > 0 ? 'text-red-500' : (floatingPnl < 0 ? 'text-green-500' : 'text-[var(--text-main)]')}`}>{floatingPnl > 0 ? '+' : ''}{formatNum(floatingPnl)}</span></div>
                 <div className="mt-3 flex gap-2"><button onClick={() => executeTrade(position.direction === 1 ? -1 : 1, position.qty, currentBar!.close, currentBar!.time)} className={`flex-1 py-1.5 border border-[var(--border)] text-[var(--text-sub)] text-xs rounded hover:bg-[var(--hover)] hover:text-[var(--text-main)] transition-colors`}>全平</button></div>
               </div>
             )}
          </div>
        </div>
      </div>

      {isSetupOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className={`border border-[var(--border)] w-[380px] rounded-lg shadow-2xl overflow-hidden animate-[scaleIn_0.2s] ${isDark ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b border-[var(--border)] font-bold text-[#d4af37] text-lg flex items-center gap-2 ${isDark ? 'bg-[#252526]' : 'bg-gray-100'}`}><i className="fas fa-sliders-h text-sm"></i> 复盘配置</div>
            <div className="p-6 space-y-5">
               <div><label className="block text-xs text-[var(--text-sub)] mb-1.5 uppercase tracking-wider font-bold">初始资金</label><div className={`flex justify-between p-3 border border-[var(--border)] mb-3 rounded-md ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}><span className="font-mono text-[#d4af37] text-lg">{gameState.initMoney.toLocaleString()}</span><span className="text-gray-500 text-xs self-center">RMB</span></div><input type="range" min="10000" max="1000000" step="10000" value={gameState.initMoney} onChange={e => setGameState(p=>({...p, initMoney: parseInt(e.target.value)}))} className="w-full"/></div>
               
               <div>
                 <label className="block text-xs text-[var(--text-sub)] mb-1.5 uppercase tracking-wider font-bold">开始日期</label>
                 <input type="date" min="2020-01-01" max="2025-06-01" value={startDateInput} onChange={e => setStartDateInput(e.target.value)} className={`w-full p-3 rounded-md outline-none border border-[var(--border)] ${isDark ? 'bg-[#111] text-gray-300' : 'bg-gray-50 text-gray-800'}`} />
                 <div className="text-[10px] text-gray-500 mt-1">最大回放日期至 2025-11-30</div>
               </div>
               
               <div><label className="block text-xs text-[var(--text-sub)] mb-1.5 uppercase tracking-wider font-bold">标的合约</label><select className={`w-full border border-[var(--border)] text-[var(--text-main)] p-3 outline-none rounded-md hover:border-[var(--text-sub)] transition-colors cursor-pointer ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`} value={mainSymbolCode} onChange={e => setMainSymbolCode(e.target.value)}>{SYMBOLS.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}</select></div>
               <div>
                 <label className="block text-xs text-[var(--text-sub)] mb-1.5 uppercase tracking-wider font-bold">显示模式</label>
                 <div className="flex gap-3">
                    <div onClick={() => setMode('single')} className={`flex-1 p-3 border rounded-md cursor-pointer transition-all ${mode==='single' ? (isDark ? 'bg-[#2a2a2a] border-[#d4af37] text-white' : 'bg-blue-50 border-[#d4af37] text-gray-800') : 'border-[var(--border)] text-[var(--text-sub)] hover:bg-[var(--hover)]'}`}><div className="text-sm font-bold mb-1">单图模式</div><div className="text-[10px]">沉浸式大图体验</div></div>
                    <div onClick={() => setMode('dual')} className={`flex-1 p-3 border rounded-md cursor-pointer transition-all ${mode==='dual' ? (isDark ? 'bg-[#2a2a2a] border-[#d4af37] text-white' : 'bg-blue-50 border-[#d4af37] text-gray-800') : 'border-[var(--border)] text-[var(--text-sub)] hover:bg-[var(--hover)]'}`}><div className="text-sm font-bold mb-1">双图模式</div><div className="text-[10px]">多品种联动分析</div></div>
                 </div>
               </div>
            </div>
            <div className={`p-5 border-t border-[var(--border)] text-right ${isDark ? 'bg-[#222]' : 'bg-gray-100'}`}>
              <button onClick={() => startSystem(gameState.initMoney, mainSymbolCode, mode, startDateInput)} className="bg-[#d4af37] text-black font-bold px-8 py-2.5 rounded hover:bg-[#b5952f] transition-transform active:scale-95 shadow-lg shadow-amber-900/20">开始复盘 <i className="fas fa-arrow-right ml-1 text-xs"></i></button>
            </div>
          </div>
        </div>
      )}

      {isResultOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-[fadeIn_0.5s]">
           <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/90' : 'bg-white/90'}`}></div>
           {gameState.money < gameState.initMoney && <RainEffect />}
           {gameState.money === gameState.initMoney && <ZenEffect isDark={isDark} />}
           <div className={`border border-[var(--border)] w-[480px] max-h-[90vh] flex flex-col rounded-lg shadow-2xl transform scale-105 relative z-10 ${isDark ? 'bg-[#1f1f1f]' : 'bg-white'}`}>
              <div className={`px-5 py-4 border-b border-[var(--border)] font-bold text-[#d4af37] text-center text-lg shrink-0 ${isDark ? 'bg-[#252526]' : 'bg-gray-50'}`}>复盘结算报告</div>
              <div className="p-8 text-center overflow-y-auto custom-scrollbar">
                 {!showHistory ? (
                   <>
                     <div className="text-xs text-[var(--text-sub)] mb-2 uppercase tracking-widest">最终权益</div>
                     <div className="text-5xl font-bold text-[#d4af37] font-mono mb-8 drop-shadow-md">{formatNum(gameState.money)}</div>
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className={`p-4 rounded border border-[var(--border)] flex flex-col gap-1 ${isDark ? 'bg-[#151515]' : 'bg-gray-50'}`}><div className="text-[10px] text-gray-500 uppercase">收益率</div><div className={`font-bold text-xl font-mono ${gameState.money > gameState.initMoney ? 'text-red-500' : (gameState.money < gameState.initMoney ? 'text-green-500' : 'text-[var(--text-main)]')}`}>{((gameState.money - gameState.initMoney)/gameState.initMoney * 100).toFixed(2)}%</div></div>
                        <div className={`p-4 rounded border border-[var(--border)] flex flex-col gap-1 ${isDark ? 'bg-[#151515]' : 'bg-gray-50'}`}><div className="text-[10px] text-gray-500 uppercase">胜率</div><div className="font-bold text-xl text-[var(--text-main)] font-mono">{gameState.tradeCount > 0 ? ((gameState.winCount / gameState.tradeCount) * 100).toFixed(1) : '0.0'}%</div></div>
                        <div className={`p-4 rounded border border-[var(--border)] flex flex-col gap-1 ${isDark ? 'bg-[#151515]' : 'bg-gray-50'}`}><div className="text-[10px] text-gray-500 uppercase">交易笔数</div><div className="font-bold text-xl text-[var(--text-main)] font-mono">{gameState.tradeCount}</div></div>
                        <div className={`p-4 rounded border border-[var(--border)] flex flex-col gap-1 ${isDark ? 'bg-[#151515]' : 'bg-gray-50'}`}><div className="text-[10px] text-gray-500 uppercase">复盘标的</div><div className="font-bold text-lg text-[#33ccff]">{SYMBOLS.find(s=>s.code===mainSymbolCode)?.name}</div></div>
                     </div>
                     <button onClick={() => setShowHistory(true)} className="text-[var(--text-sub)] hover:text-[#d4af37] text-xs underline mb-2">查看详细交易记录</button>
                   </>
                 ) : (
                   <div className="text-left h-[300px]">
                      <div className="flex justify-between items-center mb-4"><h3 className="text-[var(--text-main)] font-bold">交易明细</h3><button onClick={() => setShowHistory(false)} className="text-xs text-[#d4af37]">返回报告</button></div>
                      <div className={`overflow-y-auto max-h-[260px] border border-[var(--border)] rounded ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
                        <table className="w-full text-[10px] text-gray-400">
                          <thead className={`sticky top-0 text-gray-500 ${isDark ? 'bg-[#222]' : 'bg-gray-200'}`}><tr><th className="p-2 text-left">时间</th><th className="p-2 text-left">类型</th><th className="p-2 text-right">价格</th><th className="p-2 text-right">手续费</th><th className="p-2 text-right">盈亏</th></tr></thead>
                          <tbody>
                            {history.length === 0 && <tr><td colSpan={5} className="p-4 text-center opacity-50">无交易记录</td></tr>}
                            {history.map(r => (
                              <tr key={r.id} className={`border-b border-[var(--border)] hover:bg-[var(--hover)]`}><td className="p-2 font-mono">{formatTime(r.time)}</td><td className={`p-2 font-bold ${r.direction===1 ? 'text-red-500' : 'text-green-500'}`}>{r.type === 'Open' ? '开' : (r.type === 'Close' ? '平' : '反')}{r.direction === 1 ? '多' : '空'}</td><td className="p-2 text-right font-mono">{r.price.toFixed(1)}</td><td className="p-2 text-right font-mono text-gray-500">-{r.fee}</td><td className={`p-2 text-right font-mono font-bold ${r.pnl ? (r.pnl > 0 ? 'text-red-500' : 'text-green-500') : 'text-gray-500'}`}>{r.pnl ? r.pnl.toFixed(0) : '-'}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                   </div>
                 )}
              </div>
              <div className={`p-5 border-t border-[var(--border)] text-center shrink-0 ${isDark ? 'bg-[#222]' : 'bg-gray-100'}`}>
                <button onClick={reset} className="bg-[#d4af37] text-black font-bold px-10 py-3 rounded hover:bg-[#b5952f] transition-all hover:scale-105 shadow-lg">{gameState.money > gameState.initMoney ? '再接再厉' : (gameState.money < gameState.initMoney ? '不服再战' : '重新开始')}</button>
              </div>
           </div>
        </div>
      )}
      {isOnboarding && <Onboarding onComplete={() => setIsOnboarding(false)} />}
    </div>
  );
};

export default App;