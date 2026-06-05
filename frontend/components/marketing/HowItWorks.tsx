export function HowItWorks() {
  return (
    <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="section">
        <div className="section-label">How it works</div>
        <h2 className="section-title">Up and running in 3 minutes</h2>
        <p className="section-sub" style={{ marginBottom: 56 }}>
          No infrastructure to manage. No new SDK to learn. Just a base URL change.
        </p>

        <div className="steps">
          {[
            {
              num: "1",
              title: "Sign up free",
              desc: "Create an account and get your test and live API keys in 30 seconds. No credit card required.",
            },
            {
              num: "2",
              title: "Add your provider keys",
              desc: "Paste your OpenAI, Anthropic, or Google API keys. We store them encrypted with AES-256.",
            },
            {
              num: "3",
              title: "Change one line",
              desc: "Point your existing code at api.gateml.io/v1. Everything else — models, messages, streaming — stays the same.",
            },
          ].map(step => (
            <div className="step" key={step.num}>
              <div className="step-num">{step.num}</div>
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
