import type {
  BaziProfile,
  BoardMetric,
  DivinationBoard,
  Hexagram,
  PalaceCell,
  PalaceConnection,
  PhaseId,
} from "@/lib/types";

const palaceNames = [
  "命宫",
  "兄弟",
  "夫妻",
  "子女",
  "财帛",
  "疾厄",
  "迁移",
  "交友",
  "官禄",
  "田宅",
  "福德",
  "父母",
];

const palaceAges = [
  "3-12",
  "13-22",
  "23-32",
  "33-42",
  "43-52",
  "53-62",
  "63-72",
  "73-82",
  "83-92",
  "93-102",
  "103-112",
  "113-122",
];

const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const starPool = {
  wood: ["天机", "贪狼", "文昌", "左辅"],
  fire: ["太阳", "廉贞", "火星", "天喜"],
  earth: ["紫微", "天府", "天相", "禄存"],
  metal: ["武曲", "七杀", "文曲", "右弼"],
  water: ["太阴", "巨门", "天梁", "破军"],
};

const phaseMeta: Record<
  PhaseId,
  {
    title: string;
    pulse: number;
    focus: string[];
    connections: PalaceConnection[];
  }
> = {
  intake: {
    title: "命盘准备中",
    pulse: 24,
    focus: ["命宫", "父母"],
    connections: [{ from: "命宫", to: "父母", label: "基础资料", emphasis: "secondary" }],
  },
  calendar: {
    title: "历法校定",
    pulse: 34,
    focus: ["命宫", "田宅", "父母"],
    connections: [
      { from: "父母", to: "命宫", label: "出生基准", emphasis: "primary" },
      { from: "命宫", to: "田宅", label: "时空落点", emphasis: "secondary" },
    ],
  },
  chart: {
    title: "四柱与宫位映射",
    pulse: 48,
    focus: ["命宫", "福德", "田宅"],
    connections: [
      { from: "命宫", to: "福德", label: "日主入宫", emphasis: "primary" },
      { from: "命宫", to: "田宅", label: "原局根基", emphasis: "secondary" },
    ],
  },
  tengod: {
    title: "十神关系解构",
    pulse: 57,
    focus: ["兄弟", "夫妻", "父母"],
    connections: [
      { from: "夫妻", to: "兄弟", label: "人际映射", emphasis: "secondary" },
      { from: "父母", to: "兄弟", label: "源流关系", emphasis: "primary" },
    ],
  },
  balance: {
    title: "五行动态校准",
    pulse: 66,
    focus: ["财帛", "官禄", "疾厄"],
    connections: [
      { from: "财帛", to: "官禄", label: "资源流向", emphasis: "primary" },
      { from: "官禄", to: "疾厄", label: "负荷校验", emphasis: "secondary" },
    ],
  },
  dayun: {
    title: "大运窗口扫描",
    pulse: 73,
    focus: ["迁移", "官禄", "福德"],
    connections: [
      { from: "迁移", to: "官禄", label: "外部机会", emphasis: "primary" },
      { from: "福德", to: "迁移", label: "内驱变化", emphasis: "secondary" },
    ],
  },
  hexagram: {
    title: "卦象落点定位",
    pulse: 79,
    focus: ["福德", "迁移", "夫妻"],
    connections: [
      { from: "福德", to: "迁移", label: "卦势引动", emphasis: "primary" },
      { from: "迁移", to: "夫妻", label: "关系牵连", emphasis: "secondary" },
    ],
  },
  palace: {
    title: "宫位推演展开",
    pulse: 84,
    focus: ["夫妻", "迁移", "交友", "官禄"],
    connections: [
      { from: "交友", to: "官禄", label: "外援网络", emphasis: "secondary" },
      { from: "迁移", to: "官禄", label: "去向决策", emphasis: "primary" },
      { from: "夫妻", to: "迁移", label: "关系约束", emphasis: "secondary" },
    ],
  },
  connection: {
    title: "宫位联动成图",
    pulse: 89,
    focus: ["命宫", "官禄", "迁移", "福德"],
    connections: [
      { from: "命宫", to: "官禄", label: "主线", emphasis: "primary" },
      { from: "官禄", to: "迁移", label: "落地路径", emphasis: "primary" },
      { from: "福德", to: "命宫", label: "心理阈值", emphasis: "secondary" },
    ],
  },
  report_draft: {
    title: "报告框架收束",
    pulse: 93,
    focus: ["命宫", "官禄", "迁移", "财帛"],
    connections: [
      { from: "命宫", to: "财帛", label: "价值排序", emphasis: "secondary" },
      { from: "官禄", to: "迁移", label: "结论路径", emphasis: "primary" },
    ],
  },
  report: {
    title: "总报告归档",
    pulse: 96,
    focus: ["命宫", "官禄", "福德", "迁移"],
    connections: [
      { from: "命宫", to: "官禄", label: "核心判断", emphasis: "primary" },
      { from: "福德", to: "迁移", label: "节奏修正", emphasis: "secondary" },
      { from: "迁移", to: "官禄", label: "执行出口", emphasis: "primary" },
    ],
  },
};

function getElementRanking(profile: BaziProfile) {
  return Object.entries(profile.fiveElements)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key as keyof typeof starPool);
}

function getStemBranchBase(profile: BaziProfile) {
  const branch = profile.pillars.year.branch;
  const index = branches.indexOf(branch);
  return index >= 0 ? index : 0;
}

function buildPalaces(profile: BaziProfile, phase: PhaseId, question: string): PalaceCell[] {
  const ranking = getElementRanking(profile);
  const base = getStemBranchBase(profile);
  const activeNames = new Set(phaseMeta[phase].focus);

  if (question.includes("事业")) {
    activeNames.add("官禄");
    activeNames.add("迁移");
    activeNames.add("财帛");
  }
  if (question.includes("感情") || question.includes("婚")) {
    activeNames.add("夫妻");
    activeNames.add("福德");
  }
  if (question.includes("城市") || question.includes("去哪")) {
    activeNames.add("迁移");
    activeNames.add("官禄");
  }

  return palaceNames.map((name, index) => {
    const element = ranking[index % ranking.length];
    const stars = [
      starPool[element][index % starPool[element].length],
      starPool[ranking[(index + 1) % ranking.length]][(index + 2) % 4],
    ];
    const score = 58 + ((index * 7 + profile.currentAge) % 31);
    const marker = score > 78 ? "旺" : score > 66 ? "引" : score > 60 ? "平" : "守";

    return {
      name,
      branch: branches[(base + index) % 12],
      ageBand: palaceAges[index],
      stars,
      score,
      marker,
      highlight: activeNames.has(name),
    };
  });
}

function buildMetrics(profile: BaziProfile, hexagram: Hexagram, phase: PhaseId): BoardMetric[] {
  const dominant = Object.entries(profile.fiveElements).sort((a, b) => b[1] - a[1])[0]?.[0];
  const weakest = Object.entries(profile.fiveElements).sort((a, b) => a[1] - b[1])[0]?.[0];

  return [
    {
      label: "当前相位",
      value: phaseMeta[phase].title,
      tone: "neutral",
    },
    {
      label: "主导五行",
      value:
        dominant === "wood"
          ? "木"
          : dominant === "fire"
            ? "火"
            : dominant === "earth"
              ? "土"
              : dominant === "metal"
                ? "金"
                : "水",
      tone: (dominant as BoardMetric["tone"]) ?? "neutral",
    },
    {
      label: "待补五行",
      value:
        weakest === "wood"
          ? "木"
          : weakest === "fire"
            ? "火"
            : weakest === "earth"
              ? "土"
              : weakest === "metal"
                ? "金"
                : "水",
      tone: (weakest as BoardMetric["tone"]) ?? "neutral",
    },
    {
      label: "卦象方向",
      value: `${hexagram.upperTrigram}上${hexagram.lowerTrigram}下`,
      tone: "neutral",
    },
  ];
}

export function buildDivinationBoard(
  profile: BaziProfile,
  hexagram: Hexagram,
  phase: PhaseId,
): DivinationBoard {
  const palaces = buildPalaces(profile, phase, profile.subject.question);
  const meta = phaseMeta[phase];
  const highlights = palaces
    .filter((palace) => palace.highlight)
    .slice(0, 5)
    .map((palace) => `${palace.name}见${palace.stars.join(" / ")}，当前标记为${palace.marker}`);

  return {
    phase,
    title: meta.title,
    subtitle: `${profile.subject.name} · ${profile.dayMaster}日主 · ${hexagram.name}`,
    pulse: meta.pulse,
    centerText: [
      `${profile.subject.gender} · ${profile.subject.birthPlace}`,
      `阳历 ${profile.subject.solarText}`,
      `农历 ${profile.subject.lunarText}`,
      `命宫 ${profile.mingGong} / 身宫 ${profile.shenGong}`,
      `起运 ${profile.luckStart} · 当前 ${profile.currentAge} 岁`,
    ],
    highlights,
    activePalaces: meta.focus,
    connections: meta.connections,
    palaces,
    metrics: buildMetrics(profile, hexagram, phase),
    hexagramLines: hexagram.lines,
  };
}
