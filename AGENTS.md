# Fabric AI 预览执行规则

- 持续修改现有 Fabric AI 源码，预览更新始终复用现有 Site：`https://fabric-ai-project-preview.chummymorel33.chatgpt.site/`。
- Site project_id 固定为 `appgprj_6adc533ae09881918449b23699cb4b92`。不得为每次修改创建新站点或新预览链接。
- 打开或刷新时复用已存在的预览标签页；能取得 tabId 时必须传入该标签页标识，避免重复打开标签页。
- 默认以 1920×1080 PC 视口进行浏览器检查、截图和结果预览，同时保留页面对其他 PC 尺寸的响应式适配。
- 交付真实渲染截图和同一站点链接；工具仅返回 queued 时不能声称预览已刷新。
- AI 欢迎页、特性选择和模板状态是 UC1–UC4 共用的入口，维护一套共享实现；发送任务后再进入各用例流程。
- Site 首页必须使用 `preview/site-preview.html` 的 PC 预览外层；默认逻辑视口为 1920×1080，并在宿主预览区域内等比缩小。应用本身保留 `index.page.html` 的响应式布局。发布时复制 `site-preview.html` 为 `dist/index.html`，不得再将应用 HTML 直接覆盖站点首页。

- 构建使用 `node preview/scripts/build-preview.cjs`，它包含 border-beam 等本项目依赖的打包支持；基础数据验证使用 `node preview/scripts/verify-uc4.cjs`，界面改动还需实际浏览器检查。
