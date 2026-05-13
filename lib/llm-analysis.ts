import type { BaziProfile, FiveElementStats, FortuneAnalysis, Hexagram, RoleCard } from "@/lib/types";

type Config = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  headers?: Record<string, string>;
};

const stemElementMap: Record<string, keyof FiveElementStats> = {
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

const branchElementMap: Record<string, keyof FiveElementStats> = {
  寅: "wood",
  卯: "wood",
  巳: "fire",
  午: "fire",
  辰: "earth",
  戌: "earth",
  丑: "earth",
  未: "earth",
  申: "metal",
  酉: "metal",
  子: "water",
  亥: "water",
};

const elementLabel: Record<keyof FiveElementStats, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

const generateMap: Record<keyof FiveElementStats, keyof FiveElementStats> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const controlMap: Record<keyof FiveElementStats, keyof FiveElementStats> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

function extractJson(text: string) {
  const codeBlock = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = codeBlock ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate) as FortuneAnalysis;
}

function getDayElement(profile: BaziProfile) {
  return stemElementMap[profile.dayMaster];
}

function getMonthElement(profile: BaziProfile) {
  return branchElementMap[profile.pillars.month.branch];
}

function elementGenerates(source: keyof FiveElementStats, target: keyof FiveElementStats) {
  return generateMap[source] === target;
}

function elementControls(source: keyof FiveElementStats, target: keyof FiveElementStats) {
  return controlMap[source] === target;
}

function isSupporting(dayElement: keyof FiveElementStats, other: keyof FiveElementStats) {
  return other === dayElement || elementGenerates(other, dayElement);
}

function isDrainingOrRestraining(dayElement: keyof FiveElementStats, other: keyof FiveElementStats) {
  return (
    elementGenerates(dayElement, other) ||
    elementControls(dayElement, other) ||
    elementControls(other, dayElement)
  );
}

function getRootCount(profile: BaziProfile) {
  return Object.values(profile.pillars).filter((pillar) => pillar.hiddenStems.includes(profile.dayMaster)).length;
}

function getVisibleTenGods(profile: BaziProfile) {
  return [
    profile.pillars.year.stemTenGod,
    profile.pillars.month.stemTenGod,
    profile.pillars.hour.stemTenGod,
    ...profile.pillars.year.branchTenGods,
    ...profile.pillars.month.branchTenGods,
    ...profile.pillars.day.branchTenGods,
    ...profile.pillars.hour.branchTenGods,
  ].filter(Boolean);
}

function getTopTenGod(tenGods: string[]) {
  const counts = new Map<string, number>();
  for (const god of tenGods) {
    counts.set(god, (counts.get(god) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "未定";
}

function judgeStrength(profile: BaziProfile) {
  const dayElement = getDayElement(profile);
  const monthElement = getMonthElement(profile);
  const rootCount = getRootCount(profile);

  const supportive = Object.entries(profile.fiveElements).reduce((sum, [key, value]) => {
    return isSupporting(dayElement, key as keyof FiveElementStats) ? sum + value : sum;
  }, 0);
  const draining = Object.entries(profile.fiveElements).reduce((sum, [key, value]) => {
    return isDrainingOrRestraining(dayElement, key as keyof FiveElementStats) ? sum + value : sum;
  }, 0);

  let score = supportive - draining + rootCount * 4;
  if (monthElement === dayElement) {
    score += 8;
  } else if (elementGenerates(monthElement, dayElement)) {
    score += 5;
  } else if (elementControls(monthElement, dayElement)) {
    score -= 5;
  } else if (elementGenerates(dayElement, monthElement)) {
    score -= 3;
  }

  if (score >= 10) return "偏强" as const;
  if (score <= -6) return "偏弱" as const;
  return "中和偏一方" as const;
}

function getUsefulDirection(profile: BaziProfile) {
  const dayElement = getDayElement(profile);
  const strength = judgeStrength(profile);
  const supportElements = [
    elementLabel[dayElement],
    elementLabel[
      (Object.keys(generateMap).find(
        (key) => generateMap[key as keyof FiveElementStats] === dayElement,
      ) as keyof FiveElementStats) ?? dayElement
    ],
  ];
  const drainingElements = [
    elementLabel[generateMap[dayElement]],
    elementLabel[controlMap[dayElement]],
  ];

  if (strength === "偏强") {
    return {
      principle: "日主偏强，先取泄、耗、克，不宜再叠加比印。",
      favorable: drainingElements.join("、"),
      unfavorable: supportElements.join("、"),
    };
  }

  if (strength === "偏弱") {
    return {
      principle: "日主偏弱，先扶身，取比劫、印绶，不宜再受财官食伤过度牵扯。",
      favorable: supportElements.join("、"),
      unfavorable: drainingElements.join("、"),
    };
  }

  return {
    principle: "日主不至于一边倒，宜顺月令和原局流通，不宜机械偏补单一五行。",
    favorable: "以流通顺畅者为先",
    unfavorable: "以再造偏枯者为忌",
  };
}

function buildFallback(profile: BaziProfile, hexagram: Hexagram): FortuneAnalysis {
  const topLuck = profile.daYun[0]?.label ?? "待定";
  const monthElement = elementLabel[getMonthElement(profile)];
  const strength = judgeStrength(profile);
  const rootCount = getRootCount(profile);
  const topTenGod = getTopTenGod(getVisibleTenGods(profile));
  const useful = getUsefulDirection(profile);

  return {
    summary: `${profile.subject.name}之命，以${profile.dayMaster}日元为主，生于${profile.pillars.month.value}月，先看月令，再察通根与透干。此局日主${strength}，${rootCount > 0 ? `地支有${rootCount}处通根` : "地支通根不显"}。当前问题另以${hexagram.name}作在线摇卦辅助，主看当下节奏，不改四柱本体。`,
    sections: [
      {
        title: "月令与日主",
        content: `古法以日元为主、月令为提纲。此局日主为${profile.dayMaster}，生于${profile.pillars.month.value}月，月令五行属${monthElement}，判断为${strength}。${rootCount > 0 ? `地支通根 ${rootCount} 处，可作得地之证。` : "地支根气不显，需更重视月令与透干。"}`
      },
      {
        title: "十神与原局结构",
        content: `四柱既定后，再看透干与藏干十神。此局可见十神以${topTenGod}较为突出，月柱为${profile.pillars.month.value}，日柱为${profile.pillars.day.value}。分析时应先看原局结构是否成势，再谈现实应象。`
      },
      {
        title: "扶抑与喜忌",
        content: `${useful.principle} 当前可先收束为：喜 ${useful.favorable}，忌 ${useful.unfavorable}。这一步只能作为古法阅读入口，不宜把五行数量直接当作吉凶结论。`
      },
      {
        title: "大运与已发节点",
        content: `原局定底色，大运定时机。当前首步参考大运为${topLuck}，建议优先回看该步大运前后，是否出现升学、搬迁、职业转换、家庭结构变化或情感关系转折，用来校正盘面。`
      },
      {
        title: "摇卦卦象",
        content: `${hexagram.name}，变卦${hexagram.changedName}。${hexagram.interpretation}`
      },
    ],
    keyMoments: [
      `先回看 ${topLuck} 大运起始前后，是否发生居住地、身份或关系结构的明显转折。`,
      "若月令所主之事长期压过个人主张，往往会在求学、入职、婚配这类节点表现得最明显。",
      "若现实经历与“得令得地”判断长期相反，应优先复核出生时辰，而不是继续叠加新解释。",
      "若近两三年反复做去留选择，往往对应大运与问时卦都在提示节奏切换。",
    ],
    suggestions: [
      "先用已经发生过的大运阶段做校验，再谈未来流年，不要跳过验盘。",
      "判断时以月令、通根、透干先后为序，不要直接把五行数量当吉凶结论。",
      "在线摇卦只辅助当前问题节奏，不替代本命四柱结构。",
    ],
    caution: "命理内容只可作传统术数研究与娱乐参考，不应替代医疗、法律、投资或现实人生决策。",
    phaseExplanations: [
      {
        phase: "chart",
        title: "四柱定盘",
        evidence: [
          `四柱 ${profile.pillars.year.value} / ${profile.pillars.month.value} / ${profile.pillars.day.value} / ${profile.pillars.hour.value}`,
          `日主 ${profile.dayMaster}`,
        ],
        reasoning: "四柱先定，日主既立，后续十神、生克、旺衰才有依据。",
        conclusion: "整轮判断以四柱原局为本，不以问题改盘。",
      },
      {
        phase: "tengod",
        title: "月令与十神次序",
        evidence: [`月柱 ${profile.pillars.month.value}`, `月干十神 ${profile.pillars.month.stemTenGod}`],
        reasoning: "子平法先看月令，再察透干。月令主时气，十神主人事关系。",
        conclusion: "先定月令强弱与十神主次，再谈现实应象。",
      },
      {
        phase: "balance",
        title: "扶抑取向",
        evidence: [`日主判断 ${strength}`, rootCount > 0 ? `通根 ${rootCount} 处` : "通根不显"],
        reasoning: "古法讲旺衰扶抑，核心是得令、得地、得助，不是把五行数值直接转成吉凶。",
        conclusion: `此局先按“${strength}”处理，再收束喜忌方向。`,
      },
      {
        phase: "dayun",
        title: "原局与大运分层",
        evidence: [`起运 ${profile.luckStart}`, `首步大运 ${topLuck}`],
        reasoning: "原局是本，大运是时。同一命盘在不同时段，会触发不同主题。",
        conclusion: "先用大运阶段做验盘，再谈未来趋向。",
      },
      {
        phase: "hexagram",
        title: "在线摇卦辅助",
        evidence: [`本卦 ${hexagram.name}`, `变卦 ${hexagram.changedName}`],
        reasoning: "在线摇卦只补充当前问题的节奏和切换点，不改写四柱原局。",
        conclusion: "因此卦象只负责当下问题的进退节奏，不单独替代命盘判断。",
      },
      {
        phase: "report_draft",
        title: "报告收束",
        evidence: ["已汇总四柱、月令、十神、扶抑、大运与问时卦", "已转写为可验证节点"],
        reasoning: "最终报告不是散讲吉凶，而是把验证节点、结构判断和行动方向组织成可回看的结论。",
        conclusion: "所以报告以验盘和可验证事件为重，而不是空泛断语。",
      },
    ],
    fullReport: `# ${profile.subject.name}四柱八字报告

## 一、命盘原局
- 四柱：${profile.pillars.year.value} / ${profile.pillars.month.value} / ${profile.pillars.day.value} / ${profile.pillars.hour.value}
- 日主：${profile.dayMaster}
- 月令：${profile.pillars.month.branch}
- 命宫：${profile.mingGong}
- 身宫：${profile.shenGong}
- 太元：${profile.taiYuan}

## 二、判断次序
以日元为主，以月令为提纲，次看通根、透干、十神、扶抑与大运，不以当前问题改动命盘。

## 三、月令与旺衰
日主判断：${strength}
月令五行：${monthElement}
${rootCount > 0 ? `地支通根 ${rootCount} 处，可作日主得地之证。` : "地支通根不显，需更加重视月令与透干。"}

## 四、十神与扶抑
十神主轴：${topTenGod}
${useful.principle}
喜：${useful.favorable}
忌：${useful.unfavorable}

## 五、大运观察
起运时间：${profile.luckStart}
首步参考大运：${topLuck}
建议先回看已走过的大运阶段是否与原局应象吻合，再决定后续流年细断是否成立。

## 六、在线摇卦辅助
本卦：${hexagram.name}
变卦：${hexagram.changedName}
${hexagram.interpretation}

## 七、可验证方向
1. 回看大运切换前后是否有升学、搬迁、职业去留、家庭结构变化。
2. 回看月令所主之事是否长期压过个人主观选择。
3. 若与盘面长期不符，先复核出生时辰，再继续细断。

## 八、提醒
命理内容只可作传统术数研究与娱乐参考，不应替代现实决策。`,
  };
}

function buildPromptAnchors(profile: BaziProfile, hexagram: Hexagram) {
  const fallback = buildFallback(profile, hexagram);
  return {
    localSummary: fallback.summary,
    localSections: fallback.sections,
    localKeyMoments: fallback.keyMoments,
    localSuggestions: fallback.suggestions,
    localPhaseExplanations: fallback.phaseExplanations,
  };
}

function buildPrompt(profile: BaziProfile, hexagram: Hexagram, roleCard?: RoleCard) {
  const anchors = buildPromptAnchors(profile, hexagram);
  return `
你是一名四柱八字研究助手。分析时请严格以子平法为主，优先遵循《渊海子平》《子平真诠》的判断顺序，并参考《滴天髓》《三命通会》《穷通宝典》《千里命稿》《神峰通考》作补充。不要混用六爻、紫微、星宗、心理测试式表达。

你必须固定遵守以下顺序：
1. 先定四柱与日主
2. 以月令为提纲，先看旺衰
3. 再看通根、透干、会合刑冲
4. 再看十神配置
5. 再看格局、扶抑、调候
6. 最后结合大运、流年判断应期

大运规则提醒：
- 阳年：甲丙戊庚壬
- 阴年：乙丁己辛癸
- 阳年男、阴年女顺排
- 阴年男、阳年女逆排
- 以月柱干支为基准排大运

输出要求：
1. 必须使用简体中文
2. 不要恐吓，不要绝对化预言
3. 若信息不足或古法上存在分歧，必须直接点明
4. 必须给出可验证的已发生关键事件，用于用户校验
5. 四柱为主体；在线模拟摇卦 ${hexagram.name} 只能作为当前问题的辅助节奏，不得改写四柱主判断
6. 允许充分展开分析，但每一段都必须回到命盘证据，不要空泛玄谈
7. 你会收到一份“本地结构锚点”，那是程序根据固定规则提炼出的基础判断。你应在不违背这些基础锚点的前提下，进一步深化推理、补充分歧点、扩展已发生事件校验，而不是机械复述锚点
8. 输出严格为 JSON，不要额外说明
7. JSON 结构如下：
{
  "summary": "120字以内总述",
  "sections": [
    {"title":"月令与日主", "content":"..."},
    {"title":"十神与原局结构", "content":"..."},
    {"title":"扶抑与喜忌", "content":"..."},
    {"title":"大运与已发节点", "content":"..."},
    {"title":"摇卦卦象", "content":"..."}
  ],
  "keyMoments": ["至少4条"],
  "suggestions": ["3条具体建议"],
  "caution": "一句免责声明",
  "phaseExplanations": [
    {
      "phase":"chart",
      "title":"...",
      "evidence":["..."],
      "reasoning":"...",
      "conclusion":"..."
    }
  ],
  "fullReport": "markdown 完整报告"
}
9. phaseExplanations 至少覆盖 chart、tengod、balance、dayun、hexagram、report_draft
10. fullReport 至少覆盖命盘原局、判断次序、月令旺衰、十神扶抑、大运观察、在线摇卦辅助、可验证方向、提醒
11. sections、keyMoments、fullReport 都要明显比“本地结构锚点”更细、更有解释力

角色卡：
${roleCard ? JSON.stringify(roleCard, null, 2) : "未提供额外角色卡。"}

排盘资料：
${JSON.stringify(profile, null, 2)}

在线摇卦资料：
${JSON.stringify(hexagram, null, 2)}

本地结构锚点：
${JSON.stringify(anchors, null, 2)}
`;
}

export async function createFortuneAnalysis(
  profile: BaziProfile,
  hexagram: Hexagram,
  config?: Config | null,
  roleCard?: RoleCard,
): Promise<{ analysis: FortuneAnalysis; source: "llm" | "fallback" }> {
  if (!config) {
    return {
      analysis: buildFallback(profile, hexagram),
      source: "fallback",
    };
  }

  try {
    const response = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...config.headers,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature ?? 0.7,
        messages: [
          {
            role: "system",
            content: roleCard?.systemPrompt
              ? `${roleCard.systemPrompt}\n\n你输出严格 JSON，不要输出额外说明。`
              : "你输出严格 JSON，不要输出额外说明。",
          },
          {
            role: "user",
            content: buildPrompt(profile, hexagram, roleCard),
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`上游模型请求失败: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("上游模型未返回内容。");
    }

    return {
      analysis: extractJson(content),
      source: "llm",
    };
  } catch {
    return {
      analysis: buildFallback(profile, hexagram),
      source: "fallback",
    };
  }
}
