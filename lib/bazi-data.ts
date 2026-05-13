import { Lunar, Solar } from "lunar-typescript";

import type {
  BaziProfile,
  DaYunItem,
  FiveElementStats,
  FortuneInput,
  Pillar,
} from "@/lib/types";

const hiddenStemMap: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

const elementMap: Record<string, keyof FiveElementStats> = {
  甲: "wood",
  乙: "wood",
  寅: "wood",
  卯: "wood",
  丙: "fire",
  丁: "fire",
  巳: "fire",
  午: "fire",
  戊: "earth",
  己: "earth",
  辰: "earth",
  戌: "earth",
  丑: "earth",
  未: "earth",
  庚: "metal",
  辛: "metal",
  申: "metal",
  酉: "metal",
  壬: "water",
  癸: "water",
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

function createPillar(
  value: string,
  wuxing: string,
  naYin: string,
  stemTenGod: string,
  branchTenGods: string[],
  diShi: string,
): Pillar {
  const [stem, branch] = Array.from(value);
  return {
    stem,
    branch,
    value,
    wuxing,
    naYin,
    stemTenGod,
    branchTenGods,
    hiddenStems: hiddenStemMap[branch] ?? [],
    diShi,
  };
}

function addWeight(stats: FiveElementStats, token: string, weight: number) {
  const key = elementMap[token];
  if (key) {
    stats[key] += weight;
  }
}

function buildFiveElementStats(pillars: Pillar[]): FiveElementStats {
  const stats: FiveElementStats = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  for (const pillar of pillars) {
    addWeight(stats, pillar.stem, 8);
    addWeight(stats, pillar.branch, 6);
    pillar.hiddenStems.forEach((stem, index) => {
      addWeight(stats, stem, index === 0 ? 4 : index === 1 ? 2 : 1);
    });
  }

  return stats;
}

function summarizeFiveElements(stats: FiveElementStats): string {
  const ordered = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  const strongest = ordered[0];
  const weakest = ordered[ordered.length - 1];

  return `五行重心偏向${elementLabel[strongest[0] as keyof FiveElementStats]}，${elementLabel[weakest[0] as keyof FiveElementStats]}相对偏弱。此统计以天干、地支与藏干权重估算，用于页面可视化和问卦引导，不替代专业命理定格。`;
}

function formatSolarText(solar: Solar) {
  return solar.toYmdHms();
}

function formatLunarText(lunar: Lunar) {
  return `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`;
}

function toLunar(input: FortuneInput) {
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = input.birthTime.split(":").map(Number);

  if (input.calendarType === "solar") {
    return Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  }

  const lunarMonth = input.isLeapMonth ? month * -1 : month;
  return Lunar.fromYmdHms(year, lunarMonth, day, hour, minute, 0);
}

function getCurrentAge(solarBirth: Solar) {
  const now = new Date();
  let age = now.getFullYear() - solarBirth.getYear();
  const birthThisYear = new Date(
    now.getFullYear(),
    solarBirth.getMonth() - 1,
    solarBirth.getDay(),
  );

  if (now < birthThisYear) {
    age -= 1;
  }

  return age;
}

export function buildBaziProfile(input: FortuneInput): BaziProfile {
  const lunar = toLunar(input);
  const solar = lunar.getSolar();
  const eightChar = lunar.getEightChar();

  const year = createPillar(
    eightChar.getYear(),
    eightChar.getYearWuXing(),
    eightChar.getYearNaYin(),
    eightChar.getYearShiShenGan(),
    eightChar.getYearShiShenZhi(),
    eightChar.getYearDiShi(),
  );
  const month = createPillar(
    eightChar.getMonth(),
    eightChar.getMonthWuXing(),
    eightChar.getMonthNaYin(),
    eightChar.getMonthShiShenGan(),
    eightChar.getMonthShiShenZhi(),
    eightChar.getMonthDiShi(),
  );
  const day = createPillar(
    eightChar.getDay(),
    eightChar.getDayWuXing(),
    eightChar.getDayNaYin(),
    eightChar.getDayShiShenGan(),
    eightChar.getDayShiShenZhi(),
    eightChar.getDayDiShi(),
  );
  const hour = createPillar(
    eightChar.getTime(),
    eightChar.getTimeWuXing(),
    eightChar.getTimeNaYin(),
    eightChar.getTimeShiShenGan(),
    eightChar.getTimeShiShenZhi(),
    eightChar.getTimeDiShi(),
  );

  const allPillars = [year, month, day, hour];
  const fiveElements = buildFiveElementStats(allPillars);
  const yun = eightChar.getYun(input.gender === "male" ? 1 : 0, 0);
  const daYun = yun
    .getDaYun()
    .slice(1, 9)
    .map<DaYunItem>((item, index) => ({
      index: index + 1,
      label: item.getGanZhi(),
      startAge: item.getStartAge(),
      endAge: item.getEndAge(),
      startYear: item.getStartYear(),
      endYear: item.getEndYear(),
    }));

  return {
    subject: {
      name: input.name,
      gender: input.gender === "male" ? "男" : "女",
      birthPlace: input.birthPlace,
      calendarType: input.calendarType,
      solarText: formatSolarText(solar),
      lunarText: formatLunarText(lunar),
      question: input.question,
    },
    pillars: { year, month, day, hour },
    dayMaster: eightChar.getDayGan(),
    zodiac: lunar.getYearShengXiao(),
    constellation: solar.getXingZuo(),
    mingGong: eightChar.getMingGong(),
    shenGong: eightChar.getShenGong(),
    taiYuan: eightChar.getTaiYuan(),
    xunKong: eightChar.getDayXunKong(),
    currentAge: getCurrentAge(solar),
    luckStart: yun.getStartSolar().toYmd(),
    daYun,
    fiveElements,
    fiveElementSummary: summarizeFiveElements(fiveElements),
  };
}
