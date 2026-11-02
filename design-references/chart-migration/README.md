# 基础图表 ECharts 迁移记录

本记录是设计与实现对照资料，不属于 `preview/` 页面交付目录。

## 当前覆盖

| 位置 | 图表 | 实现 |
|---|---|---|
| 首页数据总览 | 工作流分布圆环 | ECharts 原生 pie；图例使用原稿文字轮廓的 custom 标注 |
| 首页数据总览 | 合规率趋势 | ECharts 原生 line + custom 渐变/裁切层 |
| 首页技能统计 | 配置检查任务分布 | ECharts custom 堆叠条形，与统一任务数据源同步 |
| UC2 报告 | 候选角色圆环 | 保留已有 ECharts custom，内侧 0.5rem 圆角、外侧直角 |
| UC2 报告 | 置信度条纹图 | 保留已有 ECharts custom |
| UC2 候选表 | 支持样本比例条 | 共用 SegmentedBar，保留数字、2px 间隔和最小可见段 |
| UC4 报告 | 合规度圆环 | 保留已有 ECharts custom |
| UC4 报告 | 不通过率比例条 | 保留已有 ECharts custom |

## 还原边界

- 拓扑、地图、规则图谱、扫描动效、进度控件继续采用原实现，不为使用图表库改变其结构。
- 所有图表使用已归档的本地 ECharts 6.1.0 和 SVG renderer，不依赖 CDN。ECharts 的 SVG 输出与原稿 SVG 图片不是同一种实现；主体图形来自 series 数据。
- 首页原稿点列与文字轮廓保存在 `preview/src/components/effectiveness-metrics/chart-data.js`，由 `chart-options.js` 组装。工作流圆环沿用原素材已有的分段比例；本次不重新解释或更改页面展示指标的数据口径。
- 趋势图保留上部绿色线、参考虚线、绿色渐变以及参考线下方的蓝色线/蓝色渐变；蓝线与蓝色填充共用原稿的裁切区域。
- 字号、配色、尺寸、圆角、图例与控件位置沿用当前版本，不套用图表库默认轴和提示框。
- `EChart exactSize` 仅为新图启用，读取未缩放 CSS 小数尺寸；原有 UC2/UC4 图表继续采用原测量路径。没有使用外层预览缩放后的矩形来绘图。
- 首页任务条保留 700ms 平滑更新；表格微条形保持静态。减少动态效果设置下停止更新动画。
- UC2 的透明 SVG 仅为点击/键盘命中层，可见圆环由 ECharts 绘制；角色、置信度与候选表格筛选仍共用原状态。

## 验证

构建和数据模型校验使用根目录 `scripts/`；另验证了原生 pie/line/custom 的 SVG 渲染、动态堆叠条的最小段与窄容器边界，以及原有 UC2 角色/置信度组合筛选。浏览器中逐项比对尺寸、位置与图形层次，不能把不同渲染路径的抗锯齿差异描述为全像素零差异。

参考：[ECharts 折线](https://echarts.apache.org/handbook/en/how-to/chart-types/line/basic-line/)、[圆环](https://echarts.apache.org/handbook/en/how-to/chart-types/pie/doughnut/)、[custom series](https://echarts.apache.org/handbook/en/how-to/custom-series/)。
