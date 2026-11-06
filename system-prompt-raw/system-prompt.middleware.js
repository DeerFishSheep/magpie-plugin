// New API's 系统提示词 as magpie gateway middleware, in each agent API's own
// place for it: Anthropic's system, Chat's first system or developer message,
// Responses' instructions, Gemini's systemInstruction.
//
//   {"system_prompt": "Answer in English.", "position": "append",
//    "agents": [], "models": []}
//
// A request with no system prompt is given this one. One that has its own gets
// this one added too: after its prompt ("append", the default, which keeps a
// prompt cache on the agent's own prompt) or before it ("prepend").
// agents and models, when given, are the only agents and model name prefixes
// it applies to.
//
// Fork of @magpie-community/middleware-system-prompt: the "override" switch is
// gone. The prompt is always added; only the position is chosen.

export function onRequest(body, ctx) {
  const o = ctx.options || {}
  const prompt = typeof o.system_prompt === "string" ? o.system_prompt : ""
  if (!prompt) return
  if (Array.isArray(o.agents) && o.agents.length && !o.agents.includes(ctx.agent)) return
  if (Array.isArray(o.models) && o.models.length && !o.models.some((m) => typeof m === "string" && String(body.model ?? ctx.model ?? "").startsWith(m))) return
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
