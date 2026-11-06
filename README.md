# magpie-plugin

自用的 [magpie](https://usemagpie.ai) 插件集合。每个插件一个子目录。

| 目录 | 插件 | 说明 |
| --- | --- | --- |
| `system-prompt-raw/` | `middleware-system-prompt-raw` | 系统提示词中间件（fork 自 `@magpie-community/middleware-system-prompt`），多一个纯文本设置页：提示词按原文粘贴，不用写 JSON、不用把换行转成 `\n`。 |

## 安装

magpie 的 git 安装只认仓库根目录的插件，这里的插件在子目录里，所以先 clone 再按文件夹加载：

```sh
git clone https://github.com/DeerFishSheep/magpie-plugin.git ~/magpie-plugin
magpie plugin add ~/magpie-plugin/system-prompt-raw
```

文件夹就地加载，之后 `git pull` 更新，重启宿主或关掉再打开插件即可生效。

## 注意

- 这些插件与同名社区插件**不要同时开**，会重复生效。
- 中间件跑在 magpie 网关的 moejs 里，没有 Node API、没有 fs、没有网络，改的时候别指望能读文件。
