"use client";
import { useState } from "react";

type Lang = "python" | "typescript" | "go" | "ruby" | "php" | "curl";

const LANGS: { id: Lang; label: string; install: string; code: string; anchor: string }[] = [
  {
    id: "python", label: "Python", anchor: "python",
    install: "pip install gateml openai",
    code: `# gateml is a thin wrapper — it extends the OpenAI client
from gateml import GateML

client = GateML(api_key="gml-sk-live_...")

# API is identical to OpenAI SDK
response = client.chat.completions.create(
    model="gpt-4o",  # or claude-sonnet-4-6, gemini-2.0-flash, ...
    messages=[{"role": "user", "content": "Summarize this contract."}],
    max_tokens=500,
)
print(response.choices[0].message.content)

# Use your existing OpenAI code unchanged:
from openai import OpenAI
from gateml import get_config

client = OpenAI(**get_config(api_key="gml-sk-live_..."))`,
  },
  {
    id: "typescript", label: "TypeScript", anchor: "typescript",
    install: "npm install gateml openai",
    code: `import { createGateMLClient, getConfig } from 'gateml';
import OpenAI from 'openai';

// Option A — async factory (loads openai dynamically)
const client = await createGateMLClient({ apiKey: 'gml-sk-live_...' });

// Option B — if you already have openai installed, sync:
const openai = new OpenAI(getConfig({ apiKey: 'gml-sk-live_...' }));

const response = await client.chat.completions.create({
  model: 'claude-sonnet-4-6',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.choices[0].message.content);`,
  },
  {
    id: "go", label: "Go", anchor: "go",
    install: "go get github.com/gateml/gateml-go",
    code: `package main

import (
    "context"
    "fmt"
    "github.com/gateml/gateml-go"
    "github.com/openai/openai-go"
)

func main() {
    // NewClient wraps openai.NewClient with the GateML base URL
    client := gateml.NewClient("gml-sk-live_...")

    resp, err := client.Chat.Completions.New(
        context.Background(),
        openai.ChatCompletionNewParams{
            Model: openai.F(openai.ChatModelGPT4o),
            Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
                openai.UserMessage("Hello!"),
            }),
        },
    )
    if err != nil { panic(err) }
    fmt.Println(resp.Choices[0].Message.Content)
}`,
  },
  {
    id: "ruby", label: "Ruby", anchor: "ruby",
    install: "gem install gateml ruby-openai",
    code: `require 'gateml'

# Returns a configured ruby-openai client
client = GateML.client(api_key: 'gml-sk-live_...')

response = client.chat(
  parameters: {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }],
    max_tokens: 200,
  }
)

puts response.dig('choices', 0, 'message', 'content')

# Or bring your own client:
require 'openai'
config = GateML.config(api_key: 'gml-sk-live_...')
client = OpenAI::Client.new(access_token: config[:api_key], uri_base: config[:base_url])`,
  },
  {
    id: "php", label: "PHP", anchor: "php",
    install: "composer require gateml/gateml-php openai-php/client",
    code: `<?php

require_once __DIR__ . '/vendor/autoload.php';

use GateML\\GateML;

// Returns a configured openai-php client
$client = GateML::client('gml-sk-live_...');

$response = $client->chat()->create([
    'model'    => 'gpt-4o',
    'messages' => [
        ['role' => 'user', 'content' => 'Hello!'],
    ],
    'max_tokens' => 200,
]);

echo $response->choices[0]->message->content;

// Or get raw config:
$config = GateML::config('gml-sk-live_...');
// $config['api_key'], $config['base_url']`,
  },
  {
    id: "curl", label: "curl / REST", anchor: "curl",
    install: "",
    code: `# Test mode — synthetic response, no LLM call
curl https://api.gateml.io/v1/chat/completions \\
  -H "Authorization: Bearer gml-sk-test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Live mode — forwarded to your stored provider key
curl https://api.gateml.io/v1/chat/completions \\
  -H "Authorization: Bearer gml-sk-live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# List supported models
curl https://api.gateml.io/v1/models \\
  -H "Authorization: Bearer gml-sk-test_..."`,
  },
];

export function SDKTabs() {
  const [lang, setLang] = useState<Lang>("python");
  const current = LANGS.find(l => l.id === lang)!;

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="sdk-tabs" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px 8px 0 0", borderBottom: "none" }}>
        {LANGS.map(l => (
          <button key={l.id} id={l.anchor} className={`sdk-tab ${lang === l.id ? "active" : ""}`} onClick={() => setLang(l.id)}>
            {l.label}
          </button>
        ))}
      </div>

      {current.install && (
        <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderTop: "none", padding: "8px 20px", fontSize: 11, color: "var(--muted)", display: "flex", gap: 10 }}>
          <span style={{ color: "var(--muted2)" }}>install</span>
          <code style={{ color: "var(--accent2)" }}>$ {current.install}</code>
        </div>
      )}

      <div className="docs-code" style={{ borderTop: "none", borderRadius: current.install ? "0 0 8px 8px" : "0 0 8px 8px" }}>
        {current.code}
      </div>
    </div>
  );
}
