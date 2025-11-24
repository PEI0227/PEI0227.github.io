
export interface SymbolInfo {
  code: string;
  name: string;
  basePrice: number;
  multiplier: number;
  volatility: number;
  sector: 'metal' | 'energy' | 'agri' | 'index' | 'chemical';
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
  pnl?: number;
}

export interface Marker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text?: string;
  size?: number;
}

export interface PositionLine {
  price: number;
  pnl: number;
  text?: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warn';
}

export interface Point {
  time: number;
  price: number;
}

export interface TrendLine {
  id: number;
  p1: Point;
  p2: Point;
  color: string;
}

export type TimeFrame = '1m' | '5m' | '15m' | '1D';

export type DrawingTool = 'cursor' | 'horizontal' | 'trend';

export interface GameState {
  isPlaying: boolean;
  speed: number;
  cursor: number; // Current index in the data array
  totalBars: number;
  money: number;
  initMoney: number;
  tradeCount: number;
  winCount: number;
}
