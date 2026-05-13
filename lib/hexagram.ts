import type { FortuneInput, Hexagram, HexagramLine } from "@/lib/types";

const trigramMap = [
  "坤",
  "震",
  "坎",
  "兑",
  "艮",
  "离",
  "巽",
  "乾",
];

const trigramTraits: Record<string, string> = {
  乾: "主动、开创、决断",
  坤: "承载、包容、蓄势",
  震: "发动、变化、突破",
  巽: "渗透、协商、渐进",
  坎: "险阻、洞察、暗流",
  离: "显化、名望、判断",
  艮: "止定、边界、积累",
  兑: "表达、社交、悦纳",
};

function hashText(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getTrigram(lines: HexagramLine[]) {
  const bits = lines.reduce((acc, line, index) => {
    return acc | ((line.yinYang === "yang" ? 1 : 0) << index);
  }, 0);
  return trigramMap[bits];
}

function buildChangedLines(lines: HexagramLine[]) {
  return lines.map<HexagramLine>((line) =>
    line.changing
      ? {
          ...line,
          yinYang: line.yinYang === "yang" ? "yin" : "yang",
          changing: false,
        }
      : { ...line },
  );
}

export function buildHexagram(input: FortuneInput, seedHint: string): Hexagram {
  const seed = hashText(
    [
      input.name,
      input.birthDate,
      input.birthTime,
      input.birthPlace,
      input.question,
      seedHint,
    ].join("|"),
  );

  const lines: HexagramLine[] = Array.from({ length: 6 }, (_, index) => {
    const bit = (seed >> index) & 1;
    const moving = ((seed >> (index + 8)) & 1) === 1;
    return {
      yinYang: bit === 1 ? "yang" : "yin",
      changing: moving,
    };
  });

  const changedLines = buildChangedLines(lines);
  const lower = getTrigram(lines.slice(0, 3));
  const upper = getTrigram(lines.slice(3, 6));
  const changedLower = getTrigram(changedLines.slice(0, 3));
  const changedUpper = getTrigram(changedLines.slice(3, 6));

  return {
    name: `${upper}上${lower}下`,
    changedName: `${changedUpper}上${changedLower}下`,
    upperTrigram: upper,
    lowerTrigram: lower,
    changedUpperTrigram: changedUpper,
    changedLowerTrigram: changedLower,
    lines,
    changedLines,
    interpretation: `本卦以${upper}与${lower}相叠，重心偏向${trigramTraits[upper]}，落点则呈现${trigramTraits[lower]}。变卦转入${changedUpper}上${changedLower}下，提示当前问题适合先辨势、再行动，尤其要留意“${trigramTraits[upper]}”与“${trigramTraits[changedLower]}”之间的节奏切换。`,
  };
}
