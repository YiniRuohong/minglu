import { isAccessUnlocked } from "@/lib/access-control";
import { buildBaziProfile } from "@/lib/bazi-data";
import { buildDivinationBoard } from "@/lib/divination-board";
import { normalizeFortuneConfig, readFortuneConfig } from "@/lib/fortune-config";
import { buildHexagram } from "@/lib/hexagram";
import { createFortuneAnalysis } from "@/lib/llm-analysis";
import type {
  ConversationMessage,
  FortuneInput,
  FortuneRequest,
  FortuneResponse,
  FortuneStreamEvent,
  ReasoningNode,
} from "@/lib/types";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function toEventLine(event: FortuneStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}

function assistantMessage(
  id: string,
  content: string,
  phase: ConversationMessage["phase"],
): FortuneStreamEvent {
  return {
    type: "message",
    message: {
      id,
      role: "assistant",
      kind: "text",
      content,
      phase,
    },
  };
}

function buildNode(
  id: string,
  phase: ReasoningNode["phase"],
  title: string,
  detail: string,
): ReasoningNode {
  return {
    id,
    phase,
    title,
    detail,
    status: "completed",
    timestamp: nowIso(),
  };
}

function formatPhaseExplanation(explanation: {
  title: string;
  evidence: string[];
  reasoning: string;
  conclusion: string;
}) {
  return [
    `依据：${explanation.evidence.join("；")}`,
    `推导：${explanation.reasoning}`,
    `结论：${explanation.conclusion}`,
  ].join("\n");
}

export async function POST(request: Request) {
  const payload = (await request.json()) as FortuneRequest;
  const { runtimeConfig, ...input } = payload;

  if (!input.name || !input.birthDate || !input.birthTime || !input.birthPlace || !input.question) {
    return new Response(
      JSON.stringify({ error: "请完整填写姓名、生辰、出生地与问题。" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: FortuneStreamEvent) => {
        controller.enqueue(encoder.encode(toEventLine(event)));
      };

      try {
        send(
          assistantMessage(
            "intro-assistant",
            `已收到 ${input.name} 的问题。我会先校验资料，再完成四柱排盘、五行校准、宫位联动，最后整理完整报告。`,
            "intake",
          ),
        );

        send({
          type: "node",
          node: buildNode(
            "node-intake",
            "intake",
            "校验命主资料",
            `已确认 ${input.birthDate} ${input.birthTime}、${input.birthPlace} 与提问方向，开始建立基础命盘。`,
          ),
        });
        await wait(180);

        const profile = buildBaziProfile(input);
        const hexagram = buildHexagram(input, profile.dayMaster);

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "calendar"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-calendar",
            "calendar",
            "完成历法校定",
            `已把 ${input.calendarType === "solar" ? "阳历" : "农历"} 输入换算到统一时基，确认命主的阳历、农历与时辰归属。`,
          ),
        });
        await wait(180);

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "chart"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-chart",
            "chart",
            "完成四柱排盘",
            `已排出 ${profile.pillars.year.value}、${profile.pillars.month.value}、${profile.pillars.day.value}、${profile.pillars.hour.value}，并写入右侧术数总盘。`,
          ),
        });
        send(
          assistantMessage(
            "msg-chart",
            `四柱已成盘，当前日主为 ${profile.dayMaster}，命宫 ${profile.mingGong}，起运时间 ${profile.luckStart}。正在进入五行与十神的权重校准。`,
            "chart",
          ),
        );
        await wait(180);

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "tengod"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-tengod",
            "tengod",
            "拆解十神关系",
            `已根据 ${profile.dayMaster} 日主展开各柱十神与藏干关系，开始筛出对当前问题影响最大的关系轴。`,
          ),
        });
        await wait(220);

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "balance"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-balance",
            "balance",
            "五行与十神校准",
            profile.fiveElementSummary,
          ),
        });
        await wait(220);

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "dayun"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-dayun",
            "dayun",
            "扫描大运窗口",
            `已把起运 ${profile.luckStart} 与当前阶段对应的大运窗口并入判断，开始看近年外部机会与内部承压的交点。`,
          ),
        });
        await wait(220);

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "hexagram"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-hexagram",
            "hexagram",
            "定位卦象落点",
            `已将本次 ${hexagram.name} / ${hexagram.changedName} 卦势落到宫位关系上，开始确认问题真正被引动的焦点。`,
          ),
        });
        await wait(220);

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "palace"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-palace",
            "palace",
            "建立宫位联动",
            "已将四柱、五行倾向与问题意图映射为十二宫式推演面板，用于实时提示当前关注宫位。",
          ),
        });
        await wait(220);

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "connection"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-connection",
            "connection",
            "绘制宫位连图",
            "已把当前真正启用的宫位与宫位之间的主连线、次连线标识出来，开始收束出可执行判断路径。",
          ),
        });
        send(
          assistantMessage(
            "msg-palace",
            "右侧总盘已切换到宫位连图视图。接下来开始收束报告框架。",
            "connection",
          ),
        );

        const unlocked = await isAccessUnlocked();
        const config = unlocked
          ? await readFortuneConfig()
          : runtimeConfig
            ? normalizeFortuneConfig(runtimeConfig)
            : null;

        if (!config) {
          throw new Error("当前未解锁站点默认配置，请先输入访问密码，或保存你自己的 OpenAI 兼容模型配置。");
        }

        send({
          type: "board",
          board: buildDivinationBoard(profile, hexagram, "report_draft"),
        });
        send({
          type: "node",
          node: buildNode(
            "node-report-draft",
            "report_draft",
            "起草报告结构",
            "已将问题摘要、命盘概览、五行结构、大运窗口、宫位联动和行动建议组织成报告草稿结构。",
          ),
        });

        const { analysis, source } = await createFortuneAnalysis(
          profile,
          hexagram,
          config,
          input.roleCard,
        );
        const board = buildDivinationBoard(profile, hexagram, "report");

        const result: FortuneResponse = {
          profile,
          hexagram,
          analysis,
          board,
          report: {
            title: `${profile.subject.name} · 命理推演总报告`,
            markdown: analysis.fullReport,
            generatedAt: nowIso(),
          },
          meta: {
            model: config.model,
            source,
            configMode: unlocked ? "private" : "custom",
          },
        };

        for (const explanation of analysis.phaseExplanations) {
          send({
            type: "node",
            node: buildNode(
              `node-${explanation.phase}`,
              explanation.phase,
              explanation.title,
              formatPhaseExplanation(explanation),
            ),
          });
        }

        send({
          type: "board",
          board,
        });
        send({
          type: "node",
          node: buildNode(
            "node-report",
            "report",
            "总报告生成完成",
            `已基于 ${config.model} 汇总完整判断，并整理为可阅读的结构化报告。`,
          ),
        });
        send(
          assistantMessage(
            "msg-report",
            `推演完成。结论摘要：${analysis.summary}`,
            "report",
          ),
        );
        send({
          type: "result",
          result,
        });
        send({ type: "done" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "发生未知错误，请检查配置文件与输入内容。";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
