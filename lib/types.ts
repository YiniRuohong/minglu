export type CalendarType = "solar" | "lunar";
export type GenderType = "male" | "female";
export type DivinationSystem = "bazi" | "ziwei" | "hybrid";

export type RoleCard = {
  id: string;
  name: string;
  systemPrompt: string;
  guidance: string;
};

export type FortuneInput = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  birthPlace: string;
  question: string;
  divinationSystem: DivinationSystem;
  roleCard?: RoleCard;
};

export type ClientModelConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
};

export type FortuneRequest = FortuneInput & {
  runtimeConfig?: ClientModelConfig;
};

export type Pillar = {
  stem: string;
  branch: string;
  value: string;
  wuxing: string;
  naYin: string;
  stemTenGod: string;
  branchTenGods: string[];
  hiddenStems: string[];
  diShi: string;
};

export type DaYunItem = {
  index: number;
  label: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
};

export type FiveElementStats = {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
};

export type BaziProfile = {
  subject: {
    name: string;
    gender: string;
    birthPlace: string;
    calendarType: CalendarType;
    solarText: string;
    lunarText: string;
    question: string;
  };
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  dayMaster: string;
  zodiac: string;
  constellation: string;
  mingGong: string;
  shenGong: string;
  taiYuan: string;
  xunKong: string;
  currentAge: number;
  luckStart: string;
  daYun: DaYunItem[];
  fiveElements: FiveElementStats;
  fiveElementSummary: string;
};

export type ZiweiStar = {
  name: string;
  type: "major" | "minor" | "lucky" | "sha";
  brightness?: "bright" | "normal" | "dim";
  siHua?: "禄" | "权" | "科" | "忌";
};

export type ZiweiPalace = {
  name: string;
  branch: string;
  stem: string;
  stars: ZiweiStar[];
  majorStars: string[];
  borrowedFromName?: string;
  daXianAge?: [number, number];
  isMingGong?: boolean;
  isShenGong?: boolean;
  isCurrentDaXian?: boolean;
};

export type ZiweiPattern = {
  name: string;
  level: "excellent" | "good" | "neutral" | "caution";
  description: string;
  evidence: string[];
  palaces: string[];
};

export type ZiweiProfile = {
  subject: {
    name: string;
    gender: string;
    birthPlace: string;
    calendarType: CalendarType;
    solarText: string;
    lunarText: string;
    question: string;
  };
  mingGong: string;
  shenGong: string;
  mingGongBranch: string;
  shenGongBranch: string;
  wuxingJuName: string;
  ziweiStarPalace: string;
  currentAge: number;
  currentDaXian: {
    palaceName: string;
    ageRange: string;
  } | null;
  keyPalaces: Array<{
    name: string;
    summary: string;
    stars: string[];
  }>;
  patterns: ZiweiPattern[];
  palaces: ZiweiPalace[];
};

export type HexagramLine = {
  yinYang: "yang" | "yin";
  changing: boolean;
};

export type Hexagram = {
  name: string;
  changedName: string;
  upperTrigram: string;
  lowerTrigram: string;
  changedUpperTrigram: string;
  changedLowerTrigram: string;
  lines: HexagramLine[];
  changedLines: HexagramLine[];
  interpretation: string;
};

export type AnalysisSection = {
  title: string;
  content: string;
};

export type PhaseId =
  | "intake"
  | "calendar"
  | "chart"
  | "tengod"
  | "balance"
  | "dayun"
  | "hexagram"
  | "palace"
  | "connection"
  | "report_draft"
  | "report";

export type FortuneAnalysis = {
  summary: string;
  sections: AnalysisSection[];
  keyMoments: string[];
  suggestions: string[];
  caution: string;
  fullReport: string;
  phaseExplanations: Array<{
    phase: PhaseId;
    title: string;
    evidence: string[];
    reasoning: string;
    conclusion: string;
  }>;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  kind: "text" | "report";
  content: string;
  phase?: PhaseId;
};

export type ReasoningNode = {
  id: string;
  phase: PhaseId;
  title: string;
  detail: string;
  status: "running" | "completed";
  timestamp: string;
};

export type PalaceCell = {
  name: string;
  branch: string;
  ageBand: string;
  stars: string[];
  score: number;
  marker: string;
  highlight: boolean;
  slot?: string;
  pillarDetail?: {
    stem: string;
    stemTenGod: string;
    branch: string;
    hiddenStems: string[];
    branchTenGods: string[];
    wuxing: string;
    naYin: string;
    diShi: string;
  };
};

export type BoardMetric = {
  label: string;
  value: string;
  tone: "wood" | "fire" | "earth" | "metal" | "water" | "neutral";
};

export type PalaceConnection = {
  from: string;
  to: string;
  label: string;
  emphasis: "primary" | "secondary";
};

export type DivinationBoard = {
  layout: "cross4" | "ring12";
  phase: PhaseId;
  title: string;
  subtitle: string;
  pulse: number;
  centerText: string[];
  highlights: string[];
  activePalaces: string[];
  connections: PalaceConnection[];
  palaces: PalaceCell[];
  metrics: BoardMetric[];
  hexagramLines: HexagramLine[];
  insightDraft?: string;
};

export type ReportDocument = {
  title: string;
  markdown: string;
  generatedAt: string;
};

export type FortuneResponse = {
  profile: BaziProfile;
  ziweiProfile?: ZiweiProfile;
  hexagram: Hexagram;
  analysis: FortuneAnalysis;
  board: DivinationBoard;
  report: ReportDocument;
  meta: {
    model: string;
    source: "llm" | "fallback";
    configMode: "private" | "custom";
    system: DivinationSystem;
    sourceDetail?: string;
  };
};

export type FortuneStreamEvent =
  | { type: "message"; message: ConversationMessage }
  | { type: "message_delta"; message: ConversationMessage }
  | { type: "node"; node: ReasoningNode }
  | { type: "board"; board: DivinationBoard }
  | { type: "result"; result: FortuneResponse }
  | { type: "error"; error: string }
  | { type: "done" };
