// Deterministic guardrail (pillar 3). Instructions guide the model; this hook ENFORCES.
//  - golden dataset: always DENY (agents must never see expected answers)
//  - docs/business-rules/, docs/contracts/: editing needs a human ("ask")
//  - every tool call is appended to .audit/agent-tool-calls.jsonl (tool and target paths only, never contents)
// Works as a Claude Code PreToolUse hook (.claude/settings.json) and as a VS Code agent hook
// (.github/hooks/guardrails.json). Hook payloads differ by harness, so strings are collected generically.
const fs = require('node:fs');
const path = require('node:path');

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  raw = raw.replace(/^﻿/, '');
  let call = {};
  try {
    call = JSON.parse(raw || '{}');
  } catch {
    // Unparseable payload: the raw text is still scanned below, so a parse failure can never let a golden access through.
  }
  const tool = String(call.tool_name ?? call.toolName ?? call.tool ?? 'unknown');
  const input = call.tool_input ?? call.toolInput ?? call.input ?? {};

  // Only look at fields that say WHERE a tool acts (paths, commands, patterns), never at file contents:
  // otherwise editing a doc that merely mentions the golden repo would be blocked.
  const TARGET_KEYS = /^(file_?path|path|paths|notebook_?path|command|cmd|pattern|glob|cwd|directory|dir|url|uri|files?)$/i;
  const strings = [];
  const collect = (v, key) => {
    if (typeof v === 'string') {
      if (!key || TARGET_KEYS.test(key)) strings.push(v);
    } else if (Array.isArray(v)) v.forEach((x) => collect(x, key));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => collect(x, k));
  };
  collect(input);
  // If the payload could not be parsed we cannot tell targets from contents, so match the whole text (fail closed).
  if (Object.keys(call).length === 0) strings.push(raw);
  const norm = (s) => s.replace(/\\+/g, '/');

  const touchesGolden = strings.some((s) => /golden-dataset|\.golden-data/i.test(norm(s)));
  const touchesOwned = strings.some((s) => /docs\/(business-rules|contracts)\//.test(norm(s)));
  const readOnlyTool = /^(read|grep|glob|search|view|list)/i.test(tool) || /search|read_file|list_dir/i.test(tool);

  // Audit trail: tool name and short target hints only.
  try {
    const dir = path.join(process.cwd(), '.audit');
    fs.mkdirSync(dir, { recursive: true });
    const targets = strings.map((s) => s.slice(0, 120)).slice(0, 3);
    fs.appendFileSync(path.join(dir, 'agent-tool-calls.jsonl'), JSON.stringify({ ts: new Date().toISOString(), tool, targets }) + '\n');
  } catch {
    // never block work because the audit log could not be written
  }

  const decide = (permissionDecision, permissionDecisionReason) => {
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason } }),
    );
  };

  if (touchesGolden) {
    decide('deny', 'The golden dataset is out of reach for agents (AGENTS.md, pillar 2). Report case IDs only.');
  } else if (touchesOwned && !readOnlyTool) {
    decide('ask', 'docs/business-rules/ and docs/contracts/ are human-owned (CODEOWNERS). A person must approve this change.');
  }
});
