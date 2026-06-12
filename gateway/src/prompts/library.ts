/**
 * Prompt optimization library.
 *
 * Turns a raw user request into a model-specific, task-specific prompt.
 * Two layers compose:
 *   1. TASK layer  — a role + rubric tuned to the kind of work (coding, content…).
 *   2. MODEL layer — formatting each model is known to respond best to
 *                    (e.g. Claude favors explicit XML-tagged structure; GPT
 *                    favors numbered directives; Gemini favors a crisp brief).
 *
 * The result is returned as { system, user } so every provider gets the same
 * intent expressed in the dialect it handles best. This is deliberately
 * transparent and inspectable — the UI surfaces the transformed prompt so you
 * can see exactly what each model received.
 */

import type { ProviderId, TaskType } from "../config.js";

interface TaskProfile {
  role: string;
  directives: string[];
}

const TASK_PROFILES: Record<TaskType, TaskProfile> = {
  general: {
    role: "a precise, helpful assistant",
    directives: [
      "Answer the request directly and completely.",
      "Lead with the answer, then add only the context that earns its place.",
      "If the request is ambiguous, state the assumption you made and proceed.",
    ],
  },
  coding: {
    role: "a senior software engineer",
    directives: [
      "Return correct, runnable code with no placeholders.",
      "Briefly note key assumptions (language, version, environment).",
      "Prefer clarity over cleverness; handle the obvious edge cases.",
      "Put the code in a single fenced block, then a short explanation.",
    ],
  },
  content: {
    role: "an experienced copywriter",
    directives: [
      "Match the medium and audience implied by the request.",
      "Open with a strong, specific hook — no generic preamble.",
      "Keep the voice human and concrete; cut filler and clichés.",
      "Deliver the finished piece, not a description of it.",
    ],
  },
  research: {
    role: "a rigorous analyst",
    directives: [
      "Structure the answer so the key finding is visible at a glance.",
      "Distinguish what is well-established from what is uncertain.",
      "Be specific with facts; avoid vague hedging.",
      "Use a tight structure (short sections or a compact table) when it aids clarity.",
    ],
  },
  support: {
    role: "a calm, expert customer-support specialist",
    directives: [
      "Acknowledge the issue, then give a clear path to resolution.",
      "Be warm but efficient; respect the customer's time.",
      "Give concrete next steps the customer can act on immediately.",
      "Never invent policy; if something is unknown, say how it will be found out.",
    ],
  },
};

export interface OptimizedPrompt {
  system: string;
  user: string;
}

/** Build the model- and task-specific prompt from a raw request. */
export function optimize(
  provider: ProviderId,
  task: TaskType,
  request: string,
): OptimizedPrompt {
  const profile = TASK_PROFILES[task];
  const directives = profile.directives.map((d, i) => `${i + 1}. ${d}`).join("\n");

  const system =
    `You are ${profile.role}. Produce the best possible response to the user's request.\n\n` +
    `Operating principles:\n${directives}`;

  let user = request.trim();
  switch (provider) {
    case "anthropic":
      // Claude responds well to explicit, tagged structure.
      user =
        `<task>${task}</task>\n` +
        `<request>\n${request.trim()}\n</request>\n\n` +
        `Respond with only the deliverable the request asks for.`;
      break;
    case "openai":
      // GPT responds well to a labelled brief with explicit output expectations.
      user =
        `Task type: ${task}\n` +
        `Request: ${request.trim()}\n\n` +
        `Deliver the response directly, following the operating principles.`;
      break;
    case "gemini":
      // Gemini responds well to a crisp, minimal brief.
      user =
        `${request.trim()}\n\n` +
        `(Context: this is a ${task} task. Respond with the finished result only.)`;
      break;
  }

  return { system, user };
}
