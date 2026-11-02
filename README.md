# Fabric AI Project

## 目录与交付边界

```text
FabricAIProject/
├── preview/              # 页面、React 源码与运行资源：页面交付目录
│   ├── assets/           # 运行时图标、图片、动效、字体和第三方库
│   ├── src/
│   │   └── utils/        # 公共工具：尺寸解析、Excel 写入、报告导出
│   ├── app.jsx
│   ├── index.page.html   # 从源码构建的应用入口
│   └── site-preview.html # PC 预览外层，默认逻辑视口 1920×1080
├── scripts/              # 开发用构建、校验和离线导出工具
└── design-references/    # 设计说明、原稿截图与溯源资料
```

页面交付包以 `preview/` 为边界，不包含根目录的 `scripts/`、`design-references/`、`work/`、Git 元数据或 `node_modules/`。完整开发仓库保留工具和参考资料，便于重新构建与维护。运行代码只能引用 `preview/` 内的源码和资源。

## 构建与验证

在仓库根目录执行（Node.js）：

```sh
node scripts/build-preview.cjs
node scripts/verify-uc4.cjs
node scripts/verify-uc2-rule-detail.mjs
```

构建及校验使用仓库内资源，无需联网或安装依赖。修改 `preview/app.jsx`、`preview/src/` 或相关样式后重新构建，不直接编辑生成的 `index.page.html`。

## 本地预览

默认复用 `http://127.0.0.1:8766/site-preview.html`。如服务尚未启动，可在仓库根目录执行：

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory preview
```

离线单文件导出等工具的用法见 [scripts/README.md](scripts/README.md)。
