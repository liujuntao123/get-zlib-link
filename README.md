# get-zlib-link

从维基百科提取 **Z-Library** 官方链接，并通过简单网页展示、点击跳转。

支持：

- 本地开发 / CLI
- **Vercel** 一键部署
- **Cloudflare Pages** 一键部署

## 功能

- `GET /api/link`：抓取中/英维基百科，返回 JSON 链接列表
- 前端页面：展示推荐入口 + 全部候选链接，支持点击跳转与复制
- CLI：`npm run fetch` 在终端输出结果

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000

| 地址 | 说明 |
|------|------|
| `/` | 链接展示页 |
| `/api/link` | JSON API |
| `npm run fetch` | 命令行抓取 |

### API 响应示例

```json
{
  "ok": true,
  "primaryUrl": "https://example.com",
  "links": [
    {
      "url": "https://example.com",
      "source": "infobox",
      "label": "官方网站",
      "wiki": "zh"
    }
  ],
  "sources": [
    { "id": "zh", "label": "中文维基百科", "ok": true, "count": 1 }
  ],
  "fetchedAt": "2026-07-28T00:00:00.000Z"
}
```

## 项目结构

```
├── api/link.js              # Vercel Edge Function → /api/link
├── functions/api/link.js    # Cloudflare Pages Function → /api/link
├── lib/
│   ├── scrape.mjs           # 维基百科抓取与解析
│   └── handler.mjs          # 共享 Web Request 处理器
├── public/                  # 静态页面（展示 + 跳转）
├── server.mjs               # 本地开发服务器
├── fetch-wiki.mjs           # CLI
├── vercel.json
└── wrangler.toml
```

## 部署到 Vercel

1. 将仓库导入 [Vercel](https://vercel.com)
2. Framework Preset 选 **Other**
3. 构建命令可留空；Output Directory 填 `public`（`vercel.json` 已配置）
4. 部署后访问：
   - `https://<project>.vercel.app/`
   - `https://<project>.vercel.app/api/link`

CLI：

```bash
npx vercel
npx vercel --prod
```

## 部署到 Cloudflare Pages

### 控制台

1. Workers & Pages → Create → Pages → Connect to Git
2. Build 设置：
   - **Build command**：留空（或 `echo skip`）
   - **Build output directory**：`public`
3. 部署后，`functions/` 目录会自动作为 Pages Functions 生效（`/api/link`）

### CLI

```bash
npm i -g wrangler
npx wrangler pages project create get-zlib-link
npx wrangler pages deploy public --project-name=get-zlib-link
```

> 注意：使用 Git 集成时，请确保仓库根目录包含 `functions/`，这样 Functions 会与 `public` 静态资源一起发布。若仅用 `wrangler pages deploy public`，需要额外带上 functions，例如：
>
> ```bash
> npx wrangler pages deploy public --project-name=get-zlib-link
> ```
>
> 较新版本的 Wrangler 会从项目根目录自动发现 `functions/`（见 `wrangler.toml` 的 `pages_build_output_dir`）。

推荐使用：

```bash
npx wrangler pages deploy
```

（读取 `wrangler.toml` 中的 `pages_build_output_dir = "public"`，并打包根目录 `functions/`。）

## 环境要求

- Node.js ≥ 18（本地开发）
- 运行时需能访问 `zh.wikipedia.org` / `en.wikipedia.org`

## 说明

本项目仅从公开维基百科页面解析「官方网站」类字段并展示链接，不托管、不镜像任何站内资源。


学AI上L站：https://linux.do/
