# UC4 同步说明

2026-10-24 将站点当前生效的 V42 迁入本工程的 React 组件和独立预览文件。

- 来源：基线合规检查站点 V42，源码提交 `429ac8660468e3242681f15c60aaac9d52f0c939`。
- V43 已被用户回滚；未迁入 V43 的紧凑设备信息行，也未实施后续讨论中的 TOP 用户旅程改版。
- UC4 包含整网扫描、6 个设备组与6 个共享检查集、报告、TOP 卡片、设备/规则详情、内部卡片页签。
- 统一数据口径：380 台设备，375 台通过、5 台不通过，9 项不同规则不通过；前五台设备分别适用 24、20、18、22、16 条规则。
- UC2 黄金基线挖掘保留原有组件、数据和样式；UC4 新样式限定在 `.stage-root.uc4` 下。
- 保留原有 `scrollCanvasTo` 和 `overflow:clip` 修复，定位仅滚动画布内部。
- 顶栏“原版”和“融合版”链接到已发布站点的相应保留版本；“新版本”留在本地工程。

## 重建预览

在 `D:\ADN_L4` 执行：

```powershell
node preview/scripts/build-preview.cjs
node preview/scripts/verify-uc4.cjs
```

构建使用工程内的 Babel、React 和本地图标资源，无需安装依赖或访问网络。修改源码后应重建 `preview/index.page.html`，避免源码与独立预览副本不一致。

可使用本地 HTTP 服务打开 `preview/index.page.html`，从第4个推荐问题进入 UC4；第2个推荐问题仍进入 UC2。

同步前完整预览备份：`C:\Users\Lenovo\Desktop\codex\adn-uc4-sync-v42\before`。
