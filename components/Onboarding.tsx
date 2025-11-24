import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "欢迎来到 期货通 PRO",
      desc: "专业级历史复盘训练系统。快速熟悉核心功能，开启您的交易进阶之路。",
      position: "center",
      target: null
    },
    {
      title: "全市场行情监控",
      desc: "左侧列表实时刷新20+主流合约行情。点击任意合约可快速切换主图，数据全市场实时联动。",
      position: "right-start",
      target: "#sidebar-area",
    },
    {
      title: "专业K线图表",
      desc: "支持单图/双图模式切换。右上角工具栏可开启画线功能。双图模式下可对比不同品种走势。",
      position: "bottom-start",
      target: "#chart-area-wrapper",
      styleOverride: { left: '300px', top: '100px' } 
    },
    {
      title: "时光回溯控制",
      desc: "下方进度条控制历史回放。支持 1x - Max 多档倍速。拖动滑块可瞬间跳转至历史任意时刻。",
      position: "top-center",
      target: "#playback-controls",
    },
    {
      title: "极速交易面板",
      desc: "右侧集成了盘口深度、资金权益与下单功能。支持快捷键买卖与一键平仓。",
      position: "left-start",
      target: "#trade-panel",
    }
  ];

  const curr = steps[step];

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  // Styles for overlay positioning
  const getOverlayStyle = (): React.CSSProperties => {
     if (curr.position === 'center') return {};
     if (curr.styleOverride) return curr.styleOverride;

     const targetEl = curr.target ? document.querySelector(curr.target) : null;
     if (!targetEl) return {};

     const rect = targetEl.getBoundingClientRect();
     const gap = 20;

     switch (curr.position) {
       case 'right-start': 
         return { top: rect.top + 50, left: rect.right + gap };
       case 'left-start': 
         return { top: rect.top + 100, right: window.innerWidth - rect.left + gap };
       case 'top-center':
         return { bottom: window.innerHeight - rect.top + gap, left: rect.left + rect.width/2 - 150 };
       default:
         return { top: 100, left: 100 };
     }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-colors duration-500"></div>

      {/* Highlight Mask (Visual trickery) */}
      {curr.target && (() => {
         const el = document.querySelector(curr.target);
         if(!el) return null;
         const rect = el.getBoundingClientRect();
         return (
           <div 
             className="absolute border-2 border-[#d4af37] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-sm pointer-events-none transition-all duration-300 ease-in-out"
             style={{
               top: rect.top,
               left: rect.left,
               width: rect.width,
               height: rect.height,
             }}
           />
         )
      })()}

      {/* Card */}
      <div 
        className={`absolute bg-[#1e1e1e] border border-[#333] p-0 rounded-lg shadow-2xl w-[320px] flex flex-col animate-[fadeIn_0.3s_ease-out] ${curr.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
        style={curr.position !== 'center' ? getOverlayStyle() : {}}
      >
        {/* Card Header Image/Gradient */}
        <div className="h-2 w-full bg-gradient-to-r from-[#d4af37] to-[#8a6e18]"></div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-lg font-bold text-white">{curr.title}</h3>
             <span className="text-[10px] font-mono text-gray-500 bg-[#111] px-2 py-1 rounded border border-[#333]">{step + 1}/{steps.length}</span>
          </div>
          
          <p className="text-sm text-gray-400 leading-relaxed mb-6 min-h-[60px]">
            {curr.desc}
          </p>

          <div className="flex justify-between items-center">
             <button 
               onClick={onComplete} 
               className="text-xs text-gray-500 hover:text-white transition-colors px-2"
             >
               跳过教程
             </button>
             <div className="flex gap-2">
                {step > 0 && (
                  <button 
                    onClick={() => setStep(s => s - 1)}
                    className="px-4 py-1.5 border border-[#444] text-gray-300 text-xs rounded hover:bg-[#333]"
                  >
                    上一步
                  </button>
                )}
                <button 
                  onClick={next} 
                  className="px-5 py-1.5 bg-[#d4af37] text-black font-bold text-xs rounded hover:bg-[#e5c35a] shadow-lg shadow-amber-900/20"
                >
                  {step === steps.length - 1 ? "开始交易" : "下一步"}
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};