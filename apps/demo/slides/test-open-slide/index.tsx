import {
  type DesignSystem,
  defaultDesign,
  mergeDesign,
  type Page,
  type SlideMeta,
} from '@open-slide/core';
import dashboard from './assets/dashboard.svg';

export const design: DesignSystem = mergeDesign(defaultDesign, {
  palette: {
    bg: '#020617',
    text: '#e2e8f0',
    accent: '#22d3ee',
    accentSecondary: '#80b0ff',
    surface: '#eeeee9',
    surfaceAlt: '#e6e4dc',
    mutedText: '#6f6963',
    border: '#dad6cd',
    codeText: '#2161b5',
    commentText: '#9c9288',
  },
  fonts: {
    display: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    mono: '"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
  },
  typeScale: {
    hero: 156,
    body: 30,
    heading1: 96,
    small: 28,
    code: 26,
    label: 22,
    chartLabel: 20,
    caption: 22,
  },
  radius: 12,
  spacing: {
    pageMargin: 120,
    sectionGap: 48,
    itemGap: 24,
  },
  shadow: {
    card: '0 12px 40px rgba(26, 24, 20, 0.08)',
  },
} as Partial<DesignSystem>);

const TOTAL = 8;

const fill = {
  width: '100%',
  height: '100%',
  background: 'var(--osd-bg)',
  color: 'var(--osd-text)',
  fontFamily: 'var(--osd-font-body)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
  boxSizing: 'border-box' as const,
};

const pagePadding = {
  padding: 'var(--osd-spacing-page-margin)',
};

const Footer = ({ page, label }: { page: number; label: string }) => (
  <div
    style={{
      position: 'absolute',
      left: 'var(--osd-spacing-page-margin)',
      right: 'var(--osd-spacing-page-margin)',
      bottom: 40,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: 'var(--osd-font-body)',
      fontSize: 'var(--osd-size-caption)',
      color: 'var(--osd-muted-text)',
      borderTop: '1px solid var(--osd-border)',
      paddingTop: 16,
    }}
  >
    <span style={{ color: 'var(--osd-comment-text)' }}>{label}</span>
    <span>
      {String(page).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
    </span>
  </div>
);

const Eyebrow = ({ children }: { children: string }) => (
  <div
    style={{
      fontFamily: 'var(--osd-font-body)',
      fontSize: 'var(--osd-size-label)',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--osd-accent)',
      marginBottom: 'var(--osd-spacing-item-gap)',
    }}
  >
    {children}
  </div>
);

const PageTitle = ({ children }: { children: string }) => (
  <h1
    style={{
      fontFamily: 'var(--osd-font-display)',
      fontSize: 'var(--osd-size-heading-1)',
      fontWeight: 800,
      lineHeight: 1.08,
      letterSpacing: '-0.03em',
      margin: 0,
      maxWidth: 1320,
    }}
  >
    {children}
  </h1>
);

export const meta: SlideMeta = { title: 'Lightweight SIEM' };

const Cover: Page = () => (
  <div
    style={{
      ...fill,
      ...pagePadding,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}
  >
    <Eyebrow>intro · lightweight siem</Eyebrow>
    <h1
      style={{
        fontFamily: 'var(--osd-font-display)',
        fontSize: 'var(--osd-size-hero)',
        fontWeight: 800,
        lineHeight: 1.05,
        letterSpacing: '-0.035em',
        margin: 0,
      }}
    >
      Lightweight SIEM
    </h1>
    <p
      style={{
        margin: 'var(--osd-spacing-section-gap) 0 0',
        fontFamily: 'var(--osd-font-body)',
        fontSize: 'var(--osd-size-body)',
        lineHeight: 1.45,
        color: 'var(--osd-muted-text)',
        maxWidth: 1240,
      }}
    >
      Introduce core positioning: a lightweight SIEM built for SMBs, focused on simple, effective,
      affordable.
    </p>
    <Footer page={1} label="intro · lightweight siem" />
  </div>
);

const Bullets: Page = () => (
  <div style={{ ...fill, ...pagePadding }}>
    <PageTitle>Built for SMBs</PageTitle>
    <ul
      style={{
        margin: 'var(--osd-spacing-section-gap) 0 0',
        padding: 0,
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--osd-spacing-item-gap)',
      }}
    >
      {['Simple setup', 'Effective detection', 'Affordable operations'].map((t) => (
        <li
          key={t}
          style={{
            fontFamily: 'var(--osd-font-body)',
            fontSize: 'var(--osd-size-body)',
            lineHeight: 1.35,
            paddingLeft: 'var(--osd-spacing-section-gap)',
            borderLeft: `6px solid var(--osd-accent)`,
          }}
        >
          {t}
        </li>
      ))}
    </ul>
    <Footer page={2} label="positioning · smb" />
  </div>
);

const Split: Page = () => (
  <div
    style={{
      ...fill,
      ...pagePadding,
      display: 'flex',
      gap: 'var(--osd-spacing-section-gap)',
      alignItems: 'center',
    }}
  >
    <div
      style={{
        flex: '0 0 720px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--osd-spacing-item-gap)',
      }}
    >
      <Eyebrow>product · analyst workspace</Eyebrow>
      <PageTitle>See threats clearly</PageTitle>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--osd-font-body)',
          fontSize: 'var(--osd-size-body)',
          lineHeight: 1.55,
          color: 'var(--osd-muted-text)',
        }}
      >
        An opinionated dashboard keeps SMB teams focused on the handful of events that deserve
        action.
      </p>
    </div>
    <div
      style={{
        flex: 1,
        height: 860,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0c1222',
        borderRadius: 'var(--osd-radius)',
        border: '1px solid #1e293b',
        padding: 'var(--osd-spacing-item-gap)',
      }}
    >
      <img
        src={dashboard}
        alt=""
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
      />
    </div>
    <Footer page={3} label="product · analyst workspace" />
  </div>
);

const fmtMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 0 })}`;

const CostBars: Page = () => {
  const rows = [
    { label: 'Enterprise SIEM', value: 4800 },
    { label: 'DIY logging', value: 1200 },
    { label: 'Lightweight SIEM', value: 399 },
  ];
  const max = 4800;
  return (
    <div style={{ ...fill, ...pagePadding }}>
      <Eyebrow>economics · monthly cost</Eyebrow>
      <PageTitle>Affordable visibility</PageTitle>
      <div
        style={{
          marginTop: 'var(--osd-spacing-section-gap)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--osd-spacing-section-gap)',
        }}
      >
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--osd-spacing-item-gap)',
            }}
          >
            <span
              style={{
                width: 320,
                fontFamily: 'var(--osd-font-body)',
                fontSize: 'var(--osd-size-body)',
                color: 'var(--osd-muted-text)',
              }}
            >
              {r.label}
            </span>
            <div
              style={{
                flex: 1,
                height: 52,
                background: '#0f172a',
                borderRadius: 'var(--osd-radius)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(r.value / max) * 100}%`,
                  background: r.label.includes('Lightweight')
                    ? 'var(--osd-accent)'
                    : 'color-mix(in srgb, var(--osd-accent) 38%, transparent)',
                  borderRadius: 'var(--osd-radius)',
                }}
              />
            </div>
            <span
              style={{
                width: 160,
                textAlign: 'right',
                fontFamily: 'var(--osd-font-mono)',
                fontSize: 'var(--osd-size-code)',
                fontWeight: 700,
                color: 'var(--osd-text)',
              }}
            >
              {fmtMoney(r.value)}
            </span>
          </div>
        ))}
      </div>
      <Footer page={4} label="economics · monthly cost" />
    </div>
  );
};

const AlertLine: Page = () => {
  const data = [
    { m: 'Jan', v: 420 },
    { m: 'Feb', v: 360 },
    { m: 'Mar', v: 260 },
    { m: 'Apr', v: 190 },
    { m: 'May', v: 120 },
  ];
  const w = 1600;
  const h = 380;
  const padG = 56;
  const maxV = 420;
  const minV = 120;
  const innerW = w - padG * 2;
  const innerH = h - padG * 2;
  const pts = data.map((d, i) => {
    const x = padG + (innerW * i) / (data.length - 1);
    const y = padG + innerH * (1 - (d.v - minV) / (maxV - minV));
    return `${x},${y}`;
  });
  const dPath = `M ${pts.join(' L ')}`;
  return (
    <div style={{ ...fill, ...pagePadding }}>
      <Eyebrow>trend · alert volume</Eyebrow>
      <PageTitle>Fewer noisy alerts</PageTitle>
      <svg
        width={w}
        height={h}
        style={{ marginTop: 'var(--osd-spacing-section-gap)', fontFamily: 'var(--osd-font-body)' }}
        viewBox={`0 0 ${w} ${h}`}
      >
        <line
          x1={padG}
          y1={h - padG}
          x2={w - padG}
          y2={h - padG}
          stroke="var(--osd-border)"
          strokeWidth={2}
        />
        <line
          x1={padG}
          y1={padG}
          x2={padG}
          y2={h - padG}
          stroke="var(--osd-border)"
          strokeWidth={2}
        />
        <path
          d={dPath}
          fill="none"
          stroke="var(--osd-accent)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const x = padG + (innerW * i) / (data.length - 1);
          const y = padG + innerH * (1 - (d.v - minV) / (maxV - minV));
          return <circle key={d.m} cx={x} cy={y} r={10} fill="var(--osd-accent)" />;
        })}
        {data.map((d, i) => {
          const x = padG + (innerW * i) / (data.length - 1);
          return (
            <text
              key={d.m}
              x={x}
              y={h - 18}
              textAnchor="middle"
              style={{ fill: 'var(--osd-muted-text)', fontSize: 'var(--osd-size-chart-label)' }}
            >
              {d.m}
            </text>
          );
        })}
      </svg>
      <Footer page={5} label="trend · alert volume" />
    </div>
  );
};

const CoveragePie: Page = () => {
  const slices = [
    { label: 'Endpoint', v: 35, c: '#22d3ee' },
    { label: 'Identity', v: 30, c: '#38bdf8' },
    { label: 'Cloud', v: 20, c: '#67e8f9' },
    { label: 'Network', v: 15, c: '#a5f3fc' },
  ];
  const cx = 320;
  const cy = 300;
  const r = 200;
  let angle = -Math.PI / 2;
  const paths: { d: string; c: string }[] = [];
  for (const s of slices) {
    const a = (s.v / 100) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += a;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = a > Math.PI ? 1 : 0;
    paths.push({
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      c: s.c,
    });
  }
  return (
    <div
      style={{
        ...fill,
        ...pagePadding,
        display: 'flex',
        gap: 'var(--osd-spacing-section-gap)',
      }}
    >
      <div style={{ flex: '0 0 640px' }}>
        <Eyebrow>coverage · signal mix</Eyebrow>
        <PageTitle>Detection coverage</PageTitle>
        <svg width={640} height={560} viewBox="0 0 640 560">
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.c} stroke="#020617" strokeWidth={3} />
          ))}
        </svg>
      </div>
      <div
        style={{
          flex: 1,
          paddingTop: 'var(--osd-spacing-section-gap)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--osd-spacing-item-gap)',
        }}
      >
        {slices.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontFamily: 'var(--osd-font-body)',
              fontSize: 'var(--osd-size-body)',
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 4, background: s.c }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--osd-font-mono)', color: 'var(--osd-muted-text)' }}>
              {s.v}%
            </span>
          </div>
        ))}
      </div>
      <Footer page={6} label="coverage · signal mix" />
    </div>
  );
};

const RiskScatter: Page = () => {
  const pts = [
    { e: 'Suspicious login', x: 8, y: 7 },
    { e: 'Malware blocked', x: 4, y: 9 },
    { e: 'Policy drift', x: 7, y: 4 },
    { e: 'Data exfil signal', x: 3, y: 10 },
  ];
  const w = 1680;
  const h = 520;
  const g = 80;
  const plotW = w - g * 2;
  const plotH = h - g * 2;
  const sx = (x: number) => g + (x / 10) * plotW;
  const sy = (y: number) => g + plotH - (y / 10) * plotH;
  return (
    <div style={{ ...fill, ...pagePadding }}>
      <Eyebrow>prioritization · risk map</Eyebrow>
      <PageTitle>Prioritize what matters</PageTitle>
      <svg
        width={w}
        height={h}
        style={{
          marginTop: 'var(--osd-spacing-item-gap)',
          fontFamily: 'var(--osd-font-body)',
        }}
        viewBox={`0 0 ${w} ${h}`}
      >
        <rect
          x={g}
          y={g}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="var(--osd-border)"
          strokeWidth={2}
        />
        {[0, 2, 4, 6, 8, 10].map((t) => (
          <g key={t}>
            <line
              x1={g + (t / 10) * plotW}
              y1={h - g}
              x2={g + (t / 10) * plotW}
              y2={h - g + 8}
              stroke="var(--osd-muted-text)"
            />
            <text
              x={g + (t / 10) * plotW}
              y={h - g + 36}
              textAnchor="middle"
              style={{ fill: 'var(--osd-muted-text)', fontSize: 'var(--osd-size-chart-label)' }}
            >
              {t}
            </text>
          </g>
        ))}
        {[0, 2, 4, 6, 8, 10].map((t) => (
          <g key={`y${t}`}>
            <line
              x1={g - 8}
              y1={g + plotH - (t / 10) * plotH}
              x2={g}
              y2={g + plotH - (t / 10) * plotH}
              stroke="var(--osd-muted-text)"
            />
            <text
              x={g - 16}
              y={g + plotH - (t / 10) * plotH + 8}
              textAnchor="end"
              style={{ fill: 'var(--osd-muted-text)', fontSize: 'var(--osd-size-chart-label)' }}
            >
              {t}
            </text>
          </g>
        ))}
        <text
          x={g + plotW / 2}
          y={h - 8}
          textAnchor="middle"
          style={{ fill: 'var(--osd-muted-text)', fontSize: 'var(--osd-size-caption)' }}
        >
          Likelihood
        </text>
        <text
          x={22}
          y={g + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 22 ${g + plotH / 2})`}
          style={{ fill: 'var(--osd-muted-text)', fontSize: 'var(--osd-size-caption)' }}
        >
          Impact
        </text>
        {pts.map((p) => (
          <g key={p.e}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={14} fill="var(--osd-accent)" opacity={0.9} />
            <text
              x={sx(p.x) + 22}
              y={sy(p.y) + 8}
              style={{ fill: 'var(--osd-text)', fontSize: 'var(--osd-size-small)' }}
            >
              {p.e}
            </text>
          </g>
        ))}
      </svg>
      <Footer page={7} label="prioritization · risk map" />
    </div>
  );
};

const CompareTable: Page = () => (
  <div style={{ ...fill, ...pagePadding }}>
    <Eyebrow>comparison · operating model</Eyebrow>
    <PageTitle>What teams get</PageTitle>
    <table
      style={{
        marginTop: 'var(--osd-spacing-item-gap)',
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--osd-font-body)',
        fontSize: 'var(--osd-size-body)',
      }}
    >
      <thead>
        <tr style={{ borderBottom: '2px solid var(--osd-border)' }}>
          <th
            style={{
              textAlign: 'left',
              padding: '18px 16px',
              color: 'var(--osd-muted-text)',
              fontWeight: 600,
            }}
          >
            Capability
          </th>
          <th
            style={{
              textAlign: 'right',
              padding: '18px 16px',
              color: 'var(--osd-accent)',
              fontWeight: 700,
            }}
          >
            Lightweight SIEM
          </th>
          <th
            style={{
              textAlign: 'right',
              padding: '18px 16px',
              color: 'var(--osd-muted-text)',
              fontWeight: 600,
            }}
          >
            Legacy SIEM
          </th>
        </tr>
      </thead>
      <tbody>
        {[
          ['Setup time', '1 day', '6 months'],
          ['Admin overhead', 'Low', 'High'],
          ['Monthly cost', fmtMoney(399), fmtMoney(4800)],
        ].map(([cap, light, leg]) => (
          <tr key={cap} style={{ borderBottom: '1px solid var(--osd-border)' }}>
            <td style={{ padding: '22px 16px' }}>{cap}</td>
            <td style={{ padding: '22px 16px', textAlign: 'right', fontWeight: 600 }}>{light}</td>
            <td
              style={{ padding: '22px 16px', textAlign: 'right', color: 'var(--osd-muted-text)' }}
            >
              {leg}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <Footer page={8} label="comparison · operating model" />
  </div>
);

export default [
  Cover,
  Bullets,
  Split,
  CostBars,
  AlertLine,
  CoveragePie,
  RiskScatter,
  CompareTable,
] satisfies Page[];
