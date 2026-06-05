import type { Metadata } from "next";
import { SDKTabs } from "@/components/docs/SDKTabs";

export const metadata: Metadata = {
  title: "SDKs",
  description: "Official GateML SDKs for Python, TypeScript, Go, Ruby, PHP, and curl.",
};

export default function SDKPage() {
  return (
    <div className="docs-content">
      <div className="docs-h1">SDKs & Integrations</div>
      <p className="docs-p">
        GateML exposes an OpenAI-compatible REST API, so any library that supports a custom base URL
        works out of the box. We also publish thin official SDKs for the most popular languages.
      </p>

      <SDKTabs />

      <div className="docs-h2">Compatible without an SDK</div>
      <p className="docs-p">
        GateML works with any OpenAI-compatible client — just set the base URL:
      </p>
      {[
        ["LangChain (Python)", `from langchain_openai import ChatOpenAI\nllm = ChatOpenAI(api_key="gml-sk-live_...", base_url="https://api.gateml.io/v1")`],
        ["LlamaIndex",         `from llama_index.llms.openai import OpenAI\nllm = OpenAI(api_key="gml-sk-live_...", api_base="https://api.gateml.io/v1")`],
        ["Vercel AI SDK",      `import { createOpenAI } from '@ai-sdk/openai';\nconst gateml = createOpenAI({ apiKey: 'gml-sk-live_...', baseURL: 'https://api.gateml.io/v1' });`],
        ["liteLLM",            `import litellm\nlitellm.api_base = "https://api.gateml.io/v1"\nlitellm.api_key = "gml-sk-live_..."`],
      ].map(([name, code]) => (
        <div key={name as string}>
          <div className="docs-h3">{name}</div>
          <div className="docs-code">{code}</div>
        </div>
      ))}
    </div>
  );
}
