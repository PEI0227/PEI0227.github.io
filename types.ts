
export interface SymbolInfo {
  code: string;
  name: string;
  basePrice: number;
  multiplier: number;
  volatility: number;
  sector: 'metal' | 'energy' | 'agri' | 'index' | 'chemical';
  marginRate: number; // e.g., 0.10 for 10%
  fee: number;        // Fixed fee per lot
}

export interface BarData {
  time: number; // unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Order {
  id: number;
  symbol: string;
  type: 'Market' | 'Limit' | 'Stop';
  direction: 1 | -1; // 1 for Buy, -1 for Sell
  qty: number;
  price: number; // Trigger/Limit price
  timestamp: number;
}

export interface Position {
  symbol: string;
  direction: 1 | -1;
  qty: number;
  avgPrice: number;
}

export interface TradeRecord {
  id: number;
  time: number;
  symbol: string;
  type: 'Open' | 'Close' | 'Reverse';
  direction: 1 | -1;
  price: number;
  qty: number;
  fee: number; 
  pnl?: number;
}

export interface Marker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text?: string;
  size?: number;
  id?: string; // To identify specific markers like Macro events
}

export interface PositionLine {
  price: number;
  pnl: number;
  text?: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warn' | 'error';
}

export interface Point {
  time: number;
  price: number;
  logical?: number; 
}

export interface TrendLine {
  id: number;
  p1: Point;
  p2: Point;
  color: string;
}

export type TimeFrame = '15m' | '1h' | '4h' | '1D';

export type DrawingTool = 'cursor' | 'horizontal' | 'trend';

export interface MacroEvent {
  id: string;
  time: number;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface AIPattern {
  id: number;
  time: number;
  price: number;
  type: 'Support' | 'Resistance' | 'DoubleTop' | 'DoubleBottom' | 'Bullish' | 'Bearish';
  label: string;
}

export interface GameState {
  isPlaying: boolean;
  speed: number;
  cursor: number; 
  totalBars: number;
  money: number;
  initMoney: number;
  tradeCount: number;
  winCount: number;
  timeframe: TimeFrame;
  startDate: string; // YYYY-MM-DD
  showMacro: boolean;
  showAI: boolean;
}
