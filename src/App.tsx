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
import './styles.css';

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

function crudeTemp(volPct: number) {
  return POLY.reduce((sum, coefficient, index) => sum + coefficient * volPct ** index, 0);
}

function viscosity(tempC: number) {
  const exponent = VISC_POLY.reduce((sum, coefficient, index) => sum + coefficient * tempC ** index, 0);
  return Math.exp(exponent);
}

function interpolate(xValues: number[], yValues: number[], x: number) {
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

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeYields(fr1: number, fr2: number, fr3: number, fr4: number) {
  const safe = [fr1, fr2, fr3, fr4].map((value) => Math.max(0, Math.min(100, value)));
  const total = safe.reduce((sum, value) => sum + value, 0);
  if (total <= 100) return [...safe, 100 - total];
  const scale = 100 / total;
  const scaled = safe.map((value) => value * scale);
  return [...scaled, 0];
}

type CurvePoint = { overallVolPct: number; tempC: number };
type LocalCurvePoint = { localVolPct: number; tempC: number };
type Fraction = {
  name: string;
  yieldPct: number;
  flashpointC: number;
  viscosityCst: number;
  localCurve: LocalCurvePoint[];
  overallCurve: CurvePoint[];
  overlapC?: number;
};

function simulate(yields: number[], fractionationNumber: number) {
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

  const fractions: Fraction[] = yields.map((yieldPct, index) => {
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
    const row: Record<string, number> = { localVolPct: point };
    fractions.forEach((fraction) => {
      row[fraction.name] = fraction.localCurve[point].tempC;
    });
    return row;
  });

  return { fractionationNumber: clampedFractionation, fractions, crudeCurve, tabularRows };
}

function formatOneDecimal(value: number) {
  return round(value, 1).toFixed(1);
}

function formatTwoDecimals(value: number | string) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return round(numericValue, 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatViscosity(value: number) {
  if (!Number.isFinite(value) || value > 10000) return '∞';
  if (value >= 1000) return round(value, 0).toLocaleString();
  return round(value, 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type SliderProps = {
  label: string;
  value: string | number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
};

function Slider({ label, value, setValue, min, max, step, suffix = '' }: SliderProps) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
        <label>{label}</label>
        <span>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={typeof value === 'string' ? Number(value) : value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export default function App() {
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
      const row: Record<string, number | null> = { overallVolPct: point.overallVolPct, crude: point.tempC };
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
      const row: Record<string, number> = { localVolPct };
      result.fractions.forEach((fraction) => {
        row[fraction.name] = fraction.localCurve[localVolPct].tempC;
      });
      return row;
    });
  }, [result]);

  const totalInput = fr1 + fr2 + fr3 + fr4;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Live preview</p>
              <h1 className="text-3xl font-bold text-slate-900">EduProc Crude Oil Distillation Simulator</h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Interactive browser demo. Adjust FR1–FR4 and the fractionation number to update the quality tables and distillation curves instantly.
              </p>
            </div>
            <button
              onClick={() => {
                setFr1(15); setFr2(15); setFr3(15); setFr4(15); setFractionation(7);
              }}
              className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset to reference case
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-4 lg:self-start">
            <h2 className="text-xl font-semibold text-slate-900">Inputs</h2>
            <p className="mt-1 text-sm text-slate-500">FR5 is automatically calculated as the balance to 100%.</p>

            <div className="mt-6">
              <Slider label="FR1 yield" value={formatOneDecimal(fr1)} setValue={setFr1} min={0} max={60} step={0.5} suffix="%" />
              <Slider label="FR2 yield" value={formatOneDecimal(fr2)} setValue={setFr2} min={0} max={60} step={0.5} suffix="%" />
              <Slider label="FR3 yield" value={formatOneDecimal(fr3)} setValue={setFr3} min={0} max={60} step={0.5} suffix="%" />
              <Slider label="FR4 yield" value={formatOneDecimal(fr4)} setValue={setFr4} min={0} max={60} step={0.5} suffix="%" />
              <Slider label="Fractionation number" value={fractionation} setValue={setFractionation} min={0} max={15} step={1} />
            </div>

            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm">
              <div className="mb-2 font-semibold text-slate-900">Yield balance</div>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-slate-700">
                <span>FR1–FR4 input sum</span><span>{formatOneDecimal(totalInput)}%</span>
                <span>FR5 balance</span><span>{formatOneDecimal(yields[4])}%</span>
              </div>
              {totalInput > 100 && (
                <p className="mt-3 text-amber-700">FR1–FR4 exceeds 100%, so the app scales them proportionally and sets FR5 to 0%.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Current qualities</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700">
                      <th className="border-b border-slate-200 px-3 py-3 text-left">Fraction</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">Yield (%)</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">Flashpoint (°C)</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">Viscosity (cSt)</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">Overlap 10–90% (°C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.fractions.map((fraction) => (
                      <tr key={fraction.name} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-3 py-3 text-left font-medium">{fraction.name}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right">{formatOneDecimal(fraction.yieldPct)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right">{formatOneDecimal(fraction.flashpointC)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right">{formatViscosity(fraction.viscosityCst)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right">{fraction.overlapC == null ? '-' : formatOneDecimal(fraction.overlapC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mt-8 text-lg font-semibold text-slate-900">Reference case</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700">
                      <th className="border-b border-slate-200 px-3 py-3 text-left">Fraction</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">Yield (%)</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">Flashpoint (°C)</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">Viscosity (cSt)</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right">Overlap 10–90% (°C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reference.fractions.map((fraction) => (
                      <tr key={fraction.name} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-3 py-3 text-left font-medium">{fraction.name}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right">{formatOneDecimal(fraction.yieldPct)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right">{formatOneDecimal(fraction.flashpointC)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right">{formatViscosity(fraction.viscosityCst)}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-right">{fraction.overlapC == null ? '-' : formatOneDecimal(fraction.overlapC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Distillation curves superimposed on crude oil curve</h2>
                  <p className="text-sm text-slate-500">Overall crude volume % on x-axis</p>
                </div>
                <div className="h-[360px] w-full">
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

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Distillation curves individually displayed</h2>
                  <p className="text-sm text-slate-500">Local fraction volume % on x-axis</p>
                </div>
                <div className="h-[360px] w-full">
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

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Tabular format</h2>
                <p className="text-sm text-slate-500">Temperatures by local fraction volume percentage.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700">
                      <th className="border-b border-slate-200 px-3 py-3 text-left">Vol %</th>
                      {result.fractions.map((fraction) => (
                        <th key={fraction.name} className="border-b border-slate-200 px-3 py-3 text-right">{fraction.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.tabularRows.map((row) => (
                      <tr key={row.localVolPct} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-3 py-3 text-left font-medium">{row.localVolPct}</td>
                        {result.fractions.map((fraction) => (
                          <td key={`${row.localVolPct}-${fraction.name}`} className="border-b border-slate-100 px-3 py-3 text-right">
                            {formatOneDecimal(row[fraction.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
