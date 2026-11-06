// Settings page for middleware-system-prompt-raw.
// The textarea holds the prompt as plain text. magpie.options.set() serialises
// it, so the user never writes JSON or escapes a newline themselves.

const $ = (id) => document.getElementById(id)
const ta = $("prompt")
const cb = $("override")
const sel = $("position")
const agents = $("agents")
const models = $("models")
const statusEl = $("status")
const countEl = $("count")
const dirtyEl = $("dirty")

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
  cb.checked = !!base.override
  sel.value = base.position === "prepend" ? "prepend" : "append"
  agents.value = Array.isArray(base.agents) ? base.agents.join(", ") : ""
  models.value = Array.isArray(base.models) ? base.models.join(", ") : ""
  refreshMeta()
}

function collect() {
  // Everything from the page: prompt text goes in untrimmed, exactly as pasted.
  const o = { ...base, system_prompt: ta.value, override: cb.checked, position: sel.value }
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
    statusEl.textContent = "已保存，下一个请求起生效"
    statusEl.dataset.state = "ok"
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
