// Settings page for middleware-system-prompt-raw.
//
// Storage lives in the plugin's own options (plugins.json):
//   {
//     "active": "写代码",              // which preset is injecting right now
//     "system_prompt": "…",           // the text the middleware actually reads
//     "position": "append",
//     "agents": [...], "models": [...],
//     "presets": [ { "name": "…", "text": "…", "position": "append" }, … ]
//   }
//
// The textarea is only a buffer: it holds plain text, magpie.options.set()
// serialises it, so the user never writes JSON or escapes a newline.

const $ = (id) => document.getElementById(id)
const ta = $("prompt")
const nameEl = $("name")
const posEl = $("position")
const segEl = $("seg")
const posHint = $("posHint")
const agents = $("agents")
const models = $("models")
const statusEl = $("status")
const countEl = $("count")
const dirtyEl = $("dirty")
const chipsEl = $("chips")

const HINTS = {
  append: "保持 agent 提示词缓存有效，通常选这个。",
  prepend: "放在 agent 自己的提示词之前，会让她每轮重读整段。",
}

let opts = {} // full options object, source of truth
let selected = null // preset name loaded in the editor, null = unsaved new one
let dirty = false

const countLines = (s) => (s ? s.split(/\r\n|\r|\n/).length : 0)
const presets = () => (Array.isArray(opts.presets) ? opts.presets : [])

function paintSeg(value) {
  const v = value === "prepend" ? "prepend" : "append"
  posEl.value = v
  for (const b of segEl.querySelectorAll("button")) {
    b.classList.toggle("on", b.dataset.v === v)
  }
  posHint.textContent = HINTS[v]
}

function refreshMeta() {
  countEl.textContent = `${ta.value.length} 字 · ${countLines(ta.value)} 行`
  dirtyEl.textContent = dirty ? "未保存" : ""
}

function markDirty() {
  dirty = true
  refreshMeta()
}

function splitList(v) {
  return v.split(",").map((s) => s.trim()).filter(Boolean)
}

function currentSettings() {
  const o = { position: posEl.value === "prepend" ? "prepend" : "append" }
  const a = splitList(agents.value)
  const m = splitList(models.value)
  if (a.length) o.agents = a
  if (m.length) o.models = m
  return o
}

function renderChips() {
  chipsEl.textContent = ""
  const list = presets()
  if (!list.length) {
    const hint = document.createElement("span")
    hint.className = "rail-empty"
    hint.textContent = "还没有保存的提示词"
    chipsEl.appendChild(hint)
    return
  }
  for (const p of list) {
    const b = document.createElement("button")
    b.type = "button"
    b.className = "chip" + (p.name === opts.active ? " on" : "")
    b.textContent = p.name
    b.title = p.name === opts.active ? `${p.name} · 正在注入` : p.name
    b.addEventListener("click", () => activate(p.name))
    chipsEl.appendChild(b)
  }
}

function fillEditor(p) {
  selected = p.name
  nameEl.value = p.name
  ta.value = typeof p.text === "string" ? p.text : ""
  paintSeg(p.position)
  agents.value = Array.isArray(p.agents) ? p.agents.join(", ") : ""
  models.value = Array.isArray(p.models) ? p.models.join(", ") : ""
  dirty = false
  refreshMeta()
}

function clearEditor() {
  selected = null
  nameEl.value = ""
  ta.value = ""
  paintSeg("append")
  agents.value = ""
  models.value = ""
  dirty = false
  refreshMeta()
}

function paint(o) {
  opts = o && typeof o === "object" ? o : {}
  let list = presets()

  // Older options (or one written by hand in the JSON editor) have text but no
  // presets: take it over as the first preset so nothing is lost.
  if (!list.length && typeof opts.system_prompt === "string" && opts.system_prompt) {
    const adopted = {
      name: opts.active || "默认",
      text: opts.system_prompt,
      ...(opts.position === "prepend" ? { position: "prepend" } : {}),
      ...(Array.isArray(opts.agents) && opts.agents.length ? { agents: opts.agents } : {}),
      ...(Array.isArray(opts.models) && opts.models.length ? { models: opts.models } : {}),
    }
    list = [adopted]
    opts = { ...opts, presets: list, active: adopted.name }
  }

  const target = list.find((p) => p.name === opts.active) || list[0]
  if (target) fillEditor(target)
  else clearEditor()
  renderChips()
}

// Write the editor to options. silent = no status message (used before switching).
async function save({ silent = false, announce } = {}) {
  if (!silent) {
    statusEl.textContent = "保存中…"
    statusEl.dataset.state = ""
  }

  const name = nameEl.value.trim()
  const text = ta.value
  const settings = currentSettings()
  const list = presets().map((p) => ({ ...p }))

  let idx = selected === null ? -1 : list.findIndex((p) => p.name === selected)

  if (!name && idx < 0) {
    statusEl.textContent = "先给它起个名字"
    statusEl.dataset.state = "err"
    nameEl.focus()
    return false
  }

  // A new preset must not silently overwrite an existing one, and renaming must
  // not collide with another. Both are caught here.
  if (name && list.some((p, i) => p.name === name && i !== idx)) {
    statusEl.textContent = `已经有一套叫「${name}」了，换个名字`
    statusEl.dataset.state = "err"
    return false
  }

  const entry = {
    name,
    text,
    ...(settings.position === "prepend" ? { position: "prepend" } : {}),
    ...(settings.agents ? { agents: settings.agents } : {}),
    ...(settings.models ? { models: settings.models } : {}),
  }
  if (idx >= 0) list[idx] = entry
  else list.push(entry)

  const pending = {
    ...opts,
    active: name,
    system_prompt: text,
    ...settings,
    presets: list,
  }
  delete pending.override

  try {
    const returned = await magpie.options.set(pending)
    opts = returned && typeof returned === "object" ? returned : pending
    selected = name
    dirty = false
    refreshMeta()
    renderChips()
    if (!silent) {
      if (!text) {
        statusEl.textContent = "已保存，但提示词是空的：不会注入任何内容"
        statusEl.dataset.state = "err"
      } else {
        statusEl.textContent = announce || `已保存并启用「${name}」`
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

// Switching keeps unsaved edits: they are written back to the preset being left.
async function activate(name) {
  if (name === selected && !dirty && name === opts.active) return
  if (dirty) {
    const ok = await save({ silent: true })
    if (!ok) {
      statusEl.textContent = "当前修改没能保存，先处理它再切换"
      statusEl.dataset.state = "err"
      return
    }
  }
  const p = presets().find((x) => x.name === name)
  if (!p) return
  fillEditor(p)
  const ok = await save({ silent: true })
  if (!ok) return
  statusEl.textContent = `已启用「${name}」`
  statusEl.dataset.state = "ok"
}

async function remove() {
  if (selected === null) {
    statusEl.textContent = "先选中一套要删除的"
    statusEl.dataset.state = "err"
    return
  }
  const name = selected
  const list = presets().filter((p) => p.name !== name)
  const wasActive = opts.active === name
  const pending = { ...opts, presets: list }
  // Deleting the preset that was injecting: hand over to the next one so the
  // plugin is never left in a "nothing injected" state.
  const next = list[0]
  if (wasActive) {
    pending.active = next ? next.name : ""
    pending.system_prompt = next ? (next.text || "") : ""
    if (next) {
      pending.position = next.position === "prepend" ? "prepend" : "append"
      if (Array.isArray(next.agents) && next.agents.length) pending.agents = next.agents
      else delete pending.agents
      if (Array.isArray(next.models) && next.models.length) pending.models = next.models
      else delete pending.models
    }
  }
  try {
    const returned = await magpie.options.set(pending)
    opts = returned && typeof returned === "object" ? returned : pending
    if (next) fillEditor(next)
    else clearEditor()
    renderChips()
    statusEl.textContent = wasActive
      ? next
        ? `已删除「${name}」，改用「${next.name}」`
        : `已删除「${name}」，注入已停止`
      : `已删除「${name}」`
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
  agents.addEventListener("input", markDirty)
  models.addEventListener("input", markDirty)

  segEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]")
    if (!b) return
    paintSeg(b.dataset.v)
    markDirty()
  })

  $("save").addEventListener("click", () => save())
  $("del").addEventListener("click", remove)
  $("new").addEventListener("click", async () => {
    if (dirty) {
      const ok = await save({ silent: true })
      if (!ok) {
        statusEl.textContent = "当前修改没能保存，先处理它再新建"
        statusEl.dataset.state = "err"
        return
      }
    }
    clearEditor()
    renderChips()
    statusEl.textContent = ""
    statusEl.dataset.state = ""
    nameEl.focus()
  })

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault()
      save()
    }
  })
}

main()
