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
            `已收到 ${input.name} 的问题。我会先校验资料，再按四柱、月令、十神、大运的次序排盘，同时自动在线模拟摇卦，最后整理成报告。`,
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
        const hexagram = buildHexagram(input, nowIso());

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
            `四柱已成盘，当前日主为 ${profile.dayMaster}，月柱 ${profile.pillars.month.value}，起运时间 ${profile.luckStart}。正在转入月令与十神次序判断。`,
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
            `已根据 ${profile.dayMaster} 日主展开各柱十神与藏干关系，先看月令，再察透干与通根。`,
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
            "扶抑取向判断",
            "当前不再用问题驱动的权重校准，而是按旺衰扶抑、得令得地得助的顺序收束喜忌方向。",
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
            `已将起运 ${profile.luckStart} 与首步大运并入判断，开始用大运验证原局。`,
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
            "自动在线摇卦",
            hexagram.interpretation,
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
            "收束古法摘要",
            "已将四柱本体与在线摇卦摘要同步写入右侧面板，便于边看排盘边看当前问题的节奏变化。",
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
            "原局与大运合参",
            "当前判断以原局为本、大运为时，先验证命盘主线，再决定对现实问题的落点。",
          ),
        });
        send(
          assistantMessage(
            "msg-palace",
            "右侧已同步四柱摘要与在线摇卦结果。接下来开始整理报告。",
            "connection",
          ),
        );

        const unlocked = await isAccessUnlocked().catch(() => false);
        let config = null;
        try {
          config = unlocked
            ? await readFortuneConfig()
            : runtimeConfig
              ? normalizeFortuneConfig(runtimeConfig)
              : null;
        } catch {
          config = null;
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
            "已将四柱原局、月令旺衰、十神层次、大运验证与在线摇卦辅助组织成报告草稿结构。",
          ),
        });

        const { analysis, source } = await createFortuneAnalysis(profile, hexagram, config, input.roleCard);
        const board = buildDivinationBoard(profile, hexagram, "report");

        const result: FortuneResponse = {
          profile,
          hexagram,
          analysis,
          board,
          report: {
            title: `${profile.subject.name} · 四柱与问时卦报告`,
            markdown: analysis.fullReport,
            generatedAt: nowIso(),
          },
          meta: {
            model: config?.model ?? "classic-local",
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
            "node-analysis-source",
            "report",
            source === "llm" ? "模型深度解读已接入" : "回退到本地兜底",
            source === "llm"
              ? `本次已调用 ${config?.model ?? "已配置模型"} 参与解读，四柱结构由本地排盘固定，展开性推理与文案由模型补充。`
              : "本次未成功调用模型，当前展示的是本地规则兜底分析。若希望模型更多参与，请检查访问解锁状态或自定义模型配置。",
          ),
        });
        send({
          type: "node",
          node: buildNode(
            "node-report",
            "report",
            "总报告生成完成",
            `已按四柱主线与问时卦辅助收束成结构化报告${config ? `，并调用 ${config.model} 完成文案推断。` : "，当前使用本地兜底分析。"} `,
          ),
        });
        send(
          assistantMessage(
            "msg-report",
            `推演完成。${source === "llm" ? "本次已接入大模型深度解读。" : "本次未接入模型，使用本地兜底分析。"} 结论摘要：${analysis.summary}`,
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
