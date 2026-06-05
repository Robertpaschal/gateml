import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-eyebrow">
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
        Now in public beta
      </div>

      <h1 className="hero-title">
        Route every LLM call.<br />
        <em>One key.</em>
      </h1>

      <p className="hero-sub">
        GateML sits between your app and every AI provider — OpenAI, Anthropic, Google.
        Automatic fallback, real-time cost tracking, and prompt versioning.
        Change one line of code.
      </p>

      <div className="hero-cta">
        <Link href="/auth" className="btn-primary-lg">Get your API key free →</Link>
        <Link href="/docs/quickstart" className="btn-ghost-lg">Read the docs</Link>
      </div>

      <div className="hero-code">
        <span className="hero-code-tag">one-line change</span>
        <span style={{ color: "var(--muted)", fontStyle: "italic" }}># Before</span>{"\n"}
        {"client = OpenAI("}<span style={{ color: "var(--accent2)" }}>api_key</span>
        {`=`}<span style={{ color: "#c3e88d" }}>"sk-proj-..."</span>
        {`)`}{"\n\n"}
        <span style={{ color: "var(--muted)", fontStyle: "italic" }}># After — all other code stays the same</span>{"\n"}
        {"client = OpenAI("}<span style={{ color: "var(--accent2)" }}>api_key</span>
        {`=`}<span style={{ color: "#c3e88d" }}>"gml-sk-live_..."</span>
        {","}{"\n"}
        {"           "}<span style={{ color: "var(--accent2)" }}>base_url</span>
        {`=`}<span style={{ color: "#c3e88d" }}>"https://api.gateml.io/v1"</span>
        {")"}
      </div>

      {/* Social proof strip */}
      <div style={{ marginTop: 32, display: "flex", gap: 32, alignItems: "center", fontSize: 11, color: "var(--muted2)" }}>
        <span>Compatible with</span>
        {["OpenAI SDK", "LangChain", "LlamaIndex", "Anthropic SDK", "Vercel AI SDK"].map(lib => (
          <span key={lib} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 10px", color: "var(--muted)", fontSize: 10 }}>
            {lib}
          </span>
        ))}
      </div>
    </section>
  );
}
