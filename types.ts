export enum LineType {
  OldYin = 6,    // --- x --- (Changing into Yang)
  YoungYang = 7, // --------- (Static Yang)
  YoungYin = 8,  // ---   --- (Static Yin)
  OldYang = 9    // --- o --- (Changing into Yin)
}

export interface HexagramLine {
  position: number; // 1 (bottom) to 6 (top)
  value: LineType;
  coins: [boolean, boolean, boolean]; // true = Head (3), false = Tail (2)
}

export interface DivinationState {
  step: 'INPUT' | 'TOSSING' | 'COMPLETED' | 'INTERPRETING' | 'RESULT';
  question: string;
  lines: HexagramLine[];
  currentLineIndex: number; // 0 to 5
}

// Data for a single line in the visual chart
export interface LiuYaoLineInfo {
  position: number;
  liuQin: string;   // Six Kinship (e.g., 妻财)
  ganZhi: string;   // Stem Branch + Element (e.g., 戊子 水)
  shiYing: string;  // Shi / Ying / Empty
  liuShou: string;  // Six Beast (e.g., 青龙)
  type: string;     // "少阳", "老阴" etc. for display
}

export interface AnalysisDetail {
  title: string;
  content: string;
}

export interface AIInterpretation {
  hexagramHeader: {
    name: string;        // e.g. 水火既济
    pinyin: string;
    palace: string;      // e.g. 坎宫 (属水)
    category: string;    // e.g. 六合卦 / 归魂卦
  };
  dateInfo: {
    lunar: string;       // e.g. 甲辰年 酉月 戌日
    kongWang: string;    // Void branches e.g. (子丑空)
  };
  mainStack: LiuYaoLineInfo[];      // 6 lines of Main Hexagram
  transformStack: LiuYaoLineInfo[] | null; // 6 lines of Transformed Hexagram (or null if no change)
  analysis: {
    summary: string;
    details: AnalysisDetail[]; // Structured details
    advice: string;
  };
}