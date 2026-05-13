# 明命录

一个从零搭建的命理网页，目标不是做成朴素表单页，而是做成带有东方仪式感的可视化命盘界面：

- 使用 `lunar-typescript` 做四柱八字与大运基础排盘
- 借鉴 [`jinchenma94/bazi-skill`](https://github.com/jinchenma94/bazi-skill) 的分析框架组织提示词
- 支持在本地 `config/fortune.config.json` 中配置任意 OpenAI 兼容格式 API
- 用卦象线条、五行条形图、四柱卡片做结果可视化

## 本地启动

```bash
npm install
cp config/fortune.config.example.json config/fortune.config.json
cp config/access.config.example.json config/access.config.json
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 本地配置文件

`config/fortune.config.json`

```json
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-your-api-key",
  "model": "gpt-4.1-mini",
  "temperature": 0.8,
  "headers": {}
}
```

说明：

- `baseUrl` 支持 OpenAI 兼容地址，程序会自动补全到 `/chat/completions`
- `headers` 可用于某些兼容服务要求的额外请求头
- 配置文件只在服务端读取，避免把 Key 暴露到浏览器
- 生产部署时更推荐使用环境变量，不推荐把这份文件带到线上

`config/access.config.json`

```json
{
  "accessPassword": "change-this-password"
}
```

说明：

- 输入访问密码后，页面才会直接调用服务端保存的 `config/fortune.config.json`
- 未输入访问密码时，访客只能填写并保存自己的 OpenAI 兼容 `baseUrl / model / apiKey` 后再推演
- 也可以用环境变量 `ACCESS_PASSWORD` 覆盖 `config/access.config.json`

## Vercel 部署

这套项目已经适配为：

- `Vercel / 生产环境`：优先读取环境变量
- `本地开发`：如果没配环境变量，再回退到 `config/*.json`

在 Vercel 项目设置里添加这些环境变量：

```bash
FORTUNE_BASE_URL=https://api.openai.com/v1
FORTUNE_API_KEY=sk-your-api-key
FORTUNE_MODEL=gpt-4.1-mini
FORTUNE_TEMPERATURE=0.8
FORTUNE_HEADERS_JSON={}
ACCESS_PASSWORD=change-this-password
```

说明：

- `FORTUNE_BASE_URL`、`FORTUNE_API_KEY`、`FORTUNE_MODEL` 是私有默认推演通道必填项
- `FORTUNE_TEMPERATURE` 可选，默认会回退到代码中的温度设定
- `FORTUNE_HEADERS_JSON` 可选，用于某些 OpenAI 兼容网关的额外请求头，格式必须是 JSON 字符串
- `ACCESS_PASSWORD` 是访问密码，只有输入正确后才会调用你的私有默认配置
- 如果不配 `ACCESS_PASSWORD`，站点仍可打开，但“私有配置解锁”入口会提示未配置

推荐部署流程：

```bash
npm run build
vercel
```

如果你想在本地先模拟线上环境，可以直接复制：

```bash
cp .env.example .env.local
```

## 说明

- 若上游模型返回异常，页面仍会显示本地命盘与兜底分析
- 命理内容仅供传统文化体验与娱乐参考，不构成现实决策建议
