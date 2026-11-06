// New API's 系统提示词 as magpie gateway middleware, with several named
// prompts instead of one.
//
//   {"position": "append",
//    "agents": [],
//    "presets": [
//      {"name": "A", "text": "…", "enabled": true},
//      {"name": "B", "text": "…", "enabled": true, "match": ["B1"]}
//    ]}
//
// Rules, in order:
//   1. A preset with enabled === false is ignored completely.
//   2. A preset with "match" is specific: it applies only to a model whose name
//      contains one of its keywords.
//   3. A preset without "match" is general: it applies to every model that no
//      specific preset claims.
//   4. A request that hits any specific preset gets only those; otherwise it
//      gets every general one.
//   5. The picked presets are joined with a blank line and inserted once, at
//      "position" ("append" by default, keeping an agent's prompt cache).
//
// agents, when given, limits the whole thing to those agent ids.
//
// Fork of @magpie-community/middleware-system-prompt: no "override" switch
// (always added), and per-preset model binding instead of one global filter.

export function onRequest(body, ctx) {
  const o = ctx.options || {}
  const items = presets(o)
  if (!items.length) return
  if (Array.isArray(o.agents) && o.agents.length && !o.agents.includes(ctx.agent)) return

  const model = String(body.model ?? ctx.model ?? "")
  const specific = []
  const general = []
  for (const p of items) {
    if (!p.text) continue
    if (p.match.length) {
      if (p.match.some((k) => model.includes(k))) specific.push(p)
    } else {
      general.push(p)
    }
  }

  const picked = specific.length ? specific : general
  if (!picked.length) return

  const prompt = picked.map((p) => p.text).join("\n\n")
  const before = o.position === "prepend"
  switch (ctx.protocol) {
    case "anthropic":
      return anthropic(body, prompt, before)
    case "chat":
      return chat(body, prompt, before)
    case "responses":
      return responses(body, prompt, before)
    case "gemini":
      return gemini(body, prompt, before)
  }
}

// Enabled presets with text, in list order. Falls back to the single
// system_prompt of older options so an upgrade loses nothing.
function presets(o) {
  if (Array.isArray(o.presets) && o.presets.length) {
    const out = []
    for (const raw of o.presets) {
      if (!raw || typeof raw !== "object") continue
      if (raw.enabled === false) continue
      const text = typeof raw.text === "string" ? raw.text : ""
      const match = Array.isArray(raw.match) ? raw.match.filter((m) => typeof m === "string" && m) : []
      out.push({ text, match })
    }
    return out
  }
  if (typeof o.system_prompt === "string" && o.system_prompt) {
    return [{ text: o.system_prompt, match: [] }]
  }
  return []
}

function anthropic(body, prompt, before) {
  const s = body.system
  if (s === undefined || s === null || s === "" || (Array.isArray(s) && !s.length)) {
    body.system = prompt
    return body
  }
  if (typeof s === "string") body.system = before ? prompt + "\n" + s : s + "\n" + prompt
  else if (Array.isArray(s)) {
    const block = { type: "text", text: prompt }
    if (before) s.unshift(block)
    else s.push(block)
  } else return
  return body
}

function chat(body, prompt, before) {
  if (!Array.isArray(body.messages)) return
  const first = body.messages[0]
  if (!first || (first.role !== "system" && first.role !== "developer")) {
    body.messages.unshift({ role: "system", content: prompt })
    return body
  }
  if (typeof first.content === "string") first.content = before ? prompt + "\n" + first.content : first.content + "\n" + prompt
  else if (Array.isArray(first.content)) {
    const part = { type: "text", text: prompt }
    if (before) first.content.unshift(part)
    else first.content.push(part)
  } else return
  return body
}

function responses(body, prompt, before) {
  const s = body.instructions
  if (typeof s !== "string" || !s) {
    body.instructions = prompt
    return body
  }
  body.instructions = before ? prompt + "\n" + s : s + "\n" + prompt
  return body
}

function gemini(body, prompt, before) {
  const key = body.system_instruction && !body.systemInstruction ? "system_instruction" : "systemInstruction"
  const s = body[key]
  if (!s || !Array.isArray(s.parts) || !s.parts.length) {
    body[key] = { parts: [{ text: prompt }] }
    return body
  }
  if (before) s.parts.unshift({ text: prompt })
  else s.parts.push({ text: prompt })
  return body
}
