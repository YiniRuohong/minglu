import { Lunar, Solar } from "lunar-typescript";
import { astro } from "iztro";

import type {
  FortuneInput,
  ZiweiPalace,
  ZiweiPattern,
  ZiweiProfile,
  ZiweiStar,
} from "@/lib/types";

const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const SHA_STARS = new Set(["擎羊", "陀罗", "火星", "铃星", "地空", "地劫", "天空", "旬空", "截空"]);
const LUCKY_STARS = new Set([
  "左辅",
  "右弼",
  "文昌",
  "文曲",
  "天魁",
  "天钺",
  "禄存",
  "天马",
  "龙池",
  "凤阁",
  "红鸾",
  "天喜",
]);

function toSolar(input: FortuneInput) {
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = input.birthTime.split(":").map(Number);

  if (input.calendarType === "solar") {
    return Solar.fromYmdHms(year, month, day, hour, minute, 0);
  }

  const lunarMonth = input.isLeapMonth ? month * -1 : month;
  return Lunar.fromYmdHms(year, lunarMonth, day, hour, minute, 0).getSolar();
}

function toLunarText(input: FortuneInput, solar: Solar) {
  const lunar = solar.getLunar();
  return `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`;
}

function getCurrentAge(solarBirth: Solar) {
  const now = new Date();
  let age = now.getFullYear() - solarBirth.getYear();
  const birthThisYear = new Date(now.getFullYear(), solarBirth.getMonth() - 1, solarBirth.getDay());
  if (now < birthThisYear) age -= 1;
  return age;
}

function getHourBranchIndex(time: string) {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const totalMinutes = hour * 60 + minute;
  if (totalMinutes >= 23 * 60 || totalMinutes < 60) return 0;
  return Math.floor((totalMinutes - 60) / 120) + 1;
}

function mapBrightness(value?: string): ZiweiStar["brightness"] {
  if (!value) return "normal";
  if (value === "庙" || value === "旺") return "bright";
  if (value === "陷" || value === "不") return "dim";
  return "normal";
}

function mapStarType(name: string, type?: string): ZiweiStar["type"] {
  if (SHA_STARS.has(name)) return "sha";
  if (LUCKY_STARS.has(name)) return "lucky";
  if (type === "major" || type === "主星") return "major";
  return "minor";
}

function buildPalaces(astrolabe: ReturnType<typeof astro.bySolar>, currentAge: number): ZiweiPalace[] {
  const palaces: ZiweiPalace[] = astrolabe.palaces.map((palace) => {
    const stars: ZiweiStar[] = [
      ...(palace.majorStars ?? []).map((star) => ({
        name: star.name as string,
        type: "major" as const,
        brightness: mapBrightness(star.brightness as string),
        siHua: (star.mutagen || undefined) as ZiweiStar["siHua"],
      })),
      ...(palace.minorStars ?? []).map((star) => ({
        name: star.name as string,
        type: mapStarType(star.name as string, star.type as string),
        brightness: mapBrightness(star.brightness as string),
        siHua: (star.mutagen || undefined) as ZiweiStar["siHua"],
      })),
      ...(palace.adjectiveStars ?? []).map((star) => ({
        name: star.name as string,
        type: mapStarType(star.name as string, star.type as string),
      })),
    ];

    const majorStars = stars.filter((star) => star.type === "major").map((star) => star.name);
    const daXianAge = palace.decadal?.range
      ? [palace.decadal.range[0], palace.decadal.range[1]] as [number, number]
      : undefined;

    return {
      name: palace.name as string,
      branch: palace.earthlyBranch as string,
      stem: palace.heavenlyStem as string,
      stars,
      majorStars,
      daXianAge,
      isMingGong: palace.name === "命宫",
      isShenGong: Boolean(palace.isBodyPalace),
      isCurrentDaXian: Boolean(
        daXianAge && currentAge >= daXianAge[0] && currentAge <= daXianAge[1],
      ),
    };
  });

  for (const palace of palaces) {
    if (palace.majorStars.length > 0) continue;
    const branchIndex = BRANCHES.indexOf(palace.branch);
    const oppositeBranch = BRANCHES[(branchIndex + 6) % 12];
    const oppositePalace = palaces.find((item) => item.branch === oppositeBranch);
    if (oppositePalace && oppositePalace.majorStars.length > 0) {
      palace.borrowedFromName = oppositePalace.name;
    }
  }

  return palaces;
}

function findPalace(palaces: ZiweiPalace[], name: string) {
  return palaces.find((palace) => palace.name === name);
}

function sanFangBranches(branch: string) {
  const index = BRANCHES.indexOf(branch);
  return [index, (index + 4) % 12, (index + 6) % 12, (index + 8) % 12].map((item) => BRANCHES[item]);
}

function starsInBranches(palaces: ZiweiPalace[], branches: string[]) {
  return new Set(
    palaces
      .filter((palace) => branches.includes(palace.branch))
      .flatMap((palace) => palace.stars.map((star) => star.name)),
  );
}

function describePalace(palace: ZiweiPalace | undefined) {
  if (!palace) return "未定位";
  const majors = palace.majorStars.length > 0 ? palace.majorStars.join("、") : "空宫";
  const borrowed = palace.borrowedFromName ? `，借对宫 ${palace.borrowedFromName}` : "";
  return `${majors}${borrowed}`;
}

function detectPatterns(palaces: ZiweiPalace[]): ZiweiPattern[] {
  const patterns: ZiweiPattern[] = [];
  const ming = findPalace(palaces, "命宫");
  if (!ming) return patterns;

  const sanFang = starsInBranches(palaces, sanFangBranches(ming.branch));
  const mingStars = new Set(ming.majorStars);
  const mingShaCount = ming.stars.filter((star) => star.type === "sha").length;

  if (mingStars.has("紫微") && sanFang.has("左辅") && sanFang.has("右弼")) {
    patterns.push({
      name: "君臣庆会",
      level: mingShaCount >= 2 ? "good" : "excellent",
      description: "命宫紫微得辅弼会照，主掌控力、资源整合力与贵人助力较强。",
      evidence: ["命宫见紫微", "三方四正会左辅右弼"],
      palaces: ["命宫", "财帛宫", "官禄宫", "迁移宫"],
    });
  }

  const ziwei = palaces.find((palace) => palace.majorStars.includes("紫微"));
  const tianfu = palaces.find((palace) => palace.majorStars.includes("天府"));
  if (ziwei && tianfu && ziwei.name === tianfu.name) {
    patterns.push({
      name: "紫府同宫",
      level: ziwei.isMingGong ? "excellent" : "good",
      description: "紫微与天府同宫，常见于资源掌控、秩序感和稳定运作能力较强的盘面。",
      evidence: [`紫微、天府同在 ${ziwei.name}`],
      palaces: [ziwei.name],
    });
  }

  if (sanFang.has("太阳") && sanFang.has("天梁") && sanFang.has("文昌") && sanFang.has("禄存")) {
    patterns.push({
      name: "阳梁昌禄",
      level: "excellent",
      description: "偏向清贵、专业表达、学业名望或制度型成长路径。",
      evidence: ["三方四正会太阳、天梁、文昌、禄存"],
      palaces: ["命宫", "官禄宫", "迁移宫"],
    });
  }

  if (ming.majorStars.length === 0) {
    patterns.push({
      name: "命宫借星",
      level: "neutral",
      description: "命宫为空时，更需要结合对宫和三方四正理解主轴，人生主题常通过外部关系显化。",
      evidence: [ming.borrowedFromName ? `命宫为空，借对宫 ${ming.borrowedFromName}` : "命宫为空"],
      palaces: ["命宫"],
    });
  }

  return patterns;
}

export function buildZiweiProfile(input: FortuneInput): ZiweiProfile {
  const solar = toSolar(input);
  const currentAge = getCurrentAge(solar);
  const astrolabe = astro.bySolar(
    `${solar.getYear()}-${solar.getMonth()}-${solar.getDay()}`,
    getHourBranchIndex(input.birthTime),
    input.gender === "male" ? "男" : "女",
    true,
    "zh-CN",
  );

  const palaces = buildPalaces(astrolabe, currentAge);
  const currentDaXianPalace = palaces.find((palace) => palace.isCurrentDaXian);
  const ziweiPalace = palaces.find((palace) => palace.majorStars.includes("紫微"));
  const keyPalaceNames = ["命宫", "财帛宫", "官禄宫", "迁移宫"];
  const patterns = detectPatterns(palaces);

  return {
    subject: {
      name: input.name,
      gender: input.gender === "male" ? "男" : "女",
      birthPlace: input.birthPlace,
      calendarType: input.calendarType,
      solarText: solar.toYmdHms(),
      lunarText: toLunarText(input, solar),
      question: input.question,
    },
    mingGong: astrolabe.soul as string,
    shenGong: astrolabe.body as string,
    mingGongBranch: astrolabe.earthlyBranchOfSoulPalace as string,
    shenGongBranch: astrolabe.earthlyBranchOfBodyPalace as string,
    wuxingJuName: astrolabe.fiveElementsClass as string,
    ziweiStarPalace: ziweiPalace?.name ?? "未定",
    currentAge,
    currentDaXian: currentDaXianPalace
      ? {
          palaceName: currentDaXianPalace.name,
          ageRange: currentDaXianPalace.daXianAge
            ? `${currentDaXianPalace.daXianAge[0]}-${currentDaXianPalace.daXianAge[1]}`
            : "未定",
        }
      : null,
    keyPalaces: keyPalaceNames.map((name) => {
      const palace = findPalace(palaces, name);
      return {
        name,
        summary: describePalace(palace),
        stars: palace?.majorStars ?? [],
      };
    }),
    patterns,
    palaces,
  };
}
