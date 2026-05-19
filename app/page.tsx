"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import type {
  BoardMetric,
  ClientModelConfig,
  ConversationMessage,
  DivinationBoard,
  DivinationSystem,
  FortuneInput,
  FortuneRequest,
  FortuneResponse,
  FortuneStreamEvent,
  HexagramLine,
  PalaceCell,
  ReasoningNode,
  RoleCard,
} from "@/lib/types";

const STORAGE_FORM_KEY = "minglu.form";
const STORAGE_ROLE_KEY = "minglu.role";
const STORAGE_REPORT_KEY = "minglu.latest-report";
const STORAGE_CUSTOM_CONFIG_KEY = "minglu.custom-config";

const defaultRoleCard: RoleCard = {
  id: "default-bazi-guide",
  name: "明命录古法排盘",
  systemPrompt:
    "你是一位遵循子平八字主线的中文命理助手，表达应克制、结构清晰、避免恐吓式断语。",
  guidance:
    "先按当前选择的命理体系建立主盘，再看关键结构与阶段节奏。在线摇卦只作为当前问题节奏辅助，不改写主判断。",
};

const defaultForm: FortuneInput = {
  name: "",
  gender: "male",
  birthDate: "",
  birthTime: "12:00",
  calendarType: "solar",
  isLeapMonth: false,
  birthPlace: "",
  question: "",
  divinationSystem: "hybrid",
  roleCard: defaultRoleCard,
};

const introMessage: ConversationMessage = {
  id: "system-intro",
  role: "system",
  kind: "text",
  content: "先在设置里填写命主资料，再直接提问。当前版本支持四柱八字、紫微斗数与综合模式，并会自动在线模拟摇卦。",
};

const defaultCustomConfig: ClientModelConfig = {
  baseUrl: "",
  apiKey: "",
  model: "",
  temperature: 0.8,
};

const boardPositions = [
  "top-center",
  "right-center",
  "bottom-center",
  "left-center",
];

const systemLabelMap: Record<DivinationSystem, string> = {
  bazi: "四柱八字",
  ziwei: "紫微斗数",
  hybrid: "紫微主盘综合",
};

const boardCoords: Record<string, { x: number; y: number }> = {
  年柱: { x: 50, y: 16 },
  月柱: { x: 84, y: 50 },
  日柱: { x: 50, y: 84 },
  时柱: { x: 16, y: 50 },
  中宫: { x: 50, y: 50 },
};

const ringSlotStyles: Record<string, React.CSSProperties> = {
  "ring-巳": { gridRow: "1", gridColumn: "1" },
  "ring-午": { gridRow: "1", gridColumn: "2" },
  "ring-未": { gridRow: "1", gridColumn: "3" },
  "ring-申": { gridRow: "1", gridColumn: "4" },
  "ring-辰": { gridRow: "2", gridColumn: "1" },
  "ring-酉": { gridRow: "2", gridColumn: "4" },
  "ring-卯": { gridRow: "3", gridColumn: "1" },
  "ring-戌": { gridRow: "3", gridColumn: "4" },
  "ring-寅": { gridRow: "4", gridColumn: "1" },
  "ring-丑": { gridRow: "4", gridColumn: "2" },
  "ring-子": { gridRow: "4", gridColumn: "3" },
  "ring-亥": { gridRow: "4", gridColumn: "4" },
};

const idlePalaces: PalaceCell[] = [
  { name: "年柱", branch: "待定", ageBand: "祖上", stars: ["未起盘", "待录入"], score: 0, marker: "待", highlight: false },
  { name: "月柱", branch: "待定", ageBand: "提纲", stars: ["未起盘", "待录入"], score: 0, marker: "待", highlight: false },
  { name: "日柱", branch: "待定", ageBand: "命主", stars: ["未起盘", "待录入"], score: 0, marker: "待", highlight: false },
  { name: "时柱", branch: "待定", ageBand: "归宿", stars: ["未起盘", "待录入"], score: 0, marker: "待", highlight: false },
];

function loadStoredForm() {
  try {
    if (typeof window === "undefined") {
      return defaultForm;
    }
    const raw = window.localStorage.getItem(STORAGE_FORM_KEY);
    return raw ? ({ ...defaultForm, ...JSON.parse(raw) } as FortuneInput) : defaultForm;
  } catch {
    return defaultForm;
  }
}

function loadStoredRole() {
  try {
    if (typeof window === "undefined") {
      return defaultRoleCard;
    }
    const raw = window.localStorage.getItem(STORAGE_ROLE_KEY);
    return raw ? ({ ...defaultRoleCard, ...JSON.parse(raw) } as RoleCard) : defaultRoleCard;
  } catch {
    return defaultRoleCard;
  }
}

function loadStoredCustomConfig() {
  try {
    if (typeof window === "undefined") {
      return defaultCustomConfig;
    }
    const raw = window.localStorage.getItem(STORAGE_CUSTOM_CONFIG_KEY);
    return raw ? ({ ...defaultCustomConfig, ...JSON.parse(raw) } as ClientModelConfig) : defaultCustomConfig;
  } catch {
    return defaultCustomConfig;
  }
}

function isCustomConfigReady(config: ClientModelConfig) {
  return Boolean(config.baseUrl.trim() && config.apiKey.trim() && config.model.trim());
}

function formatNodeTime(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function TypewriterText({ text, active }: { text: string; active: boolean }) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    if (!active) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 14);

    return () => window.clearInterval(timer);
  }, [text, active]);

  return <p>{active ? visible : text}</p>;
}

function NodeDetailText({ text, expanded }: { text: string; expanded: boolean }) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    if (!expanded) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 10);

    return () => window.clearInterval(timer);
  }, [text, expanded]);

  return <p>{expanded ? visible : text}</p>;
}

function HexLine({ line }: { line: HexagramLine }) {
  return (
    <div className={`hex-line ${line.yinYang === "yang" ? "solid" : "broken"}`}>
      {line.yinYang === "yang" ? (
        <span />
      ) : (
        <>
          <span />
          <span />
        </>
      )}
    </div>
  );
}

function PalaceCard({
  palace,
  position,
  activePhase,
  style,
}: {
  palace: PalaceCell;
  position: string;
  activePhase: string;
  style?: React.CSSProperties;
}) {
  return (
    <article
      className={`palace-card ${position} ${palace.highlight ? "active" : ""} phase-${activePhase}`}
      style={style}
    >
      <div className="palace-head">
        <span>{palace.ageBand}</span>
        <em>{palace.branch}</em>
      </div>
      <h4>{palace.name}</h4>
      {palace.pillarDetail ? (
        <div className="pillar-detail">
          <div className="pillar-main">
            <strong>{palace.pillarDetail.stem}</strong>
            <strong>{palace.pillarDetail.branch}</strong>
          </div>
          <div className="pillar-tags">
            {[palace.pillarDetail.stemTenGod, palace.pillarDetail.diShi, palace.pillarDetail.naYin]
              .filter(Boolean)
              .map((item) => (
                <span key={`${palace.name}-${item}`}>{item}</span>
              ))}
          </div>
          <p>
            藏干 {palace.pillarDetail.hiddenStems.join("、") || "无"} · 十神{" "}
            {palace.pillarDetail.branchTenGods.join("、") || "未定"}
          </p>
        </div>
      ) : (
        <div className="palace-stars">
          {palace.stars.map((star) => (
            <span key={`${palace.name}-${star}`}>{star}</span>
          ))}
        </div>
      )}
      <div className="palace-foot">
        <strong>{palace.marker}</strong>
        <span>{palace.score}</span>
      </div>
    </article>
  );
}

function PalaceConnections({ board }: { board: DivinationBoard }) {
  return (
    <svg className="connection-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      {board.connections.map((connection) => {
        const from = boardCoords[connection.from];
        const to = boardCoords[connection.to];
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        return (
          <g key={`${connection.from}-${connection.to}-${connection.label}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={`connection-line ${connection.emphasis}`}
            />
            <circle cx={from.x} cy={from.y} r="0.9" className="connection-dot" />
            <circle cx={to.x} cy={to.y} r="0.9" className="connection-dot" />
            <text x={midX} y={midY} className={`connection-label ${connection.emphasis}`}>
              {connection.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MetricCard({ metric }: { metric: BoardMetric }) {
  return (
    <article className={`metric-card ${metric.tone}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
    </article>
  );
}

function SettingsDrawer({
  open,
  onClose,
  form,
  setForm,
  roleCard,
  setRoleCard,
  unlocked,
  passwordConfigured,
  accessPassword,
  setAccessPassword,
  accessBusy,
  accessError,
  onUnlock,
  onLogout,
  customConfig,
  setCustomConfig,
  customConfigSaved,
  onSaveCustomConfig,
}: {
  open: boolean;
  onClose: () => void;
  form: FortuneInput;
  setForm: React.Dispatch<React.SetStateAction<FortuneInput>>;
  roleCard: RoleCard;
  setRoleCard: React.Dispatch<React.SetStateAction<RoleCard>>;
  unlocked: boolean;
  passwordConfigured: boolean;
  accessPassword: string;
  setAccessPassword: React.Dispatch<React.SetStateAction<string>>;
  accessBusy: boolean;
  accessError: string | null;
  onUnlock: () => Promise<void>;
  onLogout: () => Promise<void>;
  customConfig: ClientModelConfig;
  setCustomConfig: React.Dispatch<React.SetStateAction<ClientModelConfig>>;
  customConfigSaved: boolean;
  onSaveCustomConfig: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer-panel" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <span className="kicker">Settings</span>
            <h2>角色卡与命主资料</h2>
          </div>
          <button className="ghost-btn" onClick={onClose}>
            关闭
          </button>
        </div>

        <section className="drawer-section">
          <div className="section-title">
            <h3>访问控制与模型接入</h3>
            <p>输对访问密码才能直接调用站点私有配置，否则只能保存自己的 OpenAI 兼容模型配置后使用。</p>
          </div>

          <div className="access-panel">
            <div className={`access-status-card ${unlocked ? "unlocked" : "locked"}`}>
              <strong>{unlocked ? "已解锁私有推演通道" : "当前处于访客模式"}</strong>
              <p>
                {unlocked
                  ? "当前推演会直接调用服务端保存的默认模型配置，你的私有 key 不会暴露到浏览器。"
                  : passwordConfigured
                    ? "未输入访问密码时，默认私有 key 不可用。你仍可填写自己的兼容模型、Key 和接入点。"
                    : "还没有检测到访问密码配置，请先检查 config/access.config.json 或 ACCESS_PASSWORD。"}
              </p>
            </div>

            <div className="drawer-grid access-grid">
              <label className="wide">
                <span>访问密码</span>
                <input
                  type="password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  placeholder="输入后可直接使用站点私有配置"
                />
              </label>
            </div>

            <div className="inline-actions">
              <button className="ghost-btn" onClick={onUnlock} disabled={accessBusy || !passwordConfigured}>
                {accessBusy ? "校验中..." : "解锁私有配置"}
              </button>
              {unlocked ? (
                <button className="ghost-btn" onClick={onLogout} disabled={accessBusy}>
                  退出私有配置
                </button>
              ) : null}
              {accessError ? <span className="error-inline">{accessError}</span> : null}
            </div>
          </div>
        </section>

        <section className="drawer-section">
          <div className="section-title">
            <h3>访客自定义模型</h3>
            <p>这部分只保存在当前浏览器本地。未解锁时，推演会使用这里保存的 OpenAI 兼容配置。</p>
          </div>
          <div className="drawer-grid">
            <label className="wide">
              <span>接入点 Base URL</span>
              <input
                value={customConfig.baseUrl}
                onChange={(e) => setCustomConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="例如：https://api.openai.com/v1"
              />
            </label>
            <label>
              <span>模型名</span>
              <input
                value={customConfig.model}
                onChange={(e) => setCustomConfig((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="例如：gpt-4.1-mini"
              />
            </label>
            <label>
              <span>温度</span>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={customConfig.temperature ?? 0.8}
                onChange={(e) =>
                  setCustomConfig((prev) => ({
                    ...prev,
                    temperature: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0.8,
                  }))
                }
              />
            </label>
            <label className="wide">
              <span>API Key</span>
              <input
                type="password"
                value={customConfig.apiKey}
                onChange={(e) => setCustomConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="ghost-btn" onClick={onSaveCustomConfig}>
              保存访客配置
            </button>
            <span className="muted-inline">
              {customConfigSaved
                ? "已保存到当前浏览器。"
                : isCustomConfigReady(customConfig)
                  ? "填写完整后保存，未解锁时即可直接推演。"
                  : "至少需要模型名、Key 和接入点。"}
            </span>
          </div>
        </section>

        <section className="drawer-section">
          <div className="section-title">
            <h3>角色卡</h3>
            <p>这里控制整套推演的口吻、关注点和输出风格。</p>
          </div>
          <div className="drawer-grid">
            <label className="wide">
              <span>角色名称</span>
              <input
                value={roleCard.name}
                onChange={(e) => {
                  const next = { ...roleCard, name: e.target.value };
                  setRoleCard(next);
                  setForm((prev) => ({ ...prev, roleCard: next }));
                }}
                placeholder="例如：紫微命理顾问"
              />
            </label>
            <label className="wide">
              <span>系统设定</span>
              <textarea
                rows={5}
                value={roleCard.systemPrompt}
                onChange={(e) => {
                  const next = { ...roleCard, systemPrompt: e.target.value };
                  setRoleCard(next);
                  setForm((prev) => ({ ...prev, roleCard: next }));
                }}
              />
            </label>
            <label className="wide">
              <span>推演指导</span>
              <textarea
                rows={5}
                value={roleCard.guidance}
                onChange={(e) => {
                  const next = { ...roleCard, guidance: e.target.value };
                  setRoleCard(next);
                  setForm((prev) => ({ ...prev, roleCard: next }));
                }}
              />
            </label>
          </div>
        </section>

        <section className="drawer-section">
          <div className="section-title">
            <h3>命主资料</h3>
            <p>排盘参数统一放在这里，主聊天区不再显示表单。</p>
          </div>
          <div className="drawer-grid">
            <label>
              <span>命理体系</span>
              <select
                value={form.divinationSystem}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    divinationSystem: e.target.value as FortuneInput["divinationSystem"],
                  }))
                }
              >
                <option value="hybrid">紫微主盘综合</option>
                <option value="ziwei">紫微斗数</option>
                <option value="bazi">四柱八字</option>
              </select>
            </label>
            <label>
              <span>姓名</span>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </label>
            <label>
              <span>性别</span>
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gender: e.target.value as FortuneInput["gender"] }))
                }
              >
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </label>
            <label>
              <span>生日</span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
              />
            </label>
            <label>
              <span>时间</span>
              <input
                type="time"
                value={form.birthTime}
                onChange={(e) => setForm((prev) => ({ ...prev, birthTime: e.target.value }))}
              />
            </label>
            <label>
              <span>历法</span>
              <select
                value={form.calendarType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    calendarType: e.target.value as FortuneInput["calendarType"],
                  }))
                }
              >
                <option value="solar">阳历</option>
                <option value="lunar">农历</option>
              </select>
            </label>
            <label className="checkbox-line">
              <span>闰月</span>
              <input
                type="checkbox"
                checked={form.isLeapMonth}
                onChange={(e) => setForm((prev) => ({ ...prev, isLeapMonth: e.target.checked }))}
              />
            </label>
            <label className="wide">
              <span>出生地</span>
              <input
                value={form.birthPlace}
                onChange={(e) => setForm((prev) => ({ ...prev, birthPlace: e.target.value }))}
              />
            </label>
          </div>
        </section>
      </aside>
    </div>
  );
}

export default function HomePage() {
  const [form, setForm] = useState<FortuneInput>(defaultForm);
  const [roleCard, setRoleCard] = useState<RoleCard>(defaultRoleCard);
  const [customConfig, setCustomConfig] = useState<ClientModelConfig>(defaultCustomConfig);
  const [savedCustomConfigSnapshot, setSavedCustomConfigSnapshot] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(true);
  const [messages, setMessages] = useState<ConversationMessage[]>([introMessage]);
  const [nodes, setNodes] = useState<ReasoningNode[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);
  const [board, setBoard] = useState<DivinationBoard | null>(null);
  const [result, setResult] = useState<FortuneResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setForm(loadStoredForm());
      setRoleCard(loadStoredRole());
      const storedConfig = loadStoredCustomConfig();
      setCustomConfig(storedConfig);
      setSavedCustomConfigSnapshot(JSON.stringify(storedConfig));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/access", { cache: "no-store" });
        const status = (await response.json()) as { unlocked: boolean; passwordConfigured: boolean };
        setUnlocked(Boolean(status.unlocked));
        setPasswordConfigured(Boolean(status.passwordConfigured));
      } catch {
        setUnlocked(false);
        setPasswordConfigured(false);
      }
    })();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_FORM_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_ROLE_KEY, JSON.stringify(roleCard));
  }, [roleCard]);

  const customConfigReady = useMemo(() => isCustomConfigReady(customConfig), [customConfig]);
  const customConfigSaved = useMemo(
    () => customConfigReady && JSON.stringify(customConfig) === savedCustomConfigSnapshot,
    [customConfig, customConfigReady, savedCustomConfigSnapshot],
  );
  const canRunFortune = true;
  const activeConfigLabel = unlocked
    ? "站点私有模型"
    : customConfigReady
      ? "访客自定义模型"
      : "本地古法兜底";

  const orderedNodes = useMemo(
    () =>
      [...nodes].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [nodes],
  );

  const profileSummary = useMemo(() => {
    const parts = [systemLabelMap[form.divinationSystem], form.name || "未命名", form.birthPlace || "未设置出生地"];
    if (form.birthDate) {
      parts.push(form.birthDate);
    }
    return parts.join(" · ");
  }, [form]);
  const displayPalaces = board?.palaces?.length ? board.palaces : idlePalaces;
  const displayCenterText = board?.centerText?.length
    ? board.centerText
    : ["等待命主资料", "在左上角设置中填写参数", "然后像聊天一样直接提问"];
  const isRingBoard = board?.layout === "ring12";
  const boardVisualStyle = isRingBoard
    ? ({
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridTemplateRows: "repeat(4, minmax(0, 1fr))",
        gridTemplateAreas: "none",
      } as const)
    : undefined;
  const boardCenterStyle = isRingBoard
    ? ({
        gridRow: "2 / 4",
        gridColumn: "2 / 4",
      } as const)
    : undefined;

  const toggleNode = (nodeId: string) => {
    setExpandedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((item) => item !== nodeId) : [...prev, nodeId],
    );
  };

  const saveCustomConfig = () => {
    const snapshot = JSON.stringify(customConfig);
    window.localStorage.setItem(STORAGE_CUSTOM_CONFIG_KEY, snapshot);
    setSavedCustomConfigSnapshot(snapshot);
    setAccessError(null);
  };

  const unlockPrivateConfig = async () => {
    setAccessBusy(true);
    setAccessError(null);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: accessPassword }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "访问密码校验失败");
      }

      setUnlocked(true);
      setAccessPassword("");
    } catch (err) {
      setUnlocked(false);
      setAccessError(err instanceof Error ? err.message : "访问密码校验失败");
    } finally {
      setAccessBusy(false);
    }
  };

  const logoutPrivateConfig = async () => {
    setAccessBusy(true);
    setAccessError(null);

    try {
      await fetch("/api/access", { method: "DELETE" });
      setUnlocked(false);
    } finally {
      setAccessBusy(false);
    }
  };

  const runFortune = async () => {
    setError(null);
    setResult(null);
    setNodes([]);
    setExpandedNodeIds([]);
    setBoard(null);
    setIsStreaming(true);
    setReportReady(false);
    setMessages([introMessage]);

    const payload: FortuneRequest = {
      ...form,
      roleCard,
      runtimeConfig: customConfigReady ? customConfig : undefined,
    };

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      kind: "text",
      content: form.question,
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/fortune", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || "请求失败");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const event = JSON.parse(line) as FortuneStreamEvent;

          if (event.type === "message" || event.type === "message_delta") {
            const compactMessage =
              event.type === "message" && event.message.role === "assistant"
                ? {
                    ...event.message,
                    content:
                      event.message.phase === "chart"
                        ? "四柱已经排出，正在转入月令、十神与大运判断。"
                        : event.message.phase === "palace"
                          ? "四柱摘要与问时卦已经同步，正在整理关键判断。"
                          : event.message.phase === "report"
                            ? "完整报告已经生成，右侧可以直接阅读。"
                            : event.message.content,
                  }
                : event.message;
            setMessages((prev) => {
              const index = prev.findIndex((item) => item.id === compactMessage.id);
              if (index === -1) {
                return [...prev, compactMessage];
              }
              const next = [...prev];
              next[index] = compactMessage;
              return next;
            });
            if (compactMessage.role === "assistant") {
              setAnimatedMessageId(compactMessage.id);
            }
          }

          if (event.type === "node") {
            setNodes((prev) => {
              const index = prev.findIndex((item) => item.id === event.node.id);
              if (index === -1) {
                return [...prev, event.node];
              }
              const next = [...prev];
              next[index] = event.node;
              return next;
            });
          }

          if (event.type === "board") {
            setBoard(event.board);
          }

          if (event.type === "result") {
            setResult(event.result);
            setBoard(event.result.board);
            window.localStorage.setItem(STORAGE_REPORT_KEY, JSON.stringify(event.result));
            setReportReady(true);
            window.setTimeout(() => {
              document.getElementById("report-archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 120);
          }

          if (event.type === "error") {
            throw new Error(event.error);
          }

          if (event.type === "done") {
            setIsStreaming(false);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生未知错误");
      setIsStreaming(false);
    }
  };

  return (
    <>
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        form={form}
        setForm={setForm}
        roleCard={roleCard}
        setRoleCard={setRoleCard}
        unlocked={unlocked}
        passwordConfigured={passwordConfigured}
        accessPassword={accessPassword}
        setAccessPassword={setAccessPassword}
        accessBusy={accessBusy}
        accessError={accessError}
        onUnlock={unlockPrivateConfig}
        onLogout={logoutPrivateConfig}
        customConfig={customConfig}
        setCustomConfig={setCustomConfig}
        customConfigSaved={customConfigSaved}
        onSaveCustomConfig={saveCustomConfig}
      />

      <main className="page-stack">
        <div className="workspace-shell chat-layout">
        <section className="left-column chat-column">
          <header className="chat-topbar">
            <div>
              <span className="kicker">MING LU STUDIO</span>
              <h1>明命录</h1>
            </div>
            <div className="topbar-actions">
              <div className="context-chip">
                <strong>{roleCard.name}</strong>
                <span>{profileSummary}</span>
              </div>
              <div className={`access-chip ${unlocked ? "unlocked" : "locked"}`}>
                <strong>{activeConfigLabel}</strong>
                <span>{unlocked ? "已通过访问密码解锁" : "未解锁时仅可使用自定义配置"}</span>
              </div>
              <button className="ghost-btn" onClick={() => setSettingsOpen(true)}>
                设置
              </button>
            </div>
          </header>

          <section className="chat-thread">
            <div className="chat-scroll">
              {messages.map((message) => (
                <article key={message.id} className={`chat-message ${message.role}`}>
                  <div className="avatar-dot">{message.role === "user" ? "你" : message.role === "assistant" ? "命" : "系"}</div>
                  <div className="bubble-wrap">
                    <div className="bubble-meta">
                      <strong>
                        {message.role === "user" ? "你" : message.role === "assistant" ? roleCard.name : "系统"}
                      </strong>
                    </div>
                    <div className={`chat-bubble ${message.role}`}>
                      {message.role === "assistant" ? (
                        animatedMessageId === message.id ? (
                          <TypewriterText key={message.id} text={message.content} active />
                        ) : (
                          <p>{message.content}</p>
                        )
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}

              {orderedNodes.length > 0 ? (
                <article className="chat-message assistant node-block">
                  <div className="avatar-dot">节</div>
                  <div className="bubble-wrap full">
                    <div className="bubble-meta">
                      <strong>关键节点</strong>
                      <span>默认只显示摘要，点击展开细节</span>
                    </div>
                    <div className="node-accordion">
                      {orderedNodes.map((node) => {
                        const expanded = expandedNodeIds.includes(node.id);
                        return (
                          <button
                            key={node.id}
                            className={`node-row ${expanded ? "expanded" : ""}`}
                            onClick={() => toggleNode(node.id)}
                          >
                            <div className="node-summary">
                              <span className="node-phase">{node.phase}</span>
                              <strong>{node.title}</strong>
                              <em>{formatNodeTime(node.timestamp)}</em>
                            </div>
                            {expanded ? <NodeDetailText key={`${node.id}-${expandedNodeIds.includes(node.id)}`} text={node.detail} expanded={expanded} /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ) : null}
            </div>

            <div className="composer-panel">
              <div className="composer-summary">
                <span>{roleCard.name}</span>
                <span>{systemLabelMap[form.divinationSystem]}</span>
                <span>{form.name || "未配置命主姓名"}</span>
                <span>{form.birthDate || "未配置生日"}</span>
                <span>{activeConfigLabel}</span>
                <span>{result ? (result.meta.source === "llm" ? `解读来源 ${result.meta.model}` : "解读来源 本地兜底") : "等待推演"}</span>
              </div>
              <textarea
                rows={4}
                value={form.question}
                onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                placeholder="直接提问，例如：未来两年事业转型如何看？感情婚配应先验哪一步大运？"
                disabled={isStreaming}
              />
              <div className="composer-actions">
                <div className="composer-hint">
                  <code>{unlocked ? "private-model" : customConfigReady ? customConfig.model : "classic-local"}</code>
                  {reportReady ? <a href="#report-archive">查看报告</a> : null}
                  {error ? <span className="error-inline">{error}</span> : null}
                </div>
                <button onClick={runFortune} disabled={isStreaming || !canRunFortune}>
                  {isStreaming ? "推演中..." : "发送"}
                </button>
              </div>
            </div>
          </section>
        </section>

        <aside className="right-column compact board-only">
          <section className={`board-shell compact phase-${board?.phase ?? "idle"}`}>
            <div className="board-head compact">
              <div>
                <span className="kicker">术数总盘</span>
                <h2>{board?.title ?? "等待起盘"}</h2>
              </div>
              <div className="board-status">
                <div className="pulse-pill">
                  <span>Pulse</span>
                  <strong>{board?.pulse ?? 0}</strong>
                </div>
                <span className="phase-tag">{board?.phase ?? "idle"}</span>
              </div>
            </div>

            <p className="board-subtitle">
              {board?.subtitle ?? "右侧会显示命盘摘要、关键宫位或四柱起运与当前在线摇卦结果。"}
            </p>

            <div className="palace-board compact">
              <div
                className={`board-visual ${board ? "live" : "idle"} ${isRingBoard ? "ring12" : ""} compact`}
                style={boardVisualStyle}
              >
                {board && !isRingBoard ? <PalaceConnections board={board} /> : null}
                {displayPalaces.map((palace, index) => (
                  <PalaceCard
                    key={`${palace.name}-${palace.branch}`}
                    palace={palace}
                    position={palace.slot ?? boardPositions[index] ?? "top-center"}
                    activePhase={board?.phase ?? "intake"}
                    style={palace.slot ? ringSlotStyles[palace.slot] : undefined}
                  />
                ))}
                <div className="board-center compact" style={boardCenterStyle}>
                  {displayCenterText.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
              <article className="board-insight compact">
                <h3>流式判断</h3>
                <p>{board?.insightDraft || "模型开始输出后，这里会实时显示正在成形的判断摘要。"}</p>
              </article>
            </div>

            <div className="metric-grid compact">
              {(board?.metrics ?? []).map((metric) => (
                <MetricCard key={`${metric.label}-${metric.value}`} metric={metric} />
              ))}
            </div>

            <div className="signal-grid compact">
              <article className="signal-card compact">
                <div className="signal-head compact">
                  <h3>起卦</h3>
                  <p>自动在线模拟六次摇铜钱</p>
                </div>
                <div className="hex-shell compact">
                  {[...(board?.hexagramLines ?? [])].reverse().map((line, index) => (
                    <HexLine key={index} line={line} />
                  ))}
                </div>
              </article>

              <article className="signal-card compact">
                <div className="signal-head compact">
                  <h3>焦点</h3>
                  <p>当前判断摘要</p>
                </div>
                <div className="highlight-list compact">
                  {(board?.highlights ?? ["尚未开始推演"]).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </aside>
        </div>

        <section id="report-archive" className="inline-report-shell">
          <div className="inline-report-head">
            <div>
              <span className="kicker">最终报告</span>
              <h2>{reportReady ? "报告归档完成" : "等待生成"}</h2>
            </div>
            <p>
              {reportReady
                ? "以下为本次推演的完整报告，支持继续向下滚动查看。"
                : "推演完成后，完整报告会在这里出现。"}
            </p>
          </div>

          {reportReady ? (
            <div className="inline-report-grid">
              <article className="inline-report-main">
                <ReactMarkdown>{result?.report.markdown ?? ""}</ReactMarkdown>
              </article>

              <aside className="inline-report-side">
                {result ? (
                  <>
                    <section className="report-side-card">
                      <h3>命盘摘要</h3>
                      <p>当前右侧总盘与下方报告保持同一份推演结果。</p>
                      <p>{result.meta.source === "llm" ? `本次由 ${result.meta.model} 参与深度解读。` : "本次未接入模型，使用本地规则兜底。"}</p>
                      {result.meta.sourceDetail ? <p>{result.meta.sourceDetail}</p> : null}
                      <p>{result.analysis.summary}</p>
                    </section>
                    <section className="report-side-card">
                      <h3>判断摘要</h3>
                      {result.board.highlights.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </section>
                  </>
                ) : null}
              </aside>
            </div>
          ) : (
            <div className="report-empty">
              <p>完成推演后，这里会新增完整报告板块。</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
