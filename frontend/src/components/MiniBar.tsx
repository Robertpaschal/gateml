interface MiniBarProps {
  data: number[];
  color?: string;
}

export function MiniBar({ data, color = "#00ff88" }: MiniBarProps) {
  const max = Math.max(...data, 1);
  return (
    <div className="bar-chart">
      {data.map((v, i) => (
        <div key={i} className="bar-wrap">
          <div
            className="bar"
            style={{
              height: `${(v / max) * 100}%`,
              background: color,
              opacity: i === data.length - 1 ? 1 : 0.5,
            }}
          />
        </div>
      ))}
    </div>
  );
}
