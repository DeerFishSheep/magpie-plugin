// Settings page for middleware-system-prompt-raw.
//
// Storage lives in the plugin's own options (plugins.json):
//   {
//     "position": "append",
//     "agents": ["claude"],
//     "presets": [
//       { "name": "A", "text": "…", "enabled": true },
//       { "name": "B", "text": "…", "enabled": true, "match": ["claude"] }
//     ]
//   }
//
// A preset with "match" only applies to models whose name contains one of its
// keywords; a preset without it applies to every model no other preset claims.
// A preset with enabled === false is ignored entirely.
//
// The textarea is only a buffer: magpie.options.set() serialises it, so the
// user never writes JSON or escapes a newline.

const $ = (id) => document.getElementById(id)
const ta = $("prompt")
const nameEl = $("name")
const enabledEl = $("enabled")
const enabledLabel = $("enabledLabel")
const matchEl = $("match")
const matchHint = $("matchHint")
const posEl = $("position")
const segEl = $("seg")
const posHint = $("posHint")
const agents = $("agents")
const statusEl = $("status")
const countEl = $("count")
const dirtyEl = $("dirty")
const railEl = $("rail")

const HINTS = {
  append: "保持 agent 提示词缓存有效，通常选这个。",
  prepend: "放在 agent 自己的提示词之前，等于每轮重读整段。",
}

let opts = {} // full options object, source of truth
let selected = null // preset name loaded in the editor, null = unsaved new one
let dirty = false

const countLines = (s) => (s ? s.split(/\r\n|\r|\n/).length : 0)
const presets = () => (Array.isArray(opts.presets) ? opts.presets : [])
const splitList = (v) => v.split(/[,，]/).map((s) => s.trim()).filter(Boolean)

function paintSeg(value) {
  const v = value === "prepend" ? "prepend" : "append"
  posEl.value = v
  for (const b of segEl.querySelectorAll("button")) b.classList.toggle("on", b.dataset.v === v)
  posHint.textContent = HINTS[v]
}

function refreshMeta() {
  countEl.textContent = `${ta.value.length} 字 · ${countLines(ta.value)} 行`
  dirtyEl.textContent = dirty ? "未保存" : ""
}

function refreshSwitch() {
  const on = enabledEl.checked
  enabledLabel.textContent = on ? "已启用" : "已停用"
  enabledLabel.classList.toggle("off", !on)
}

function refreshMatchHint() {
  const n = splitList(matchEl.value).length
  matchHint.textContent = n
    ? `只对名字含这些词的模型生效；其它提示词会被这些模型让开。`
    : "留空表示不绑定：所有没被别的提示词占用的模型都会用上它。"
}

function markDirty() {
  dirty = true
  refreshMeta()
}

function renderRail() {
  railEl.textContent = ""
  const list = presets()
  if (!list.length) {
    const hint = document.createElement("span")
    hint.className = "rail-empty"
    hint.textContent = "还没有提示词，点右边 ＋ 新建"
    railEl.appendChild(hint)
  } else {
    for (const p of list) {
      const b = document.createElement("button")
      b.type = "button"
      const on = p.enabled !== false
      b.className = "chip" + (on ? " on" : " off") + (p.name === selected ? " sel" : "")
      b.textContent = (on ? "" : "○ ") + p.name
      const bound = Array.isArray(p.match) && p.match.length
      b.title = [
        on ? "已启用" : "已停用",
        bound ? "绑定：" + p.match.join(", ") : "所有模型",
        p.name === selected ? "正在编辑" : "点击编辑",
      ].join(" · ")
      b.addEventListener("click", () => activate(p.name))
      railEl.appendChild(b)
    }
  }
  const add = document.createElement("button")
  add.type = "button"
  add.className = "add"
  add.textContent = "＋"
  add.title = "新建一套"
  add.addEventListener("click", newPreset)
  railEl.appendChild(add)
}

function fillEditor(p) {
  selected = p.name
  nameEl.value = p.name
  ta.value = typeof p.text === "string" ? p.text : ""
  enabledEl.checked = p.enabled !== false
  matchEl.value = Array.isArray(p.match) ? p.match.join(", ") : ""
  agents.value = Array.isArray(opts.agents) ? opts.agents.join(", ") : ""
  paintSeg(opts.position)
  refreshSwitch()
  refreshMatchHint()
  dirty = false
  refreshMeta()
  renderRail()
}

function clearEditor() {
  selected = null
  nameEl.value = ""
  ta.value = ""
  enabledEl.checked = true
  matchEl.value = ""
  agents.value = Array.isArray(opts.agents) ? opts.agents.join(", ") : ""
  paintSeg(opts.position)
  refreshSwitch()
  refreshMatchHint()
  dirty = false
  refreshMeta()
  renderRail()
}

function paint(o) {
  opts = o && typeof o === "object" ? o : {}
  let list = presets()

  // Older options (a single system_prompt, or one written by hand) become the
  // first preset so nothing is lost.
  if (!list.length && typeof opts.system_prompt === "string" && opts.system_prompt) {
    list = [{ name: opts.active || "默认", text: opts.system_prompt, enabled: true }]
    opts = { ...opts, presets: list }
  }

  if (list.length) fillEditor(list[0])
  else clearEditor()
}

// Write the editor into options. silent = no status message (before switching).
async function save({ silent = false, announce } = {}) {
  if (!silent) {
    statusEl.textContent = "保存中…"
    statusEl.dataset.state = ""
  }

  const name = nameEl.value.trim()
  if (!name) {
    statusEl.textContent = "先给它起个名字"
    statusEl.dataset.state = "err"
    nameEl.focus()
    return false
  }

  const list = presets().map((p) => ({ ...p }))
  const idx = selected === null ? -1 : list.findIndex((p) => p.name === selected)

  if (list.some((p, i) => p.name === name && i !== idx)) {
    statusEl.textContent = `已经有一套叫「${name}」了，换个名字`
    statusEl.dataset.state = "err"
    return false
  }

  const entry = { name, text: ta.value, enabled: enabledEl.checked }
  const match = splitList(matchEl.value)
  if (match.length) entry.match = match

  if (idx >= 0) list[idx] = entry
  else list.push(entry)

  const pending = { ...opts, presets: list, position: posEl.value === "prepend" ? "prepend" : "append" }
  const ag = splitList(agents.value)
  if (ag.length) pending.agents = ag
  else delete pending.agents
  // Fields of the single-prompt version: kept out of the way once presets exist.
  delete pending.system_prompt
  delete pending.active
  delete pending.override
  delete pending.models

  try {
    const returned = await magpie.options.set(pending)
    opts = returned && typeof returned === "object" ? returned : pending
    if (idx >= 0) {
      selected = name
      dirty = false
      refreshMeta()
      renderRail()
    } else {
      fillEditor({ ...entry, text: entry.text })
    }
    if (!silent) {
      if (!entry.text) {
        statusEl.textContent = `已保存「${name}」，但正文是空的：不会注入`
        statusEl.dataset.state = "err"
      } else if (!entry.enabled) {
        statusEl.textContent = `已保存「${name}」，当前是停用状态`
        statusEl.dataset.state = ""
      } else {
        statusEl.textContent = announce || `已保存「${name}」`
        statusEl.dataset.state = "ok"
      }
    }
    return true
  } catch (err) {
    statusEl.textContent = "保存失败：" + (err && err.message ? err.message : String(err))
    statusEl.dataset.state = "err"
    return false
  }
}

// Clicking a name loads it for editing. Unsaved edits are written back first.
async function activate(name) {
  if (name === selected && !dirty) return
  if (dirty) {
    const ok = await save({ silent: true })
    if (!ok) {
      statusEl.textContent = "当前修改没能保存，先处理它再切换"
      statusEl.dataset.state = "err"
      return
    }
  }
  const p = presets().find((x) => x.name === name)
  if (!p || p.name === selected) return
  fillEditor(p)
  statusEl.textContent = ""
  statusEl.dataset.state = ""
}

async function toggleEnabled() {
  refreshSwitch()
  if (selected === null) return
  const p = presets().find((x) => x.name === selected)
  if (!p) return
  // Toggling the switch alone is a save: it must take effect immediately.
  const list = presets().map((x) => ({ ...x }))
  const idx = list.findIndex((x) => x.name === selected)
  if (idx < 0) return
  list[idx] = { ...list[idx], enabled: enabledEl.checked }
  const pending = { ...opts, presets: list }
  try {
    const returned = await magpie.options.set(pending)
    opts = returned && typeof returned === "object" ? returned : pending
    renderRail()
    statusEl.textContent = enabledEl.checked ? `已启用「${selected}」` : `已停用「${selected}」`
    statusEl.dataset.state = enabledEl.checked ? "ok" : ""
  } catch (err) {
    statusEl.textContent = "切换失败：" + (err && err.message ? err.message : String(err))
    statusEl.dataset.state = "err"
  }
}

async function newPreset() {
  if (dirty) {
    const ok = await save({ silent: true })
    if (!ok) {
      statusEl.textContent = "当前修改没能保存，先处理它再新建"
      statusEl.dataset.state = "err"
      return
    }
  }
  clearEditor()
  statusEl.textContent = ""
  statusEl.dataset.state = ""
  nameEl.focus()
}

async function remove() {
  if (selected === null) {
    statusEl.textContent = "先选中一套要删除的"
    statusEl.dataset.state = "err"
    return
  }
  const name = selected
  const list = presets().filter((p) => p.name !== name)
  const pending = { ...opts, presets: list }
  try {
    const returned = await magpie.options.set(pending)
    opts = returned && typeof returned === "object" ? returned : pending
    if (list.length) fillEditor(list[0])
    else clearEditor()
    statusEl.textContent = `已删除「${name}」`
    statusEl.dataset.state = "ok"
  } catch (err) {
    statusEl.textContent = "删除失败：" + (err && err.message ? err.message : String(err))
    statusEl.dataset.state = "err"
  }
}

async function main() {
  await magpie.ready
  try {
    paint(await magpie.options.get())
  } catch (err) {
    statusEl.textContent = "读取选项失败：" + (err && err.message ? err.message : String(err))
    statusEl.dataset.state = "err"
  }

  ta.addEventListener("input", markDirty)
  nameEl.addEventListener("input", markDirty)
  matchEl.addEventListener("input", () => {
    refreshMatchHint()
    markDirty()
  })
  agents.addEventListener("input", markDirty)
  enabledEl.addEventListener("change", toggleEnabled)

  segEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]")
    if (!b) return
    paintSeg(b.dataset.v)
    markDirty()
  })

  $("save").addEventListener("click", () => save())
  $("del").addEventListener("click", remove)

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault()
      save()
    }
  })
}

main()
