# NbpuAsk-Web

> 宁青千问前端项目  
> College Intelligent Question-Answering System Based on LLM.

**NbpuAsk-Web** 是“宁青千问——基于大模型的校园智能问答系统”的前端项目，基于 Vue 3 + Vite 构建，主要面向校园智能问答场景，提供用户登录注册、智能问答、历史对话管理、对话分享、流式回答展示等页面与交互能力。

本项目为毕业设计项目 **宁青千问** 的前端部分，后端项目请见：[NbpuAsk-Server](https://github.com/Ailety/NbpuAsk-Server)

## 在线体验

访问地址：

```text
https://nbpuask.pixelmc.cn
```

> 当前项目仍处于测试阶段，回答效果依赖后端大模型服务与校园知识库内容。

## 项目特性

- 基于 **Vue 3 + Vite** 构建
- 支持用户登录、注册与登录状态校验
- 支持新建对话、查看历史对话、切换对话、删除对话
- 支持对话标题展示与重命名
- 支持大模型回答的 **SSE 流式输出**
- 支持模型思考状态、回答加载状态与异常提示
- 支持对话分享与公开分享页访问
- 支持 Markdown 内容渲染
- 侧边栏折叠、自动滚动、欢迎页动效等交互优化
- 集成 Element Plus、PrimeVue、Ant Design Vue 等 UI 相关依赖

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 核心框架 | Vue 3 |
| 构建工具 | Vite |
| 路由管理 | Vue Router |
| 状态管理 | Vuex / Pinia |
| HTTP 请求 | Axios |
| 流式请求 | @microsoft/fetch-event-source |
| Markdown 渲染 | markdown-it |
| UI 组件 | Element Plus / PrimeVue / Ant Design Vue |
| 代码规范 | ESLint / Prettier |

## 项目结构

```text
NbpuAsk-Web
├── public/                 # 静态资源
├── src/
│   ├── api/                # 后端接口封装
│   │   ├── auth.js         # 登录、注册、Token 校验
│   │   ├── conversation.js # 对话创建、获取、删除、同步等接口
│   │   ├── share.js        # 对话分享相关接口
│   │   └── http.js         # Axios 与错误处理封装
│   ├── assets/             # 图片、图标等资源
│   ├── components/         # 页面组件
│   ├── composables/        # 可复用组合式逻辑
│   ├── router/             # 路由配置
│   ├── store/              # 全局状态管理
│   ├── utils/              # 工具函数
│   ├── views/              # 页面视图
│   ├── App.vue
│   └── main.js
├── package.json
├── vite.config.js
└── README.md
```

## 页面说明

| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 登录页 | `/login` | 用户登录 |
| 注册页 | `/register` | 用户注册 |
| 用户协议 | `/terms` | 用户协议页面 |
| 隐私政策 | `/privacy` | 隐私政策页面 |
| 问答主页 | `/chat` | 新建或进入对话 |
| 指定对话 | `/chat/:id` | 查看指定历史对话 |
| 分享对话 | `/shared/:id` | 访问公开分享的对话内容 |

## 本地运行

### 1. 克隆项目

```bash
git clone https://github.com/Ailety/NbpuAsk-Web.git
cd NbpuAsk-Web
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置后端地址

前端默认后端地址在 `src/store/store.js` 中配置：

```js
serverUrl: '/api'
```

如果是本地开发，可以根据后端实际地址修改为：

```js
serverUrl: 'http://localhost:8088'
```

如果是生产部署，推荐通过 Nginx 等反向代理将 `/api` 转发到后端服务。

### 4. 启动开发环境

```bash
npm run dev
```

启动后根据终端提示访问本地地址。

### 5. 打包构建

```bash
npm run build
```

构建产物会生成在 `dist/` 目录中。

### 6. 本地预览构建结果

```bash
npm run preview
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发环境 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建结果 |
| `npm run lint` | 执行 ESLint 修复 |
| `npm run format` | 使用 Prettier 格式化代码 |

## 后端接口依赖

本项目需要配合后端项目运行：

```text
https://github.com/Ailety/NbpuAsk-Server
```

主要依赖的后端能力包括：

- 用户注册与登录
- Token 校验
- 对话创建、获取、保存、删除
- 对话分享与取消分享
- 大模型流式问答接口
- 历史对话数据持久化

其中大模型回答通过 SSE 流式接口返回，前端使用 `@microsoft/fetch-event-source` 接收后端逐步返回的文本片段。

## 注意事项

1. 当前项目仍处于测试阶段，部分功能和界面可能继续调整。
2. 大模型回答质量依赖后端模型服务和知识库内容。
3. 如果后端服务未启动或接口地址配置错误，前端将无法正常登录或提问。
4. 若使用生产环境部署，请确保 `/api` 代理、跨域配置和 HTTPS 配置正确。
5. 本项目为毕业设计项目，代码结构和功能仍在持续完善中。

## 相关仓库

- 前端仓库：[NbpuAsk-Web](https://github.com/Ailety/NbpuAsk-Web)
- 后端仓库：[NbpuAsk-Server](https://github.com/Ailety/NbpuAsk-Server)

## License

本项目仅用于毕业设计、学习交流与技术研究。  
如需复用或二次开发，请保留原作者信息。