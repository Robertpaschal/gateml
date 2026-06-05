"use client";
import { useState } from "react";

type Lang = "python" | "typescript" | "go" | "ruby" | "php" | "curl";

const SNIPPETS: Record<Lang, { label: string; install: string; code: string }> = {
  python: {
    label: "Python",
    install: "pip install gateml openai",
    code: `from gateml import GateML

# Drop-in replacement for OpenAI()
client = GateML(api_key="gml-sk-live_...")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)

# Or use your existing OpenAI code unchanged:
from openai import OpenAI
from gateml import get_config

client = OpenAI(**get_config(api_key="gml-sk-live_..."))`,
  },
  typescript: {
    label: "TypeScript",
    install: "npm install gateml openai",
    code: `import { createGateMLClient } from 'gateml';

const client = await createGateMLClient({
  apiKey: 'gml-sk-live_...',
});

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.choices[0].message.content);

// Or wire it yourself:
import OpenAI from 'openai';
import { getConfig } from 'gateml';

const openai = new OpenAI(getConfig({ apiKey: 'gml-sk-live_...' }));`,
  },
  go: {
    label: "Go",
    install: "go get github.com/gateml/gateml-go",
    code: `package main

import (
    "context"
    "fmt"
    "github.com/gateml/gateml-go"
    "github.com/openai/openai-go"
)

func main() {
    client := gateml.NewClient("gml-sk-live_...")

    resp, _ := client.Chat.Completions.New(
        context.Background(),
        openai.ChatCompletionNewParams{
            Model: openai.F(openai.ChatModelGPT4o),
            Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
                openai.UserMessage("Hello!"),
            }),
        },
    )
    fmt.Println(resp.Choices[0].Message.Content)
}`,
  },
  ruby: {
    label: "Ruby",
    install: "gem install gateml ruby-openai",
    code: `require 'gateml'

# Drop-in replacement
client = GateML.client(api_key: 'gml-sk-live_...')

response = client.chat(
  parameters: {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }]
  }
)
puts response.dig('choices', 0, 'message', 'content')`,
  },
  php: {
    label: "PHP",
    install: "composer require gateml/gateml-php openai-php/client",
    code: `<?php

use GateML\\GateML;

$client = GateML::client('gml-sk-live_...');

$response = $client->chat()->create([
    'model'    => 'gpt-4o',
    'messages' => [
        ['role' => 'user', 'content' => 'Hello!'],
    ],
]);

echo $response->choices[0]->message->content;`,
  },
  curl: {
    label: "curl",
    install: "",
    code: `# Test mode (no real LLM call)
curl https://api.gateml.io/v1/chat/completions \\
  -H "Authorization: Bearer gml-sk-test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Live mode (real call, uses your stored provider key)
curl https://api.gateml.io/v1/chat/completions \\
  -H "Authorization: Bearer gml-sk-live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
  },
};

const LANGS: Lang[] = ["python", "typescript", "go", "ruby", "php", "curl"];

export function CodeShowcase() {
  const [lang, setLang] = useState<Lang>("python");
  const snap = SNIPPETS[lang];

  return (
    <section className="section">
      <div className="section-label">SDKs</div>
      <h2 className="section-title">Works with your language</h2>
      <p className="section-sub" style={{ marginBottom: 32 }}>
        Official SDKs for every major stack. Or use any OpenAI-compatible library — just swap the base URL.
      </p>

      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div className="sdk-tabs" style={{ background: "var(--surface)" }}>
          {LANGS.map(l => (
            <button key={l} className={`sdk-tab ${lang === l ? "active" : ""}`} onClick={() => setLang(l)}>
              {SNIPPETS[l].label}
            </button>
          ))}
        </div>

        {snap.install && (
          <div style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)", padding: "8px 24px", fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "var(--muted2)" }}>install</span>
            <code style={{ color: "var(--accent2)" }}>$ {snap.install}</code>
          </div>
        )}

        <div className="sdk-panel">{snap.code}</div>
      </div>
    </section>
  );
}
