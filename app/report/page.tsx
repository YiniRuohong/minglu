"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

import type { FortuneResponse } from "@/lib/types";

const STORAGE_REPORT_KEY = "minglu.latest-report";

function loadStoredReport(): FortuneResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_REPORT_KEY);
    return raw ? (JSON.parse(raw) as FortuneResponse) : null;
  } catch {
    return null;
  }
}

export default function ReportPage() {
  const [reportData] = useState<FortuneResponse | null>(loadStoredReport);

  if (!reportData) {
    return (
      <main className="report-page-empty">
        <div className="report-page-empty-card">
          <h1>暂无可读报告</h1>
          <p>请先在主工作台完成一次推演，随后再打开报告页。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="report-page-shell">
      <section className="report-page-main">
        <div className="report-page-head">
          <div>
            <span className="kicker">Report Archive</span>
            <h1>{reportData.report.title}</h1>
          </div>
          <div className="report-meta-stack">
            <span>{reportData.meta.model}</span>
            <span>{reportData.profile.subject.solarText}</span>
            <span>{reportData.profile.subject.birthPlace}</span>
          </div>
        </div>

        <div className="report-page-grid">
          <article className="report-page-article">
            <ReactMarkdown>{reportData.report.markdown}</ReactMarkdown>
          </article>

          <aside className="report-page-side">
            <section className="report-side-card">
              <h2>命盘摘要</h2>
              <p>日主：{reportData.profile.dayMaster}</p>
              <p>命宫：{reportData.profile.mingGong}</p>
              <p>身宫：{reportData.profile.shenGong}</p>
              <p>四柱：{reportData.profile.pillars.year.value} / {reportData.profile.pillars.month.value} / {reportData.profile.pillars.day.value} / {reportData.profile.pillars.hour.value}</p>
            </section>

            <section className="report-side-card">
              <h2>当前焦点宫位</h2>
              {reportData.board.highlights.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </section>

            <section className="report-side-card">
              <h2>结论速览</h2>
              <p>{reportData.analysis.summary}</p>
              {reportData.analysis.suggestions.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
