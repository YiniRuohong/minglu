import type {
  BaziProfile,
  BoardMetric,
  DivinationBoard,
  Hexagram,
  PalaceCell,
  PhaseId,
} from "@/lib/types";

const phaseTitleMap: Record<PhaseId, string> = {
  intake: "命盘准备中",
  calendar: "历法校定",
  chart: "四柱定盘",
  tengod: "十神分层",
  balance: "扶抑取向",
  dayun: "大运排比",
  hexagram: "在线摇卦",
  palace: "古法摘要",
  connection: "原局与大运",
  report_draft: "报告收束",
  report: "总报告归档",
};

const phasePulseMap: Record<PhaseId, number> = {
  intake: 18,
  calendar: 30,
  chart: 48,
  tengod: 62,
  balance: 74,
  dayun: 82,
  hexagram: 82,
  palace: 88,
  connection: 90,
  report_draft: 94,
  report: 98,
};

const elementMap: Record<string, BoardMetric["tone"]> = {
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
};

function getToneByStem(stem: string): BoardMetric["tone"] {
  return elementMap[stem] ?? "neutral";
}

function getDayMasterStrength(profile: BaziProfile) {
  const ordered = Object.entries(profile.fiveElements).sort((a, b) => b[1] - a[1]);
  const strongest = ordered[0]?.[0];
  const weakest = ordered[ordered.length - 1]?.[0];
  const dayTone = getToneByStem(profile.dayMaster);

  if (strongest === dayTone) return "日主得势";
  if (weakest === dayTone) return "日主失势";
  return "日主待辨";
}

function buildPalaces(profile: BaziProfile): PalaceCell[] {
  const pillars = [
    { name: "年柱", pillar: profile.pillars.year, ageBand: "祖上", highlight: false },
    { name: "月柱", pillar: profile.pillars.month, ageBand: "提纲", highlight: true },
    { name: "日柱", pillar: profile.pillars.day, ageBand: "命主", highlight: true },
    { name: "时柱", pillar: profile.pillars.hour, ageBand: "归宿", highlight: false },
  ];

  return pillars.map(({ name, pillar, ageBand, highlight }) => ({
    name,
    branch: pillar.branch,
    ageBand,
    stars: [pillar.value, pillar.stemTenGod || pillar.wuxing, ...pillar.hiddenStems.slice(0, 2)],
    score: 75,
    marker: highlight ? "纲" : "参",
    highlight,
  }));
}

function buildConnections(activePalaces: string[], phase: PhaseId) {
  const active = new Set(activePalaces);
  const connections: DivinationBoard["connections"] = [];

  if (phase === "chart" || phase === "tengod" || phase === "balance" || phase === "dayun" || active.has("月柱") || active.has("日柱")) {
    connections.push({
      from: "月柱",
      to: "日柱",
      label: "主轴",
      emphasis: "primary",
    });
  }

  if (phase === "calendar" || active.has("年柱")) {
    connections.push({
      from: "年柱",
      to: "月柱",
      label: "承上",
      emphasis: "secondary",
    });
  }

  if (phase === "connection" || phase === "report" || phase === "report_draft" || active.has("时柱")) {
    connections.push({
      from: "日柱",
      to: "时柱",
      label: "趋时",
      emphasis: "secondary",
    });
  }

  return connections;
}

function getDefaultHighlights(profile: BaziProfile, hexagram: Hexagram) {
  return [
    `月令：${profile.pillars.month.value}`,
    `日主：${profile.dayMaster}`,
    `判断轴：${getDayMasterStrength(profile)}`,
    `起运：${profile.luckStart}`,
    `变卦：${hexagram.changedName}`,
  ];
}

function buildMetrics(profile: BaziProfile, phase: PhaseId, hexagram: Hexagram): BoardMetric[] {
  const topLuck = profile.daYun[0]?.label ?? "待定";

  return [
    {
      label: "当前相位",
      value: phaseTitleMap[phase],
      tone: "neutral",
    },
    {
      label: "日主",
      value: profile.dayMaster,
      tone: getToneByStem(profile.dayMaster),
    },
    {
      label: "月令",
      value: profile.pillars.month.branch,
      tone: "neutral",
    },
    {
      label: "首步大运",
      value: topLuck,
      tone: "neutral",
    },
    {
      label: "问时卦",
      value: hexagram.name.replace(/（.*$/, ""),
      tone: "neutral",
    },
  ];
}

export function buildDivinationBoard(
  profile: BaziProfile,
  hexagram: Hexagram,
  phase: PhaseId,
): DivinationBoard {
  const activePalaces = ["月柱", "日柱"];

  return {
    phase,
    title: phaseTitleMap[phase],
    subtitle: `${profile.subject.name} · ${profile.dayMaster}日主 · ${profile.pillars.month.value}月令`,
    pulse: phasePulseMap[phase],
    centerText: [
      `四柱 ${profile.pillars.year.value} / ${profile.pillars.month.value} / ${profile.pillars.day.value} / ${profile.pillars.hour.value}`,
      `命宫 ${profile.mingGong} / 身宫 ${profile.shenGong}`,
      `本卦 ${hexagram.name}`,
    ],
    highlights: getDefaultHighlights(profile, hexagram),
    activePalaces,
    connections: buildConnections(activePalaces, phase),
    palaces: buildPalaces(profile),
    metrics: buildMetrics(profile, phase, hexagram),
    hexagramLines: hexagram.lines,
    insightDraft: "",
  };
}

export function buildStreamingBoard(
  baseBoard: DivinationBoard,
  draft: string,
  profile: BaziProfile,
): DivinationBoard {
  const compact = draft.replace(/\s+/g, " ").trim();
  const nextHighlights = compact
    .split(/[。！？\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  const active = new Set<string>();
  if (compact.includes("月令") || compact.includes(profile.pillars.month.value)) active.add("月柱");
  if (compact.includes("日主") || compact.includes(profile.dayMaster)) active.add("日柱");
  if (compact.includes("父母") || compact.includes("祖上") || compact.includes("早年")) active.add("年柱");
  if (compact.includes("晚景") || compact.includes("子女") || compact.includes("归宿") || compact.includes("时柱")) active.add("时柱");
  if (active.size === 0) {
    active.add("月柱");
    active.add("日柱");
  }

  const activePalaces = [...active];

  return {
    ...baseBoard,
    highlights: nextHighlights.length > 0 ? nextHighlights : baseBoard.highlights,
    activePalaces,
    connections: buildConnections(activePalaces, baseBoard.phase),
    palaces: baseBoard.palaces.map((palace) => ({
      ...palace,
      highlight: active.has(palace.name),
      marker: active.has(palace.name) ? "焦" : palace.marker,
    })),
    insightDraft: compact,
  };
}
