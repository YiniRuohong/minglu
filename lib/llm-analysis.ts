import type { BaziProfile, FortuneAnalysis, Hexagram, RoleCard } from "@/lib/types";

type Config = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  headers?: Record<string, string>;
};

function extractJson(text: string) {
  const codeBlock = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = codeBlock ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate) as FortuneAnalysis;
}

function fallbackAnalysis(profile: BaziProfile, hexagram: Hexagram): FortuneAnalysis {
  const topLuck = profile.daYun[0]?.label ?? "待定";
  return {
    summary: `${profile.subject.name}的命盘以${profile.dayMaster}日主为核心，${profile.fiveElementSummary} 问题“${profile.subject.question}”对应的卦象为${hexagram.name}，更适合在看清资源与节奏之后推进，不宜急躁硬冲。`,
    sections: [
      {
        title: "日主与格局",
        content: `日主为${profile.dayMaster}，页面中的四柱、十神与纳音已经排出。这里的本地兜底分析不会替代经典命理断格，但能提供一个稳定的阅读入口：先看月柱与日柱的关系，再看五行偏盛偏弱处是否与现实议题对应。`,
      },
      {
        title: "十神与关系",
        content: "十神关系需要结合月令、透干与藏干一并看。页面里已经把每柱的十神和藏干展开，适合用户先做结构阅读，再交给模型补充更细的人事含义。",
      },
      {
        title: "五行与调候",
        content: `${profile.fiveElementSummary} 如果你此刻问的是事业与选择，宜优先补足短板五行所象征的能力面；如果问的是关系与情绪，则更要关注命局中过旺元素带来的执拗、焦灼或迟滞。`,
      },
      {
        title: "大运与近况",
        content: `当前页面已排出起运时间与前八步大运。通常先回看${topLuck}这一步是否出现身份、城市、关系或职业方向的变化，再决定后续是否深入追问流年。`,
      },
      {
        title: "卦象提示",
        content: hexagram.interpretation,
      },
    ],
    keyMoments: [
      `首步大运参考为${topLuck}，可以回看该年龄段是否出现身份、城市或关系结构的变化。`,
      "若近两年正在经历反复决策，通常意味着原问题并非缺答案，而是缺更稳定的执行边界。",
      "适合拿过去一次明显转折期做校验，再决定是否追加更细的流年问答。",
    ],
    suggestions: [
      "把问题缩成一个最现实的抉择场景，再重新起问一次，分析会更准。",
      "优先观察自己最弱五行对应的习惯短板，而不是只看吉凶结论。",
      "把命盘当作结构化自省工具，而不是替代现实判断的指令。",
    ],
    caution: "命理与卦象内容仅供传统文化体验与娱乐参考，不构成医疗、法律、投资或人生决策依据。",
    phaseExplanations: [
      {
        phase: "chart",
        title: "四柱排盘依据",
        evidence: [
          `四柱为 ${profile.pillars.year.value} / ${profile.pillars.month.value} / ${profile.pillars.day.value} / ${profile.pillars.hour.value}`,
          `日主为 ${profile.dayMaster}，命宫 ${profile.mingGong}`,
        ],
        reasoning: "先确认四柱和日主，才能决定后续所有十神、五行和宫位判断的起点。如果这个起点不稳，后续解释都会漂移。",
        conclusion: "因此先把四柱、日主、命宫固定为整轮推演的基础坐标。",
      },
      {
        phase: "tengod",
        title: "十神关系依据",
        evidence: [
          `月柱十神侧重 ${profile.pillars.month.stemTenGod}`,
          `日柱藏干 ${profile.pillars.day.hiddenStems.join(" / ")}`,
        ],
        reasoning: "十神用于把抽象五行转换为人事关系、压力来源和资源通道。这里优先看月柱和日柱，是因为它们最容易对应现实里的环境与自我。",
        conclusion: "所以先用十神关系筛出真正影响问题判断的关系轴，而不是直接下结论。",
      },
      {
        phase: "balance",
        title: "五行校准依据",
        evidence: [profile.fiveElementSummary],
        reasoning: "五行分布决定问题判断的偏向。主导五行说明惯性，偏弱五行说明短板，二者共同决定该补什么、该避开什么。",
        conclusion: "结论不是简单看吉凶，而是先判断命盘内部是否失衡，以及现实行动应补哪里。",
      },
      {
        phase: "dayun",
        title: "大运窗口依据",
        evidence: [
          `起运时间 ${profile.luckStart}`,
          `当前年龄 ${profile.currentAge}，首步参考大运 ${topLuck}`,
        ],
        reasoning: "原局给的是底色，大运给的是时间窗口。同样的命盘在不同阶段会触发不同主题，所以必须先把当前窗口定位清楚。",
        conclusion: "因此本轮判断会优先看当前阶段的机会和压力，而不是只谈终身趋势。",
      },
      {
        phase: "hexagram",
        title: "卦象落点依据",
        evidence: [`本卦 ${hexagram.name}`, `变卦 ${hexagram.changedName}`, hexagram.interpretation],
        reasoning: "卦象不替代八字，而是补充当前问题的节奏和触发方向。它更适合回答“现在该怎么动”和“先动哪里”。",
        conclusion: "所以卦象被拿来决定这次问题优先落在哪几个宫位，而不是单独断结果。",
      },
      {
        phase: "connection",
        title: "宫位连图依据",
        evidence: [
          "已选出当前被问题真正引动的宫位",
          "已标出主连线与次连线，区分核心路径与辅助约束",
        ],
        reasoning: "单看一个宫位只能看到局部，连图才能看出因果路径，比如资源如何进入、关系如何牵制、行动从哪里落地。",
        conclusion: "最终结论来自宫位之间的联动路径，而不是来自某个孤立宫位。",
      },
      {
        phase: "report_draft",
        title: "报告收束依据",
        evidence: [
          "已汇总四柱、十神、五行、大运、卦象、宫位连图",
          "已把判断改写成可执行建议与可验证节点",
        ],
        reasoning: "报告不是简单复述盘面，而是把前面每一步的依据压缩成能读、能用、能回看验证的结论结构。",
        conclusion: "因此最后的结论是由前面多个步骤叠加得出，而不是模型突然给出的单句判断。",
      },
    ],
    fullReport: `# ${profile.subject.name}命理推演总报告

## 一、问题摘要
你当前的提问是：${profile.subject.question}

## 二、命盘概览
- 日主：${profile.dayMaster}
- 四柱：${profile.pillars.year.value} / ${profile.pillars.month.value} / ${profile.pillars.day.value} / ${profile.pillars.hour.value}
- 命宫：${profile.mingGong}
- 身宫：${profile.shenGong}
- 太元：${profile.taiYuan}

## 三、五行结构
${profile.fiveElementSummary}

## 四、大运节律
当前页面排出的首步参考大运为 ${topLuck}。建议优先回看相应年龄段是否出现身份、居住地、职业方向或关系结构上的转折，这能帮助判断后续问题的着力点。

## 五、卦象补充
本次卦象为 ${hexagram.name}，变卦为 ${hexagram.changedName}。${hexagram.interpretation}

## 六、行动建议
1. 先把现实问题进一步收束到一个最具体的选择场景。
2. 优先补足最弱五行象征的能力短板与环境短板。
3. 把命盘用于校准节奏与偏性，而不是替代现实中的证据与决策。

## 七、免责声明
命理与卦象内容仅供传统文化体验与娱乐参考，不构成现实决策依据。`,
  };
}

function buildPrompt(profile: BaziProfile, hexagram: Hexagram, roleCard?: RoleCard) {
  return `
你是一位懂传统命理表达方式、但语气克制现代的中文分析助手。你正在为一个网页生成结构化算命结果。分析框架参考 bazi-skill：四柱八字、十神、五行平衡、大运走势、历史事件校准、综合建议；同时结合卦象给出当前问题的节奏判断。

角色卡：
${roleCard ? JSON.stringify(roleCard, null, 2) : "未提供额外角色卡，按默认命理分析助手执行。"}

要求：
1. 必须使用简体中文。
2. 不要夸张恐吓，不要绝对化预言。
3. 输出必须是 JSON，不要带 markdown 代码围栏。
4. JSON 格式：
{
  "summary": "120字以内总述",
  "sections": [
    {"title":"日主与格局", "content":"..."},
    {"title":"十神与关系", "content":"..."},
    {"title":"五行与调候", "content":"..."},
    {"title":"大运与近况", "content":"..."},
    {"title":"卦象提示", "content":"..."}
  ],
  "keyMoments": ["...","...","..."],
  "suggestions": ["...","...","..."],
  "caution": "一句免责声明",
  "phaseExplanations": [
    {
      "phase":"chart",
      "title":"这个阶段在看什么",
      "evidence":["证据1","证据2"],
      "reasoning":"用 2-4 句说明这一阶段是如何从盘面信号推进判断的，不要写成神秘口号。",
      "conclusion":"这一阶段得到的阶段性结论"
    }
  ],
  "fullReport": "使用 markdown 输出一篇完整报告，包含标题和二级标题，至少覆盖问题摘要、命盘概览、五行结构、大运节律、宫位观察、卦象补充、行动建议、免责声明"
}
5. sections 固定返回 5 段。
6. keyMoments 返回 3 条已发生或可验证的历史节点预测，方便用户校准。
7. suggestions 返回 3 条具体建议。
8. phaseExplanations 至少返回 6 个阶段，优先覆盖 chart、tengod、balance、dayun、hexagram、connection、report_draft。
9. 每个 phaseExplanations 必须写清楚：用了哪些证据、如何推、为什么这么收束，而不是空泛表态。
10. 结合以下资料进行判断：
   - 调候优先于空泛吉凶
   - 先看日主、月令、五行流通，再看十神与大运
   - 卦象用于补充“当前问题”的节奏，而不是替代四柱本体

排盘资料：
${JSON.stringify(profile, null, 2)}

卦象资料：
${JSON.stringify(hexagram, null, 2)}
`;
}

export async function createFortuneAnalysis(
  profile: BaziProfile,
  hexagram: Hexagram,
  config: Config,
  roleCard?: RoleCard,
): Promise<{ analysis: FortuneAnalysis; source: "llm" | "fallback" }> {
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
        temperature: config.temperature ?? 0.8,
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
      analysis: fallbackAnalysis(profile, hexagram),
      source: "fallback",
    };
  }
}
