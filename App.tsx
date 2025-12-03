import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Sparkles, RefreshCcw, ScrollText, ArrowRight } from 'lucide-react';
import { DivinationState, HexagramLine, LineType, AIInterpretation, LiuYaoLineInfo } from './types';
import CoinStage from './components/CoinStage';
import YinYangLine from './components/YinYangLine';
import { interpretHexagram } from './services/geminiService';

export default function App() {
  const [state, setState] = useState<DivinationState>({
    step: 'INPUT',
    question: '',
    lines: [],
    currentLineIndex: 0
  });
  
  const [interpretation, setInterpretation] = useState<AIInterpretation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateLineValue = (coins: [boolean, boolean, boolean]): LineType => {
    // True = Head (3), False = Tail (2)
    const sum = coins.reduce((acc, isHead) => acc + (isHead ? 3 : 2), 0);
    return sum as LineType;
  };

  const handleTossComplete = (coins: [boolean, boolean, boolean]) => {
    // Add a small delay so the user sees the coins settle before the line appears/resets
    setTimeout(() => {
        const value = calculateLineValue(coins);
        const newLine: HexagramLine = {
          position: state.currentLineIndex + 1,
          value,
          coins
        };
    
        setState(prev => {
          const newLines = [...prev.lines, newLine];
          const nextIndex = prev.currentLineIndex + 1;
          
          if (nextIndex >= 6) {
            return {
              ...prev,
              lines: newLines,
              currentLineIndex: nextIndex,
              step: 'COMPLETED'
            };
          }
          
          return {
            ...prev,
            lines: newLines,
            currentLineIndex: nextIndex
          };
        });
    }, 600);
  };

  const startDivination = () => {
    if (!state.question.trim()) return;
    setState(prev => ({ ...prev, step: 'TOSSING' }));
  };

  const getInterpretation = async () => {
    setState(prev => ({ ...prev, step: 'INTERPRETING' }));
    setError(null);
    try {
      const result = await interpretHexagram(state.question, state.lines);
      setInterpretation(result);
      setState(prev => ({ ...prev, step: 'RESULT' }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Consultation failed.");
      setState(prev => ({ ...prev, step: 'COMPLETED' }));
    }
  };

  const reset = () => {
    setState({
      step: 'INPUT',
      question: '',
      lines: [],
      currentLineIndex: 0
    });
    setInterpretation(null);
    setError(null);
  };

  const getLineType = (lineInfo: LiuYaoLineInfo): LineType => {
    if (lineInfo.type.includes("阴")) return LineType.YoungYin;
    return LineType.YoungYang;
  };
  
  const renderSimpleLines = () => {
    const displayLines = [...state.lines].reverse();
    const emptySlots = 6 - displayLines.length;
    
    return (
      <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-inner border border-stone-200">
        <h3 className="text-stone-400 text-sm font-serif mb-4 uppercase tracking-widest">本卦卦象</h3>
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="w-64 md:w-80 h-4 my-2 border border-dashed border-stone-200 rounded-sm"></div>
        ))}
        {displayLines.map((line) => (
          <div key={line.position} className="w-64 md:w-80 my-2">
            <YinYangLine type={line.value} animate={true} />
          </div>
        ))}
      </div>
    );
  };

  // Helper for Six Beast Styles
  const getBeastStyle = (name: string) => {
    if (name.includes("青龙")) return "text-emerald-700 bg-emerald-50 border-emerald-200"; // Wood/Green
    if (name.includes("朱雀")) return "text-rose-700 bg-rose-50 border-rose-200";       // Fire/Red
    if (name.includes("勾陈")) return "text-amber-700 bg-amber-50 border-amber-200";     // Earth/Yellow
    if (name.includes("螣蛇")) return "text-orange-700 bg-orange-50 border-orange-200";   // Earth/Fire/Orange
    if (name.includes("白虎")) return "text-slate-600 bg-slate-100 border-slate-300";    // Metal/White
    if (name.includes("玄武")) return "text-indigo-900 bg-indigo-50 border-indigo-200";   // Water/Black
    return "text-stone-400 bg-stone-50 border-stone-200";
  };

  const renderLiuYaoChart = (data: AIInterpretation) => {
    return (
      <div className="overflow-x-auto pb-4">
        {/* Increased min-width to ensure columns don't collapse */}
        <div className="min-w-[900px] text-sm md:text-base font-serif px-2">
          {/* Chart Header Info */}
          <div className="flex justify-between items-end mb-6 border-b-2 border-stone-800 pb-2">
            <div>
              <div className="text-stone-500 text-xs mb-1">公历 {new Date().toLocaleDateString()}</div>
              <div className="text-lg font-bold text-stone-900">
                {data.dateInfo.lunar} 
                <span className="text-stone-500 text-base font-normal ml-2">空亡: {data.dateInfo.kongWang}</span>
              </div>
            </div>
            <div className="text-right">
               <div className="text-stone-900 font-bold text-lg">{data.hexagramHeader.palace}</div>
               <div className="text-stone-500 text-sm">{data.hexagramHeader.category}</div>
            </div>
          </div>

          <div className="flex justify-center gap-6">
            {/* --- Main Hexagram Table --- */}
            <div className="flex-1">
              <div className="text-center mb-4 font-bold text-xl text-stone-900">
                {data.hexagramHeader.name} (本卦)
              </div>
              
              <div className="flex flex-col gap-1">
                {data.mainStack.map((line, idx) => {
                  const originalLine = state.lines.find(l => l.position === line.position);
                  const lineType = originalLine ? originalLine.value : LineType.YoungYang;
                  const isMoving = lineType === LineType.OldYin || lineType === LineType.OldYang;
                  const isShi = line.shiYing.includes('世');
                  const isYing = line.shiYing.includes('应');

                  // Animation Delay Logic
                  // MainStack is 6->1. We want 1->6.
                  // Index 0 is Top (Line 6), Index 5 is Bottom (Line 1).
                  // Delay factor based on position from bottom.
                  // Line 1 (idx 5): 0ms
                  // Line 6 (idx 0): 5 * 150 = 750ms
                  const rowDelay = (5 - idx) * 150; 
                  // Beast stamp appears slightly after the row slides in
                  const beastDelay = rowDelay + 300; 
                  
                  return (
                    <div 
                      key={idx} 
                      className={`
                        grid grid-cols-[4rem_4.5rem_7rem_1fr_2.5rem] gap-3 items-center h-12 px-3 rounded
                        ${isMoving ? 'bg-amber-50/80 border border-amber-100' : 'hover:bg-stone-50 border border-transparent'}
                        transition-all duration-700 ease-out animate-slide-up-fade
                      `}
                      style={{ animationDelay: `${rowDelay}ms`, opacity: 0, animationFillMode: 'forwards' }}
                    >
                      {/* 1. Six Beast (Animated Stamp) */}
                      <div className="flex justify-center">
                        <div 
                            className={`
                                text-xs font-bold px-2 py-1 rounded border shadow-sm w-full text-center tracking-widest
                                ${getBeastStyle(line.liuShou)}
                                animate-stamp-in
                            `}
                            style={{ animationDelay: `${beastDelay}ms` }}
                        >
                            {line.liuShou}
                        </div>
                      </div>

                      {/* 2. Six Kinship */}
                      <div className="text-stone-600 text-center text-sm font-medium whitespace-nowrap">
                        {line.liuQin}
                      </div>

                      {/* 3. GanZhi */}
                      <div className={`text-right text-sm whitespace-nowrap ${isMoving ? 'text-red-700 font-bold' : 'text-stone-800'}`}>
                        {line.ganZhi}
                      </div>
                      
                      {/* 4. The Bar */}
                      <div className="w-full flex items-center justify-center">
                         <YinYangLine type={lineType} animate={true} isMoving={isMoving} delay={rowDelay} />
                      </div>
                      
                      {/* 5. Shi/Ying */}
                      <div className="flex justify-center">
                        {isShi && <span className="bg-red-700 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded shadow-sm">世</span>}
                        {isYing && <span className="bg-stone-200 text-stone-600 text-[10px] w-6 h-6 flex items-center justify-center rounded">应</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --- Transformed Hexagram Table (Conditional) --- */}
            {data.transformStack && data.transformStack.length > 0 && (
              <>
                <div className="flex flex-col justify-center text-stone-300 w-8">
                  <ArrowRight className="w-6 h-6" />
                </div>
                
                <div className="flex-1 opacity-90">
                  <div className="text-center mb-4 font-bold text-xl text-stone-600">
                     之卦
                  </div>
                  <div className="flex flex-col gap-1">
                     {data.transformStack.map((line, idx) => {
                        const lineType = getLineType(line);
                        const mainLinePos = data.mainStack[idx].position;
                        const originalLine = state.lines.find(l => l.position === mainLinePos);
                        const isMoving = originalLine ? (originalLine.value === LineType.OldYin || originalLine.value === LineType.OldYang) : false;
                        const opacityClass = isMoving ? 'opacity-100' : 'opacity-30 grayscale';
                        
                        const rowDelay = (5 - idx) * 150; 

                        return (
                           <div 
                                key={idx} 
                                className={`grid grid-cols-[1fr_7rem_4.5rem] gap-3 items-center h-12 px-3 rounded ${isMoving ? 'bg-amber-50/50 border border-amber-50' : 'border border-transparent'} animate-slide-up-fade`}
                                style={{ animationDelay: `${rowDelay}ms`, opacity: 0, animationFillMode: 'forwards' }}
                           >
                              {/* 1. The Bar */}
                              <div className={`w-full ${opacityClass}`}>
                                 <YinYangLine type={lineType} animate={true} delay={rowDelay} />
                              </div>

                              {/* 2. GanZhi */}
                              <div className={`text-left text-sm whitespace-nowrap ${isMoving ? 'text-stone-900 font-bold' : 'text-stone-400'}`}>
                                {line.ganZhi}
                              </div>

                              {/* 3. Kinship */}
                              <div className={`text-left text-sm whitespace-nowrap ${isMoving ? 'text-stone-600' : 'text-stone-300'}`}>
                                {line.liuQin}
                              </div>
                           </div>
                        )
                     })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-stone-900 flex flex-col font-serif selection:bg-red-100 selection:text-red-900">
      {/* Header */}
      <header className="p-6 text-center border-b border-stone-200 bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-stone-900 text-stone-100 rounded flex items-center justify-center font-bold text-xl border-2 border-stone-800 shadow-md">
            爻
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] text-stone-900">六爻神课</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Step 1: Question Input */}
        {state.step === 'INPUT' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
            <div className="bg-white p-8 md:p-12 rounded-lg shadow-xl max-w-2xl w-full text-center border border-stone-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-stone-200 via-stone-400 to-stone-200"></div>
              
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-800">
                <span className="text-3xl font-serif">☯</span>
              </div>
              
              <h2 className="text-3xl font-bold mb-4 text-stone-900 tracking-wider">文王金钱课</h2>
              <p className="text-stone-500 mb-8 leading-relaxed font-serif">
                至诚之道，可以前知。<br/>请输入求测事项，系统将依据纳甲法为您排盘。
              </p>
              
              <textarea
                value={state.question}
                onChange={(e) => setState(prev => ({ ...prev, question: e.target.value }))}
                placeholder="例如：近期事业运势如何？"
                className="w-full p-4 text-lg border border-stone-300 rounded focus:border-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800 bg-stone-50 mb-8 min-h-[120px] resize-none transition-colors placeholder:text-stone-400 font-serif"
              />
              
              <button
                onClick={startDivination}
                disabled={!state.question.trim()}
                className="w-full bg-stone-900 text-[#f7f5f0] py-4 rounded text-xl font-bold tracking-[0.1em] hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-stone-900"
              >
                开始摇卦
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Tossing Process */}
        {state.step === 'TOSSING' && (
          <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
            <div className="w-full md:w-5/12 order-2 md:order-1">
              <div className="bg-white p-6 rounded-lg shadow-lg border border-stone-200 text-center sticky top-24">
                <p className="text-xs text-stone-400 uppercase tracking-widest mb-2 border-b border-stone-100 pb-2">所测之事</p>
                <p className="text-lg font-bold text-stone-800 italic font-serif leading-snug">"{state.question}"</p>
                <div className="my-6 border-t border-dashed border-stone-200"></div>
                <CoinStage 
                  onTossComplete={handleTossComplete} 
                  disabled={false} 
                  lineIndex={state.currentLineIndex} 
                />
              </div>
            </div>
            
            <div className="w-full md:w-5/12 order-1 md:order-2 flex justify-center">
               {renderSimpleLines()}
            </div>
          </div>
        )}

        {/* Step 3: Completed / Interpreting */}
        {(state.step === 'COMPLETED' || state.step === 'INTERPRETING') && (
          <div className="flex flex-col items-center justify-center gap-8 animate-fade-in-up">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-2">卦象已成</h2>
              <p className="text-stone-500 font-serif">正在进行纳甲排盘与六亲推演...</p>
            </div>

            {renderSimpleLines()}

            {state.step === 'COMPLETED' ? (
               <div className="flex flex-col gap-4 w-full max-w-md">
                 {error && (
                    <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded text-center mb-4">
                        {error}
                    </div>
                 )}
                 <button
                    onClick={getInterpretation}
                    className="w-full bg-red-900 text-white py-4 rounded text-xl font-bold tracking-wide hover:bg-red-800 transition-all shadow-lg flex items-center justify-center gap-2 border border-red-950"
                  >
                    <BookOpen className="w-6 h-6" />
                    大师排盘解卦
                  </button>
                  <button
                    onClick={reset}
                    className="text-stone-500 hover:text-stone-800 py-2 transition-colors border-b border-transparent hover:border-stone-400"
                  >
                    重新起卦
                  </button>
               </div>
            ) : (
                <div className="flex flex-col items-center gap-4 mt-8">
                    <div className="w-12 h-12 border-4 border-stone-200 border-t-red-900 rounded-full animate-spin"></div>
                    <p className="text-stone-600 animate-pulse font-serif">排盘中...</p>
                </div>
            )}
          </div>
        )}

        {/* Step 4: Final Result */}
        {state.step === 'RESULT' && interpretation && (
          <div className="max-w-6xl mx-auto animate-fade-in-up pb-20">
             <div className="flex justify-between items-center mb-6 px-4">
                <button onClick={reset} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
                    <RefreshCcw className="w-4 h-4" /> 重新开始
                </button>
             </div>

             <div className="bg-white rounded shadow-2xl border border-stone-200 overflow-hidden">
                {/* Header Section */}
                <div className="bg-[#1c1917] text-[#e7e5e4] p-6 md:p-8 text-center relative border-b-4 border-red-900">
                    <h2 className="text-3xl md:text-5xl font-bold mb-2 font-serif tracking-[0.15em]">{interpretation.hexagramHeader.name}</h2>
                    <p className="text-stone-500 font-serif italic">{interpretation.hexagramHeader.pinyin}</p>
                </div>

                <div className="p-4 md:p-10 space-y-12 bg-stone-50">
                    
                    {/* The Chart */}
                    <section className="bg-white p-6 rounded shadow-sm border border-stone-200 overflow-x-auto">
                        {renderLiuYaoChart(interpretation)}
                    </section>

                    {/* Summary */}
                    <section className="grid md:grid-cols-12 gap-8">
                        <div className="md:col-span-4">
                           <div className="bg-red-50 p-6 rounded border-l-4 border-red-800 h-full shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-red-800" />
                                    <h3 className="text-lg font-bold text-red-900 uppercase tracking-wide">吉凶总断</h3>
                                </div>
                                <div className="text-red-900 font-bold text-xl leading-relaxed font-serif">
                                    {interpretation.analysis.summary}
                                </div>
                           </div>
                        </div>

                        <div className="md:col-span-8">
                           <div className="bg-white p-6 rounded border border-stone-200 h-full shadow-sm">
                                <div className="flex items-center gap-2 mb-6">
                                    <BookOpen className="w-5 h-5 text-stone-700" />
                                    <h3 className="text-lg font-bold text-stone-800 uppercase tracking-wide">断卦详解</h3>
                                </div>
                                {/* Increased spacing for better readability of detailed content */}
                                <div className="space-y-8">
                                    {interpretation.analysis.details.map((item, index) => (
                                        <div key={index} className="border-b border-stone-100 last:border-0 pb-6 last:pb-0">
                                            <h4 className="font-bold text-stone-900 text-sm mb-3 bg-stone-100 inline-block px-3 py-1 rounded">
                                                {item.title}
                                            </h4>
                                            {/* Whitespace pre-wrap preserves the structure returned by AI */}
                                            <p className="text-stone-700 leading-8 font-serif text-lg whitespace-pre-wrap">
                                                {item.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                           </div>
                        </div>
                    </section>

                    {/* Advice */}
                    <section className="bg-stone-800 text-stone-200 p-8 rounded shadow-md relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                            <span className="text-9xl font-serif">卦</span>
                         </div>
                         <div className="relative z-10">
                            <h3 className="text-amber-500 font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
                                <ScrollText className="w-5 h-5" /> 
                                趋吉避凶
                            </h3>
                            <p className="text-xl leading-relaxed font-serif border-l-2 border-amber-500 pl-6">
                                {interpretation.analysis.advice}
                            </p>
                         </div>
                    </section>
                </div>
             </div>
          </div>
        )}
      </main>

      <footer className="p-6 text-center text-stone-400 text-sm border-t border-stone-200 bg-stone-100">
        <p>六爻预测仅供参考，行事在人，心诚则灵</p>
      </footer>
    </div>
  );
}