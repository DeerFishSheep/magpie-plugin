# middleware-system-prompt-raw

`@magpie-community/middleware-system-prompt` 的本地改版：自带设置页，提示词按**原文**粘贴，不用写 JSON，也不用把换行转成 `\n`。可以存多套，各自开关，各自绑定模型。

## 装

```sh
git clone https://github.com/DeerFishSheep/magpie-plugin.git ~/magpie-plugin
magpie plugin add ~/magpie-plugin/system-prompt-raw
```

文件夹就地加载，不经过 npm。

## 用

侧边栏 → 插件 → 「系统提示词」。

1. 点 ＋ 新建，填名称，把提示词原文粘进大输入框（markdown、多行、引号、反引号都行）。
2. 右上角开关决定它是否生效，**关掉只是不注入，不会删掉**。
3. 「绑定模型」留空 = 所有模型可用；填了就只对名字含这些词的模型生效。
4. 点「保存」。顶部标签点一下切换编辑，实心的表示已启用，虚线的表示已停用。

## 生效规则

1. 停用的提示词完全不参与判断，也不会占住任何模型。
2. 绑定了模型的提示词只对名字包含任一关键词的模型生效，一个模型里可以匹配多个关键词（逗号分隔，中英文逗号都行）。
3. 没绑定模型的提示词是通用的：对所有没被别的提示词占住的模型生效。
4. 请求命中任何绑定的提示词时，只注入命中的那些，通用的全部让开；没命中时，注入全部通用的。
5. 同时命中多套，按列表顺序用空行拼成一段，在同一个位置插入一次。
6. 插入位置是插件级设置，全部提示词共用。

用户例子：A、C 不绑定，B→B1，D→D1、D2。

| 请求模型 | 注入 |
| --- | --- |
| B1 | B |
| D1、D2 | D |
| 其它任何模型 | A + C |

agent 自己的提示词始终保留，不会被丢弃。请求本身没有系统提示词时，直接用这段。

## 存储

全部在插件自己的选项里（`~/.config/magpie/plugins.json`）：

```json
{
  "position": "append",
  "agents": [],
  "presets": [
    { "name": "A", "text": "…", "enabled": true },
    { "name": "B", "text": "…", "enabled": true, "match": ["claude"] }
  ]
}
```

旧配置（只有 `system_prompt` 没有 `presets`）会自动收编成一套名为「默认」的提示词，中间件也保留对它的兼容，升级不丢内容。

## 与上游的差别

| 项 | 上游 | 这里 |
| --- | --- | --- |
| 选项编辑 | magpie 通用 JSON 编辑器，手写 `\n` | 自带页面，纯文本 textarea |
| 套数 | 一套 | 多套，各自启用/停用 |
| 模型过滤 | `models` 只作用于全局 | 每套单独绑定，并相互让开 |
| `override` 开关 | 有：agent 有提示词时不注入 | 移除：始终注入，只选前后 |
| 注入逻辑 | — | 与上游相同，只是不看 `override` |

## 与上游同时安装

两个包短名不同（`system-prompt-raw` 与 `system-prompt`），可以并存，但**同时开启会注入两遍**。装这个之前先把 `@magpie-community/middleware-system-prompt` 移除或关掉。

## 许可

MIT，中间件代码来自 magpie-community/plugins。
