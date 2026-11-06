# middleware-system-prompt-raw

`@magpie-community/middleware-system-prompt` 的本地改版：多一个自带的设置页，提示词按**原文**粘贴，不用写 JSON，也不用把换行转成 `\n`。

## 装

```sh
magpie plugin add /path/to/system-prompt-raw
```

文件夹就地加载，不经过 npm。

## 用

1. 侧边栏 → 插件 → 「系统提示词」。
2. 把提示词原文粘进大输入框（markdown、多行、引号、反引号都行）。
3. 选位置，默认**追加在后面**：
   - 追加在后面：你的提示词接在 agent 原提示词后面，不破坏它的提示词缓存
   - 放在前面：你的提示词放在 agent 原提示词最前面
4. 需要时填 agents、models 白名单（留空 = 全部）。
5. 点保存（或 ⌘S / Ctrl+S）。保存后从下一个请求起生效。

agent 自己的提示词在两档里都保留，不会被丢弃。请求本身没有系统提示词时，直接用你这段。

页面上调的是 `magpie.options.set()`，序列化由 magpie 做，所以原文里的换行会原样落进 `plugins.json` 的 `system_prompt`。

## 与上游的差别

| 项 | 上游 | 这里 |
| --- | --- | --- |
| 选项编辑 | magpie 通用 JSON 编辑器，手写 `\n` | 插件自带页面，纯文本 textarea |
| `override` 开关 | 有：agent 有提示词时不注入 | 移除：始终注入，只选前后 |
| 注入逻辑 | — | 与上游相同，只是不再看 `override` |

## 与上游同时安装

两个包的短名不同（`system-prompt-raw` 与 `system-prompt`），可以并存，但**同时开启会注入两遍**。装这个之前先把 `@magpie-community/middleware-system-prompt` 移除或关掉。

## 许可

MIT，中间件代码来自 magpie-community/plugins。
