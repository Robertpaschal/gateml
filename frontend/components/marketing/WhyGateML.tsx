const PAIN_POINTS = [
  "Prompts are unversioned",
  "No observability in production",
  "Costs spiral until the bill hits",
  "Testing is manual eyeballing",
  "Locked into one provider's SDK",
  "Multiple accounts & invoices",
];

const ROWS = [
  {
    dimension: "Provider accounts",
    without: "One account per provider — OpenAI, Anthropic, Google. Three sign-ups, three billing dashboards.",
    with: "One GateML key. We route to every provider.",
  },
  {
    dimension: "Billing",
    without: "Multiple invoices each month. Token costs arrive as a surprise.",
    with: "One invoice. Real-time cost tracked per request.",
  },
  {
    dimension: "Switching models",
    without: "New SDK, code changes, a PR, a deploy.",
    with: "Change a model in the dashboard. No code.",
  },
  {
    dimension: "Provider outages",
    without: "Your app returns errors. Users notice.",
    with: "Auto-fallback to the next model. Invisible to users.",
  },
  {
    dimension: "Prompt changes",
    without: "Edit code → PR → review → deploy → hope.",
    with: "Version in the dashboard. Roll back in one click.",
  },
  {
    dimension: "Debugging bad outputs",
    without: "Add more logging, redeploy, grep in prod.",
    with: "Request inspector: inputs, outputs, tokens, latency — all there.",
  },
  {
    dimension: "Testing output quality",
    without: "Manually read a sample and guess.",
    with: "Assertion-based eval suite. Run it in CI before you ship.",
  },
];

export function WhyGateML() {
  return (
    <section
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="section">
        <div className="section-label">The Problem</div>
        <h2 className="section-title">
          The AI stack tax<br />every team is paying.
        </h2>
        <p className="section-sub" style={{ marginBottom: 36, maxWidth: 620 }}>
          Every company is now building AI features. But the moment you go
          beyond a simple API call, you hit the same wall. Teams are solving
          it with duct tape: spreadsheets, Notion docs, random logging.
          It&apos;s the same chaos backend engineering had before observability
          tools existed.
        </p>

        {/* Pain point pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 56 }}>
          {PAIN_POINTS.map(p => (
            <span
              key={p}
              style={{
                background: "rgba(255,59,92,0.07)",
                border: "1px solid rgba(255,59,92,0.2)",
                color: "var(--danger)",
                borderRadius: 4,
                fontSize: 11,
                padding: "5px 13px",
              }}
            >
              ✗ {p}
            </span>
          ))}
        </div>

        {/* Architecture mini-diagram */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 48px 1fr",
            gap: 0,
            marginBottom: 48,
            alignItems: "center",
          }}
        >
          {/* Without */}
          <div
            style={{
              background: "rgba(255,59,92,0.05)",
              border: "1px solid rgba(255,59,92,0.15)",
              borderRadius: 8,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 9, color: "var(--danger)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>
              ✗ Without GateML
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Your App", color: "var(--muted)" },
              ].map(n => (
                <div
                  key={n.label}
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "8px 14px",
                    fontSize: 11,
                    color: n.color,
                    textAlign: "center",
                  }}
                >
                  {n.label}
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", paddingTop: 4 }}>
                {["↙", "↓", "↘"].map((a, i) => (
                  <span key={i} style={{ color: "rgba(255,59,92,0.5)", fontSize: 16, fontWeight: 700 }}>{a}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["OpenAI", "Anthropic", "Google"].map(p => (
                  <div
                    key={p}
                    style={{
                      flex: 1,
                      background: "var(--surface2)",
                      border: "1px solid rgba(255,59,92,0.2)",
                      borderRadius: 4,
                      padding: "7px 8px",
                      fontSize: 10,
                      color: "rgba(255,59,92,0.7)",
                      textAlign: "center",
                    }}
                  >
                    {p}
                    <div style={{ fontSize: 9, color: "var(--muted2)", marginTop: 3 }}>own account</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center", marginTop: 4, lineHeight: 1.6 }}>
                3 accounts · 3 invoices · 3 key stores<br />0 unified observability
              </div>
            </div>
          </div>

          {/* vs */}
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted2)", fontWeight: 700 }}>vs</div>

          {/* With */}
          <div
            style={{
              background: "rgba(0,255,136,0.04)",
              border: "1px solid rgba(0,255,136,0.15)",
              borderRadius: 8,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 9, color: "var(--accent)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>
              ✓ With GateML
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "8px 14px",
                  fontSize: 11,
                  color: "var(--muted)",
                  textAlign: "center",
                }}
              >
                Your App
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ color: "var(--accent)", fontSize: 16, fontWeight: 700 }}>↓</span>
              </div>
              <div
                style={{
                  background: "rgba(0,255,136,0.08)",
                  border: "1px solid rgba(0,255,136,0.3)",
                  borderRadius: 4,
                  padding: "8px 14px",
                  fontSize: 11,
                  color: "var(--accent)",
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                GateML Gateway
                <div style={{ fontSize: 9, color: "rgba(0,255,136,0.6)", fontWeight: 400, marginTop: 2 }}>observe · route · version · test</div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {["↙", "↓", "↘"].map((a, i) => (
                  <span key={i} style={{ color: "rgba(0,255,136,0.4)", fontSize: 16, fontWeight: 700 }}>{a}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["OpenAI", "Anthropic", "Google"].map(p => (
                  <div
                    key={p}
                    style={{
                      flex: 1,
                      background: "var(--surface2)",
                      border: "1px solid rgba(0,255,136,0.15)",
                      borderRadius: 4,
                      padding: "7px 8px",
                      fontSize: 10,
                      color: "var(--muted)",
                      textAlign: "center",
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center", marginTop: 4, lineHeight: 1.6 }}>
                1 account · 1 invoice · 1 key<br />full observability across all providers
              </div>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 2fr 2fr",
              background: "var(--surface2)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ padding: "11px 20px", fontSize: 9, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: 2 }} />
            <div
              style={{
                padding: "11px 20px",
                fontSize: 9,
                color: "var(--danger)",
                textTransform: "uppercase",
                letterSpacing: 2,
                fontWeight: 700,
                borderLeft: "1px solid var(--border)",
              }}
            >
              ✗ Without GateML
            </div>
            <div
              style={{
                padding: "11px 20px",
                fontSize: 9,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: 2,
                fontWeight: 700,
                borderLeft: "1px solid var(--border)",
              }}
            >
              ✓ With GateML
            </div>
          </div>

          {ROWS.map((row, i) => (
            <div
              key={row.dimension}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 2fr 2fr",
                borderBottom: i < ROWS.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  fontSize: 11,
                  color: "var(--muted)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {row.dimension}
              </div>
              <div
                style={{
                  padding: "14px 20px",
                  fontSize: 12,
                  color: "rgba(255,59,92,0.65)",
                  borderLeft: "1px solid var(--border)",
                  lineHeight: 1.65,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {row.without}
              </div>
              <div
                style={{
                  padding: "14px 20px",
                  fontSize: 12,
                  color: "var(--muted)",
                  borderLeft: "1px solid var(--border)",
                  lineHeight: 1.65,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                {row.with}
              </div>
            </div>
          ))}
        </div>

        {/* Positioning quote */}
        <div
          style={{
            marginTop: 40,
            padding: "20px 28px",
            background: "rgba(0,255,136,0.03)",
            border: "1px solid rgba(0,255,136,0.1)",
            borderRadius: 6,
            borderLeft: "3px solid var(--accent)",
          }}
        >
          <div
            style={{
              fontSize: 15,
              color: "var(--text)",
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              lineHeight: 1.55,
              marginBottom: 8,
            }}
          >
            &ldquo;It&apos;s the same chaos backend engineering had before observability
            tools existed — every team building the same duct-tape solution from scratch.&rdquo;
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            GateML is to LLMs what Datadog is to infrastructure.
          </div>
        </div>
      </div>
    </section>
  );
}
