# 明命录

一个从零搭建的命理网页，目标不是做成朴素表单页，而是做成带有东方仪式感的可视化命盘界面：

- 使用 `lunar-typescript` 做四柱八字与大运基础排盘
- 借鉴 [`jinchenma94/bazi-skill`](https://github.com/jinchenma94/bazi-skill) 的分析框架组织提示词
- 支持在本地 `config/fortune.config.json` 中配置任意 OpenAI 兼容格式 API
- 用卦象线条、五行条形图、四柱卡片做结果可视化

## 本地启动

```bash
npm install
cp .env.example .env.local
cp config/fortune.config.example.json config/fortune.config.json
cp config/access.config.example.json config/access.config.json
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## Vercel 部署

这套项目已经适配为：

- `Vercel / 生产环境`：优先读取环境变量
- `本地开发`：如果没配环境变量，再回退到 `config/*.json`

Vercel 中需要配置的环境变量统一放在：

- [.env.example](/Users/andyzhao/Documents/claude code/ming_web/.env.example)

其他可变项和配置说明统一放在：

- [docs/configuration.md](/Users/andyzhao/Documents/claude code/ming_web/docs/configuration.md)

推荐部署流程：

```bash
npm run build
vercel
```

## 说明

- 若上游模型返回异常，页面仍会显示本地命盘与兜底分析
- 命理内容仅供传统文化体验与娱乐参考，不构成现实决策建议
