import "server-only";
import { AdvisorError, record } from "./contracts";
import type { ProviderConfig } from "./config.server";

type Item = Record<string, unknown>;
const fail = (): never => { throw new AdvisorError("provider_failed"); };
function outputText(content: unknown, style: "responses" | "chat") {
  if (style === "chat" && (typeof content === "string" || content === null)) return content ?? "";
  if (!Array.isArray(content) || content.length > 16) return fail();
  return content.map(part => {
    if (!record(part) || typeof part.text !== "string" ||
      (part.type !== "output_text" && !(style === "chat" && part.type === "text"))) return fail();
    return part.text;
  }).join("");
}

/** Validates the entire provider turn before any operational read executes.
 * Only text, opaque Responses reasoning and named function calls are admitted.
 * Provider/source text never creates a capability or an evidence reference. */
export function providerItems(config: ProviderConfig, output: unknown): Item[] {
  if (!record(output)) return fail();
  let items: unknown[];
  if (config.apiStyle === "chat_completions") {
    if (!Array.isArray(output.choices) || output.choices.length !== 1) return fail();
    const choice = output.choices[0];
    if (!record(choice) || choice.index !== 0 || !record(choice.message)) return fail();
    const message = choice.message;
    if (message.role !== "assistant" || (message.refusal !== undefined && message.refusal !== null)) return fail();
    const text = outputText(message.content, "chat");
    const calls = message.tool_calls;
    if (calls !== undefined && (!Array.isArray(calls) || calls.length === 0 || calls.length > 8)) return fail();
    if (choice.finish_reason !== (calls ? "tool_calls" : "stop")) return fail();
    items = text ? [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] : [];
    for (const call of (calls ?? []) as unknown[]) {
      if (!record(call) || call.type !== "function" || !record(call.function)) return fail();
      items.push({ type: "function_call", call_id: call.id, name: call.function.name, arguments: call.function.arguments });
    }
  } else {
    if (!Array.isArray(output.output) || ("status" in output && output.status !== "completed")) return fail();
    items = output.output;
  }
  if (items.length === 0 || items.length > 16) return fail();
  const identities = new Set<string>();
  let textLength = 0;
  for (const item of items) {
    if (!record(item)) return fail();
    if (item.type === "function_call") {
      if (typeof item.call_id !== "string" || !item.call_id.trim() || item.call_id.length > 200 ||
        /[\u0000-\u0020\u007f]/.test(item.call_id) || identities.has(item.call_id) ||
        typeof item.name !== "string" || !item.name || item.name.length > 128 ||
        typeof item.arguments !== "string" || item.arguments.length > 20000) return fail();
      identities.add(item.call_id);
    } else if (item.type === "message") {
      if ((item.role !== undefined && item.role !== "assistant") ||
        (item.status !== undefined && item.status !== "completed")) return fail();
      textLength += outputText(item.content, "responses").length;
    } else if (item.type === "reasoning") {
      if (!Array.isArray(item.summary) || item.summary.length > 16 || typeof item.id !== "string" ||
        !item.id || item.id.length > 200 || (item.encrypted_content !== undefined && typeof item.encrypted_content !== "string")) return fail();
    } else return fail();
  }
  if (textLength > 12000) throw new AdvisorError("limit");
  return items as Item[];
}

function chatMessages(input: readonly unknown[]): Item[] {
  const messages: Item[] = [];
  for (const item of input) {
    if (!record(item)) return fail();
    if ((item.role === "user" || item.role === "assistant") && typeof item.content === "string") {
      messages.push({ role: item.role, content: item.content });
    } else if (item.type === "message") {
      messages.push({ role: "assistant", content: outputText(item.content, "responses") });
    } else if (item.type === "function_call") {
      const call = { id: item.call_id, type: "function", function: { name: item.name, arguments: item.arguments } };
      const last = messages.at(-1);
      // Consecutive calls from one validated turn share an assistant message;
      // their outputs follow afterwards, preserving causal round boundaries.
      if (last?.role === "assistant" && Array.isArray(last.tool_calls)) last.tool_calls.push(call);
      else messages.push({ role: "assistant", content: null, tool_calls: [call] });
    } else if (item.type === "function_call_output") {
      messages.push({ role: "tool", tool_call_id: item.call_id, content: item.output });
    } else return fail();
  }
  return messages;
}

/** One explicitly selected protocol, with no model guessing or fallback. */
export function providerBody(
  config: ProviderConfig,
  instructions: string,
  input: readonly unknown[],
  tools: readonly Item[],
): string {
  const body = config.apiStyle === "chat_completions"
    ? {
      model: config.model, store: false,
      messages: [{ role: "system", content: instructions }, ...chatMessages(input)],
      tools: tools.map(({ type, ...definition }) => ({ type, function: definition })),
      // Neon's unified catalog documents max_tokens. Do not send
      // parallel_tool_calls/reasoning/temperature: some models reject them.
      max_tokens: 4096,
    }
    : {
      model: config.model, store: false, include: ["reasoning.encrypted_content"],
      instructions, input, tools, parallel_tool_calls: false, max_output_tokens: 4096,
      ...(config.reasoningEffort ? { reasoning: { effort: config.reasoningEffort } } : {}),
    };
  const serialized = JSON.stringify(body);
  if (serialized.length > 262144) throw new AdvisorError("limit");
  return serialized;
}
