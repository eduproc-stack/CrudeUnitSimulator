import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = ['#2c7be5', '#d94f45', '#6fbf73', '#8a63d2', '#2ca7c9'];
const REFERENCE_INPUTS = { fr1: 15, fr2: 15, fr3: 15, fr4: 15, fractionation: 7 };
const POLY = [140.9778729829559, 9.882093466749211, -0.1132468946489098, 0.00018645098197644927, 0.00000648999263629102];
const VISC_POLY = [9.706855774, -0.1357349604, 0.0006719743251, -0.000001345450869, 0.000000001069586197];
const FLASHPOINT = { intercept: -51.9, slope: 0.735 };
const NAMES = ['FR1', 'FR2', 'FR3', 'FR4', 'FR5'];
const OFFSET_MULTIPLIERS = [1.2, 1.8, 1.9, 2.5, 2.3];
const VISCOSITY_OFFSETS = [0.4, 1.6, 2.8, 6];
const LOCAL_TEMPLATE = [0, 2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100];
const OFFSET_TEMPLATE_FR1_TO_FR4 = [-6, -4.55, -3, -2, -1, -0.4, 0, 0.5, 0.65, 0.8, 0.95, 2, 4, 6, 8];
const OFFSET_TEMPLATE_FR5 = [-6, -4.55, -3, -2, -1, -0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const TABULAR_POINTS = [0, 2, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100];

const styles = {
  page: {
    minHeight: '100vh',
    background: '#edf3f8',
    padding: '24px',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    color: '#10233f',
  },
  shell: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gap: '24px',
  },
  hero: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '28px',
    boxShadow: '0 12px 32px rgba(16, 35, 63, 0.08)',
    padding: '28px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '340px minmax(0, 1fr)',
    gap: '24px',
    alignItems: 'start',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '28px',
    boxShadow: '0 12px 32px rgba(16, 35, 63, 0.08)',
    padding: '28px',
  },
  stickyCard: {
    position: 'sticky',
    top: '20px',
  },
  sectionStack: {
    display: 'grid',
    gap: '24px',
  },
  chartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '24px',
  },
  chartBox: {
    width: '100%',
    height: '380px',
  },
  h1: {
    margin: '0 0 10px',
    fontSize: '34px',
    lineHeight: 1.1,
    fontWeight: 800,
    color: '#10233f',
  },
  h2: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    color: '#10233f',
  },
  h3: {
    margin: '30px 0 0',
    fontSize: '18px',
    fontWeight: 800,
    color: '#10233f',
  },
  label: {
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '15px',
    fontWeight: 700,
    color: '#42536d',
  },
  muted: {
    margin: '8px 0 0',
    color: '#60738f',
    lineHeight: 1.5,
    fontSize: '15px',
  },
  eyebrow: {
    margin: '0 0 12px',
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: '#2c7be5',
  },
  button: {
    borderRadius: '999px',
    border: '1px solid #cad6e3',
    background: '#ffffff',
    color: '#33445f',
    padding: '12px 18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 35, 63, 0.06)',
  },
  balance: {
    marginTop: '24px',
    borderRadius: '22px',
    border: '1px solid #b6d0fb',
    background: '#edf5ff',
    padding: '18px 20px',
  },
  balanceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '10px 20px',
    color: '#42536d',
    fontSize: '15px',
  },
  tableWrap: {
    overflowX: 'auto',
    marginTop: '18px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '15px',
  },
  th: {
    textAlign: 'left',
    background: '#f4f7fb',
    color: '#42536d',
    padding: '14px 14px',
    borderBottom: '1px solid #dbe4ef',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px 14px',
    borderBottom: '1px solid #e7edf5',
    whiteSpace: 'nowrap',
  },
  tdRight: {
    textAlign: 'right',
  },
  chartHeading: {
    margin: '0 0 6px',
    fontSize: '18px',
    fontWeight: 800,
    color: '#10233f',
  },
  helper: {
    margin: 0,
    fontSize: '15px',
    color: '#60738f',
  },
};

function crudeTemp(volPct) {
  return POLY.reduce((sum, coefficient, index) => sum + coefficient * volPct ** index, 0);
}

function viscosity(tempC) {
  const exponent = VISC_POLY.reduce((sum, coefficient, index) => sum + coefficient * tempC ** index, 0);
  return Math.exp(exponent);
}

function interpolate(xValues, yValues, x) {
  if (x <= xValues[0]) return yValues[0];
  if (x >= xValues[xValues.length - 1]) return yValues[yValues.length - 1];
  for (let i = 0; i < xValues.length - 1; i += 1) {
    const x0 = xValues[i];
    const x1 = xValues[i + 1];
    if (x >= x0 && x <= x1) {
      const y0 = yValues[i];
      const y1 = yValues[i + 1];
      const ratio = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * ratio;
    }
  }
  return yValues[yValues.length - 1];
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeYields(fr1, fr2, fr3, fr4) {
  const safe = [fr1, fr2, fr3, fr4].map((value) => Math.max(0, Math.min(100, value)));
  const total = safe.reduce((sum, value) => sum + value, 0);
  if (total <= 100) return [...safe, 100 - total];
  const scale = 100 / total;
  const scaled = safe.map((value) => value * scale);
  return [...scaled, 0];
}

function simulate(yields, fractionationNumber) {
  const clampedFractionation = Math.max(0, Math.min(15, fractionationNumber));
  const starts = [0];
  yields.slice(0, -1).forEach((yieldPct) => {
    starts.push(starts[starts.length - 1] + yieldPct);
  });

  const crudeCurve = Array.from({ length: 101 }, (_, overallVolPct) => ({
    overallVolPct,
    tempC: crudeTemp(overallVolPct),
  }));

  const fractionOffsetBase = clampedFractionation * 0.8;

  const fractions = yields.map((yieldPct, index) => {
    const offsetTemplate = index < 4 ? OFFSET_TEMPLATE_FR1_TO_FR4 : OFFSET_TEMPLATE_FR5;
    const offsetMagnitude = OFFSET_MULTIPLIERS[index] * fractionOffsetBase;

    const overallCurveTemplate = LOCAL_TEMPLATE.map((localVolPct, templateIndex) => {
      const overallVolPct = starts[index] + (yieldPct * localVolPct) / 100;
      const tempC = crudeTemp(overallVolPct) + offsetTemplate[templateIndex] * offsetMagnitude;
      return { overallVolPct, tempC };
    });

    const localCurve = Array.from({ length: 101 }, (_, localVolPct) => ({
      localVolPct,
      tempC: interpolate(
        LOCAL_TEMPLATE,
        overallCurveTemplate.map((point) => point.tempC),
        localVolPct,
      ),
    }));

    const flashpointC = FLASHPOINT.intercept + FLASHPOINT.slope * localCurve[5].tempC;
    const baseViscosity = viscosity(localCurve[50].tempC);
    const viscosityCst = index < 4 ? baseViscosity + VISCOSITY_OFFSETS[index] : viscosity(localCurve[50].tempC - 75);

    return {
      name: NAMES[index],
      yieldPct,
      flashpointC,
      viscosityCst,
      localCurve,
      overallCurve: overallCurveTemplate,
    };
  });

  const overlapTargets = [90, 90, 90, 95];
  for (let i = 0; i < 4; i += 1) {
    fractions[i].overlapC = fractions[i].localCurve[overlapTargets[i]].tempC - fractions[i + 1].localCurve[10].tempC;
  }

  const tabularRows = TABULAR_POINTS.map((point) => {
    const row = { localVolPct: point };
    fractions.forEach((fraction) => {
      row[fraction.name] = fraction.localCurve[point].tempC;
    });
    return row;
  });

  return { fractionationNumber: clampedFractionation, fractions, crudeCurve, tabularRows };
}

function formatOneDecimal(value) {
  return round(value, 1).toFixed(1);
}

function formatTwoDecimals(value) {
  return round(Number(value), 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatViscosity(value) {
  if (!Number.isFinite(value) || value > 10000) return '∞';
  if (value >= 1000) return round(value, 0).toLocaleString();
  return round(value, 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Slider({ label, value, setValue, min, max, step, suffix = '' }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={styles.label}>
        <label>{label}</label>
        <span>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number(value)}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#1976d2', cursor: 'pointer' }}
      />
    </div>
  );
}

function Cell({ children, right = false, header = false }) {
  const baseStyle = header ? styles.th : styles.td;
  return <td style={{ ...baseStyle, ...(right ? styles.tdRight : {}) }}>{children}</td>;
}

export default function CrudeSimulatorLiveDemo() {
  const [fr1, setFr1] = useState(REFERENCE_INPUTS.fr1);
  const [fr2, setFr2] = useState(REFERENCE_INPUTS.fr2);
  const [fr3, setFr3] = useState(REFERENCE_INPUTS.fr3);
  const [fr4, setFr4] = useState(REFERENCE_INPUTS.fr4);
  const [fractionation, setFractionation] = useState(REFERENCE_INPUTS.fractionation);

  const yields = useMemo(() => normalizeYields(fr1, fr2, fr3, fr4), [fr1, fr2, fr3, fr4]);
  const result = useMemo(() => simulate(yields, fractionation), [yields, fractionation]);
  const reference = useMemo(() => simulate(normalizeYields(15, 15, 15, 15), 7), []);

  const superimposedData = useMemo(() => {
    return result.crudeCurve.map((point) => {
      const row = { overallVolPct: point.overallVolPct, crude: point.tempC };
      result.fractions.forEach((fraction) => {
        const xValues = fraction.overallCurve.map((curvePoint) => curvePoint.overallVolPct);
        const yValues = fraction.overallCurve.map((curvePoint) => curvePoint.tempC);
        const minX = xValues[0];
        const maxX = xValues[xValues.length - 1];
        row[fraction.name] = point.overallVolPct >= minX && point.overallVolPct <= maxX
          ? interpolate(xValues, yValues, point.overallVolPct)
          : null;
      });
      return row;
    });
  }, [result]);

  const individualData = useMemo(() => {
    return Array.from({ length: 101 }, (_, localVolPct) => {
      const row = { localVolPct };
      result.fractions.forEach((fraction) => {
        row[fraction.name] = fraction.localCurve[localVolPct].tempC;
      });
      return row;
    });
  }, [result]);

  const totalInput = fr1 + fr2 + fr3 + fr4;

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.hero}>
          <div>
            <p style={styles.eyebrow}>Live preview</p>
            <h1 style={styles.h1}>EduProc Crude Oil Distillation Simulator</h1>
            <p style={{ ...styles.muted, maxWidth: '850px', marginTop: '12px' }}>
              Interactive browser demo. Adjust FR1–FR4 and the fractionation number to update the quality tables and distillation curves instantly.
            </p>
          </div>
          <button
            onClick={() => {
              setFr1(15); setFr2(15); setFr3(15); setFr4(15); setFractionation(7);
            }}
            style={styles.button}
          >
            Reset to reference case
          </button>
        </div>

        <div style={styles.mainGrid}>
          <div style={{ ...styles.card, ...styles.stickyCard }}>
            <h2 style={styles.h2}>Inputs</h2>
            <p style={styles.muted}>FR5 is automatically calculated as the balance to 100%.</p>

            <div style={{ marginTop: '28px' }}>
              <Slider label="FR1 yield" value={formatOneDecimal(fr1)} setValue={setFr1} min={0} max={60} step={0.5} suffix="%" />
              <Slider label="FR2 yield" value={formatOneDecimal(fr2)} setValue={setFr2} min={0} max={60} step={0.5} suffix="%" />
              <Slider label="FR3 yield" value={formatOneDecimal(fr3)} setValue={setFr3} min={0} max={60} step={0.5} suffix="%" />
              <Slider label="FR4 yield" value={formatOneDecimal(fr4)} setValue={setFr4} min={0} max={60} step={0.5} suffix="%" />
              <Slider label="Fractionation number" value={fractionation} setValue={setFractionation} min={0} max={15} step={1} />
            </div>

            <div style={styles.balance}>
              <div style={{ marginBottom: '12px', fontWeight: 800, color: '#10233f' }}>Yield balance</div>
              <div style={styles.balanceGrid}>
                <span>FR1–FR4 input sum</span><span>{formatOneDecimal(totalInput)}%</span>
                <span>FR5 balance</span><span>{formatOneDecimal(yields[4])}%</span>
              </div>
              {totalInput > 100 && (
                <p style={{ margin: '14px 0 0', color: '#9a5b00', lineHeight: 1.5 }}>
                  FR1–FR4 exceeds 100%, so the app scales them proportionally and sets FR5 to 0%.
                </p>
              )}
            </div>
          </div>

          <div style={styles.sectionStack}>
            <div style={styles.card}>
              <h2 style={styles.h2}>Current qualities</h2>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <Cell header>Fraction</Cell>
                      <Cell header right>Yield (%)</Cell>
                      <Cell header right>Flashpoint (°C)</Cell>
                      <Cell header right>Viscosity (cSt)</Cell>
                      <Cell header right>Overlap 10–90% (°C)</Cell>
                    </tr>
                  </thead>
                  <tbody>
                    {result.fractions.map((fraction) => (
                      <tr key={fraction.name}>
                        <Cell><strong>{fraction.name}</strong></Cell>
                        <Cell right>{formatOneDecimal(fraction.yieldPct)}</Cell>
                        <Cell right>{formatOneDecimal(fraction.flashpointC)}</Cell>
                        <Cell right>{formatViscosity(fraction.viscosityCst)}</Cell>
                        <Cell right>{fraction.overlapC == null ? '-' : formatOneDecimal(fraction.overlapC)}</Cell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={styles.h3}>Reference case</h3>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <Cell header>Fraction</Cell>
                      <Cell header right>Yield (%)</Cell>
                      <Cell header right>Flashpoint (°C)</Cell>
                      <Cell header right>Viscosity (cSt)</Cell>
                      <Cell header right>Overlap 10–90% (°C)</Cell>
                    </tr>
                  </thead>
                  <tbody>
                    {reference.fractions.map((fraction) => (
                      <tr key={fraction.name}>
                        <Cell><strong>{fraction.name}</strong></Cell>
                        <Cell right>{formatOneDecimal(fraction.yieldPct)}</Cell>
                        <Cell right>{formatOneDecimal(fraction.flashpointC)}</Cell>
                        <Cell right>{formatViscosity(fraction.viscosityCst)}</Cell>
                        <Cell right>{fraction.overlapC == null ? '-' : formatOneDecimal(fraction.overlapC)}</Cell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.chartGrid}>
              <div style={styles.card}>
                <div style={{ marginBottom: '12px' }}>
                  <h2 style={styles.chartHeading}>Distillation curves superimposed on crude oil curve</h2>
                  <p style={styles.helper}>Overall crude volume % on x-axis</p>
                </div>
                <div style={styles.chartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={superimposedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="overallVolPct" />
                      <YAxis domain={[0, 900]} />
                      <Tooltip formatter={(value) => formatTwoDecimals(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="crude" stroke="#5c6b73" strokeWidth={2} dot={false} name="Crude" />
                      {result.fractions.map((fraction, index) => (
                        <Line key={fraction.name} type="monotone" dataKey={fraction.name} stroke={COLORS[index]} strokeWidth={2} dot={false} connectNulls={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.card}>
                <div style={{ marginBottom: '12px' }}>
                  <h2 style={styles.chartHeading}>Distillation curves individually displayed</h2>
                  <p style={styles.helper}>Local fraction volume % on x-axis</p>
                </div>
                <div style={styles.chartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={individualData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="localVolPct" />
                      <YAxis domain={[0, 900]} />
                      <Tooltip formatter={(value) => formatTwoDecimals(value)} />
                      <Legend />
                      {result.fractions.map((fraction, index) => (
                        <Line key={fraction.name} type="monotone" dataKey={fraction.name} stroke={COLORS[index]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={{ marginBottom: '12px' }}>
                <h2 style={styles.h2}>Tabular format</h2>
                <p style={styles.helper}>Temperatures by local fraction volume percentage.</p>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <Cell header>Vol %</Cell>
                      {result.fractions.map((fraction) => (
                        <Cell key={fraction.name} header right>{fraction.name}</Cell>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.tabularRows.map((row) => (
                      <tr key={row.localVolPct}>
                        <Cell><strong>{row.localVolPct}</strong></Cell>
                        {result.fractions.map((fraction) => (
                          <Cell key={`${row.localVolPct}-${fraction.name}`} right>
                            {formatOneDecimal(row[fraction.name])}
                          </Cell>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 1180px) {
            .responsive-chart-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 1080px) {
            .responsive-main-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
