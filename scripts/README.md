# 开发辅助脚本

本目录与 `preview/` 同级，不属于页面运行资源或页面交付包。脚本按自身路径定位 `preview/`，不依赖终端当前目录；`build-map-vectors.cjs` 仍支持 `FABRIC_PREVIEW_ROOT`，离线导出仍支持 `--dir` 指定其他应用目录。

| 文件 | 用途 |
|---|---|
| `build-preview.cjs` | 从 React 源码生成 `preview/index.page.html`，并生成地图矢量层 |
| `build-map-vectors.cjs` | 从 `preview/assets/` 中的原始 SVG 生成地图图层 |
| `verify-uc4.cjs` | 重新构建并校验 UC4 数据口径及保留模块 |
| `verify-uc2-rule-detail.mjs` | 校验 UC2 规则与设备证据模型 |
| `export-standalone.mjs` | 将预览和运行资源合并为离线 HTML |
| `vendor-generative-loaders.cjs` | 开发维护时重新生成本地依赖副本；需要先安装 `preview/package.json` 的依赖 |

在仓库根目录执行：

```sh
node scripts/build-preview.cjs
node scripts/verify-uc4.cjs
node scripts/verify-uc2-rule-detail.mjs
```

仅在需要独立离线文件时导出；脚本只收集 `preview/assets/uploads`、`preview/assets/font` 和应用引用的本地库，不读取设计参考资料：

```sh
node scripts/export-standalone.mjs --out /path/to/FabricAI-offline.html
```

若需重新生成 generative-loaders 的已打包依赖：

```sh
npm install --prefix preview
node scripts/vendor-generative-loaders.cjs
```

正常预览、构建和数据校验直接使用已归档的本地依赖，无需执行最后两条命令。
