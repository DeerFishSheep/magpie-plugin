# middleware-system-prompt-raw

`@magpie-community/middleware-system-prompt` 的本地改版：自带设置页，提示词按**原文**粘贴，不用写 JSON，也不用把换行转成 `\n`。可以存多套，点一下切换启用。

## 装

```sh
git clone https://github.com/DeerFishSheep/magpie-plugin.git ~/magpie-plugin
magpie plugin add ~/magpie-plugin/system-prompt-raw
```

文件夹就地加载，不经过 npm。

## 用

侧边栏 → 插件 → 「系统提示词」。

1. 点 ＋ 新建，填名称，把提示词原文粘进大输入框（markdown、多行、引号、反引号都行）。
2. 「插入位置」二选一，默认**追加在后面**（保持 agent 提示词缓存有效）。
3. 「筛选生效范围」可选，填 agents / 模型前缀白名单，留空 = 全部。
4. 点「保存并启用」。
5. 之后点上方任意名字即可切换，切换即生效；选中的那套再点进去就是编辑，改完再保存。

agent 自己的提示词始终保留，不会被丢弃。请求本身没有系统提示词时，直接用你这段。

删除当前启用的一套会同时停止注入（`system_prompt` 清空）；删除别的套不影响正在注入的那套。

## 存储

全部存在插件自己的选项里（`~/.config/magpie/plugins.json`）：

```json
{
  "active": "写代码",
  "system_prompt": "实际注入的文本",
  "position": "append",
  "presets": [
    { "name": "写代码", "text": "…", "position": "append" },
    { "name": "写文案", "text": "…", "position": "prepend", "models": ["gpt-5"] }
  ]
}
```

`active` 指向哪套，`system_prompt` 就是那套的 `text`。中间件只读顶层字段，所以改 `presets` 不会影响注入。

旧配置（只有 `system_prompt` 没有 `presets`）会在页面第一次打开时自动收编成一套名为「默认」的提示词，不丢内容。

## 与上游的差别

| 项 | 上游 | 这里 |
| --- | --- | --- |
| 选项编辑 | magpie 通用 JSON 编辑器，手写 `\n` | 自带页面，纯文本 textarea |
| 多套切换 | 无 | 有，点名字切换 |
| `override` 开关 | 有：agent 有提示词时不注入 | 移除：始终注入，只选前后 |
| 注入逻辑 | — | 与上游相同，只是不再看 `override` |

## 与上游同时安装

两个包短名不同（`system-prompt-raw` 与 `system-prompt`），可以并存，但**同时开启会注入两遍**。装这个之前先把 `@magpie-community/middleware-system-prompt` 移除或关掉。

## 许可

MIT，中间件代码来自 magpie-community/plugins。
