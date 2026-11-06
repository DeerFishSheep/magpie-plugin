# middleware-system-prompt-raw

`@magpie-community/middleware-system-prompt` 的本地改版：多了一个自带的设置页，提示词按**原文**粘贴，不用写 JSON，也不用把换行转成 `\n`。

中间件逻辑与上游相同，未改动。

## 装

```sh
magpie plugin add /path/to/system-prompt-raw
```

文件夹就地加载，不经过 npm。

## 用

1. 侧边栏 → 插件 → 「系统提示词」。
2. 把提示词原文粘进大输入框（markdown、多行、引号、反引号都行）。
3. 需要时勾选 override / 选插入位置 / 填 agents、models 白名单。
4. 点保存（或 ⌘S / Ctrl+S）。保存后从下一个请求起生效。

页面上调的是 `magpie.options.set()`，序列化由 magpie 做，所以原文里的换行会原样落进 `plugins.json` 的 `system_prompt`。

## 与上游的差别

| 项 | 上游 | 这里 |
| --- | --- | --- |
| 选项编辑 | magpie 通用 JSON 编辑器，手写 `\n` | 插件自带页面，纯文本 textarea |
| 中间件逻辑 | — | 完全相同 |

## 与上游同时安装

两个包的短名不同（`system-prompt-raw` 与 `system-prompt`），可以并存，但**同时开启会注入两遍**。装这个之前先把 `@magpie-community/middleware-system-prompt` 移除或关掉。

## 许可

MIT，中间件代码来自 magpie-community/plugins。
