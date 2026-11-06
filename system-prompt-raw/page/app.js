// Settings page for middleware-system-prompt-raw.
// The textarea holds the prompt as plain text. magpie.options.set() serialises
// it, so the user never writes JSON or escapes a newline themselves.
//
// One select covers both upstream switches (override + position):
//   append / prepend  -> override true,  prompt added after / before the agent's own
//   off               -> override false, only used when the request has no prompt

const $ = (id) => document.getElementById(id)
const ta = $("prompt")
const sel = $("mode")
const agents = $("agents")
const models = $("models")
const statusEl = $("status")
const countEl = $("count")
const dirtyEl = $("dirty")

// Defaults match package.json: enabled and working the moment it is installed.
const DEFAULTS = { override: true, position: "append" }

let base = {}
let savedText = ""

const countLines = (s) => (s ? s.split(/\r\n|\r|\n/).length : 0)

function refreshMeta() {
  countEl.textContent = `${ta.value.length} 字 · ${countLines(ta.value)} 行`
  dirtyEl.textContent = ta.value === savedText ? "" : "未保存"
}

function splitList(v) {
  return v.split(",").map((s) => s.trim()).filter(Boolean)
}

function paint(o) {
  base = o && typeof o === "object" ? o : {}
  savedText = typeof base.system_prompt === "string" ? base.system_prompt : ""
  ta.value = savedText
  const over = base.override === undefined ? DEFAULTS.override : !!base.override
  const pos = base.position === "prepend" ? "prepend" : DEFAULTS.position
  sel.value = over ? pos : "off"
  agents.value = Array.isArray(base.agents) ? base.agents.join(", ") : ""
  models.value = Array.isArray(base.models) ? base.models.join(", ") : ""
  refreshMeta()
}

function collect() {
  // Prompt text goes in untrimmed, exactly as pasted.
  const mode = sel.value
  const o = {
    ...base,
    system_prompt: ta.value,
    override: mode !== "off",
    position: mode === "prepend" ? "prepend" : "append",
  }
  const a = splitList(agents.value)
  const m = splitList(models.value)
  if (a.length) o.agents = a
  else delete o.agents
  if (m.length) o.models = m
  else delete o.models
  return o
}

async function save() {
  statusEl.textContent = "保存中…"
  statusEl.dataset.state = ""
  try {
    const sent = collect()
    const returned = await magpie.options.set(sent)
    paint(returned && typeof returned === "object" ? returned : sent)
    if (!sent.system_prompt) {
      statusEl.textContent = "已保存，但提示词是空的：不会注入任何内容"
      statusEl.dataset.state = "err"
    } else {
      statusEl.textContent = "已保存，下一个请求起生效"
      statusEl.dataset.state = "ok"
    }
  } catch (err) {
    statusEl.textContent = "保存失败：" + (err && err.message ? err.message : String(err))
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
  ta.addEventListener("input", refreshMeta)
  $("save").addEventListener("click", save)
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault()
      save()
    }
  })
}

main()
