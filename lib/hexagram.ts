import type { FortuneInput, Hexagram, HexagramLine } from "@/lib/types";

const numberToTrigram = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"] as const;
type TrigramName = (typeof numberToTrigram)[number];

const trigramLines: Record<TrigramName, HexagramLine[]> = {
  乾: [
    { yinYang: "yang", changing: false },
    { yinYang: "yang", changing: false },
    { yinYang: "yang", changing: false },
  ],
  兑: [
    { yinYang: "yang", changing: false },
    { yinYang: "yang", changing: false },
    { yinYang: "yin", changing: false },
  ],
  离: [
    { yinYang: "yang", changing: false },
    { yinYang: "yin", changing: false },
    { yinYang: "yang", changing: false },
  ],
  震: [
    { yinYang: "yang", changing: false },
    { yinYang: "yin", changing: false },
    { yinYang: "yin", changing: false },
  ],
  巽: [
    { yinYang: "yin", changing: false },
    { yinYang: "yang", changing: false },
    { yinYang: "yang", changing: false },
  ],
  坎: [
    { yinYang: "yin", changing: false },
    { yinYang: "yang", changing: false },
    { yinYang: "yin", changing: false },
  ],
  艮: [
    { yinYang: "yin", changing: false },
    { yinYang: "yin", changing: false },
    { yinYang: "yang", changing: false },
  ],
  坤: [
    { yinYang: "yin", changing: false },
    { yinYang: "yin", changing: false },
    { yinYang: "yin", changing: false },
  ],
};

const trigramTraits: Record<TrigramName, string> = {
  乾: "刚健主动",
  兑: "表达应对",
  离: "显明辨析",
  震: "起动惊发",
  巽: "渐入渗透",
  坎: "险中求实",
  艮: "止守收束",
  坤: "顺承蓄势",
};

const hexagramMatrix: Record<
  TrigramName,
  Record<TrigramName, { title: string; meaning: string; guidance: string }>
> = {
  乾: {
    乾: { title: "乾为天", meaning: "自强创始", guidance: "主动性强，但须防用力过猛。" },
    兑: { title: "天泽履", meaning: "循礼践行", guidance: "先守分寸与秩序，再谈推进。" },
    离: { title: "天火同人", meaning: "同道协作", guidance: "关键在合群同道，而非独断独行。" },
    震: { title: "天雷无妄", meaning: "守正无妄", guidance: "不宜妄动，先守其正。" },
    巽: { title: "天风姤", meaning: "猝然相遇", guidance: "突发机会出现时，先辨性质再决定深浅。" },
    坎: { title: "天水讼", meaning: "争辨冲突", guidance: "当前更要厘清边界与规则。" },
    艮: { title: "天山遁", meaning: "退避养机", guidance: "退一步是保机，不是示弱。" },
    坤: { title: "天地否", meaning: "上下不通", guidance: "先处理堵点，否则难以落地。" },
  },
  兑: {
    乾: { title: "泽天夬", meaning: "决断去弊", guidance: "宜果断，但要先想清后果。" },
    兑: { title: "兑为泽", meaning: "以悦相通", guidance: "利沟通，但不可流于迎合。" },
    离: { title: "泽火革", meaning: "变革更张", guidance: "该改则改，但要先立新秩序。" },
    震: { title: "泽雷随", meaning: "随势而动", guidance: "先看大势，再决定跟进方式。" },
    巽: { title: "泽风大过", meaning: "负重过限", guidance: "先减负纠偏，不宜继续加码。" },
    坎: { title: "泽水困", meaning: "受困承压", guidance: "重点在减压与保全，不宜硬冲。" },
    艮: { title: "泽山咸", meaning: "感应相引", guidance: "重在感受与回应，宜柔和推进。" },
    坤: { title: "泽地萃", meaning: "汇聚成势", guidance: "先聚人心与资源，再谈扩张。" },
  },
  离: {
    乾: { title: "火天大有", meaning: "丰盛有成", guidance: "资源不错，但需守成与节制。" },
    兑: { title: "火泽睽", meaning: "分歧相背", guidance: "先承认分歧，再求有限共识。" },
    离: { title: "离为火", meaning: "明辨依附", guidance: "看清依托，判断才能立得住。" },
    震: { title: "火雷噬嗑", meaning: "断疑去阻", guidance: "卡点宜明断，不宜拖延。" },
    巽: { title: "火风鼎", meaning: "鼎新成器", guidance: "适合整合资源，重塑结构。" },
    坎: { title: "火水未济", meaning: "未成待整", guidance: "未到收官，仍需补缺口。" },
    艮: { title: "火山旅", meaning: "在外寄行", guidance: "位置未稳时宜轻装守礼。" },
    坤: { title: "火地晋", meaning: "明出而进", guidance: "可进，但要稳住节奏。" },
  },
  震: {
    乾: { title: "雷天大壮", meaning: "强势推进", guidance: "力量足，但须防过刚。" },
    兑: { title: "雷泽归妹", meaning: "关系失衡", guidance: "牵涉关系时，先辨主次轻重。" },
    离: { title: "雷火丰", meaning: "势盛当明", guidance: "越热闹越要看清信息。" },
    震: { title: "震为雷", meaning: "惊动而醒", guidance: "变化快，重在不乱。" },
    巽: { title: "雷风恒", meaning: "持久有常", guidance: "启动后要靠持续，不可反复。" },
    坎: { title: "雷水解", meaning: "松解纾困", guidance: "先解结，再谈扩张。" },
    艮: { title: "雷山小过", meaning: "小事可行", guidance: "宜小步试探，不宜跨大步。" },
    坤: { title: "雷地豫", meaning: "顺势发动", guidance: "可动，但应建立在势已成。" },
  },
  巽: {
    乾: { title: "风天小畜", meaning: "小蓄待时", guidance: "先积小势，不急于全面放开。" },
    兑: { title: "风泽中孚", meaning: "诚信感通", guidance: "真正起作用的是信任与兑现。" },
    离: { title: "风火家人", meaning: "内外有序", guidance: "先整内部秩序，再谈外部展开。" },
    震: { title: "风雷益", meaning: "增益扶助", guidance: "适合做加法，但要加在对的位置。" },
    巽: { title: "巽为风", meaning: "入而能顺", guidance: "宜靠协商与渗透打开局面。" },
    坎: { title: "风水涣", meaning: "涣散疏导", guidance: "先疏堵，再聚焦。" },
    艮: { title: "风山渐", meaning: "渐进成形", guidance: "事情能成，但不能跳步。" },
    坤: { title: "风地观", meaning: "观势省察", guidance: "先看趋势与全局，再决定动作。" },
  },
  坎: {
    乾: { title: "水天需", meaning: "有待而行", guidance: "时机未足，宜等条件成熟。" },
    兑: { title: "水泽节", meaning: "设限节制", guidance: "当前更要立边界与规则。" },
    离: { title: "水火既济", meaning: "阶段已成", guidance: "已有成果时更要守成。" },
    震: { title: "水雷屯", meaning: "起始艰难", guidance: "开局阻力大，宜先扎根。" },
    巽: { title: "水风井", meaning: "汲取根本", guidance: "回到基础供给与长期资源。" },
    坎: { title: "坎为水", meaning: "重险求实", guidance: "先看风险，不宜乐观冒进。" },
    艮: { title: "水山蹇", meaning: "阻滞难行", guidance: "先排障，再选路径。" },
    坤: { title: "水地比", meaning: "亲比联结", guidance: "重点在靠拢可靠支点。" },
  },
  艮: {
    乾: { title: "山天大畜", meaning: "蓄力待发", guidance: "先蓄势，再发力更稳。" },
    兑: { title: "山泽损", meaning: "减损成事", guidance: "主动舍一部分，反而利整体。" },
    离: { title: "山火贲", meaning: "文饰有度", guidance: "可修表达，但勿重形式轻实质。" },
    震: { title: "山雷颐", meaning: "养正蓄能", guidance: "先调习惯与基础，不急求结果。" },
    巽: { title: "山风蛊", meaning: "整弊修旧", guidance: "旧结构有积弊，先整顿。" },
    坎: { title: "山水蒙", meaning: "启蒙求教", guidance: "认知未开，先求明白问题本身。" },
    艮: { title: "艮为山", meaning: "止而能守", guidance: "当前宜止守边界，先稳住。" },
    坤: { title: "山地剥", meaning: "削落退守", guidance: "外层支撑减弱，先止损保根本。" },
  },
  坤: {
    乾: { title: "地天泰", meaning: "上下通达", guidance: "有利打通关系与资源流动。" },
    兑: { title: "地泽临", meaning: "临近观察", guidance: "先靠近了解，再决定投入。" },
    离: { title: "地火明夷", meaning: "晦明自守", guidance: "局势不明时宜护住核心。" },
    震: { title: "地雷复", meaning: "回返修正", guidance: "适合回头校正方向。" },
    巽: { title: "地风升", meaning: "循序上升", guidance: "适合渐进推进，不宜猛冲。" },
    坎: { title: "地水师", meaning: "整队用众", guidance: "重点在组织资源与统一节奏。" },
    艮: { title: "地山谦", meaning: "谦抑蓄力", guidance: "收敛姿态更利积累空间。" },
    坤: { title: "坤为地", meaning: "顺承包容", guidance: "先承接现实条件，再稳步推进。" },
  },
};

function getShanghaiNowString() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date()).replace(/\//g, "-");
}

function buildChangedLines(lines: HexagramLine[], movingIndex: number) {
  return lines.map<HexagramLine>((line, index) =>
    index === movingIndex
      ? {
          yinYang: line.yinYang === "yang" ? "yin" : "yang",
          changing: false,
        }
      : { ...line, changing: false },
  );
}

function randomCoinValue() {
  return crypto.getRandomValues(new Uint32Array(1))[0] % 2 === 0 ? 2 : 3;
}

function simulateCoinTossLine(): { line: HexagramLine; total: number } {
  const total = randomCoinValue() + randomCoinValue() + randomCoinValue();

  if (total === 6) {
    return { line: { yinYang: "yin", changing: true }, total };
  }
  if (total === 7) {
    return { line: { yinYang: "yang", changing: false }, total };
  }
  if (total === 8) {
    return { line: { yinYang: "yin", changing: false }, total };
  }

  return { line: { yinYang: "yang", changing: true }, total };
}

export function buildHexagram(_input: FortuneInput, _seedHint: string): Hexagram {
  const generatedAt = getShanghaiNowString();
  const tosses = Array.from({ length: 6 }, () => simulateCoinTossLine());
  const lines = tosses.map((item) => item.line);
  const changedLines = lines.map<HexagramLine>((line, index) =>
    line.changing
      ? {
          yinYang: line.yinYang === "yang" ? "yin" : "yang",
          changing: false,
        }
      : { ...line, changing: false },
  );
  const lower = getTrigramFromLines(lines.slice(0, 3));
  const upper = getTrigramFromLines(lines.slice(3, 6));
  const changedLower = getTrigramFromLines(changedLines.slice(0, 3));
  const changedUpper = getTrigramFromLines(changedLines.slice(3, 6));
  const currentHexagram = hexagramMatrix[upper][lower];
  const changedHexagram = hexagramMatrix[changedUpper][changedLower];
  const movingLines = tosses
    .map((item, index) => (item.line.changing ? `第${index + 1}爻(${item.total})` : null))
    .filter(Boolean)
    .join("、");

  return {
    name: `${currentHexagram.title}（${upper}上${lower}下）`,
    changedName: `${changedHexagram.title}（${changedUpper}上${changedLower}下）`,
    upperTrigram: upper,
    lowerTrigram: lower,
    changedUpperTrigram: changedUpper,
    changedLowerTrigram: changedLower,
    lines,
    changedLines,
    interpretation: `此卦采用在线模拟摇铜钱方式生成，于 ${generatedAt} 自动完成六次三铜钱取数。当前本卦为${currentHexagram.title}，主“${currentHexagram.meaning}”，重在${currentHexagram.guidance}。外卦${upper}象${trigramTraits[upper]}，内卦${lower}象${trigramTraits[lower]}。${movingLines ? `动爻为${movingLines}，` : "本次无动爻，"}故变卦为${changedHexagram.title}，提示当前问题的后续节奏会从“${currentHexagram.meaning}”转向“${changedHexagram.meaning}”。`,
  };
}

function getTrigramFromLines(lines: HexagramLine[]) {
  const key = lines.map((line) => line.yinYang).join("-");
  const mapping: Record<string, TrigramName> = {
    "yang-yang-yang": "乾",
    "yang-yang-yin": "兑",
    "yang-yin-yang": "离",
    "yang-yin-yin": "震",
    "yin-yang-yang": "巽",
    "yin-yang-yin": "坎",
    "yin-yin-yang": "艮",
    "yin-yin-yin": "坤",
  };

  return mapping[key];
}
