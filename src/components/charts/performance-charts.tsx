"use client"

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { fmtScore } from "@/lib/format"

type SubjectAvg = { name: string; code: string; color: string; average: number }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-navy">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          {p.color && <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />}
          {p.name && p.name !== "average" ? `${p.name}: ` : "Média: "}
          <strong className="text-navy">{fmtScore(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

/** Média por disciplina com linha da média mínima de aprovação. */
export function SubjectAverageChart({ data, passing = 6, height = 240 }: { data: SubjectAvg[]; passing?: number; height?: number }) {
  const summary = data.map((d) => `${d.name}: ${fmtScore(d.average)}`).join("; ")
  return (
    <figure>
      <figcaption className="sr-only">Média por disciplina. {summary}. Média mínima: {passing}.</figcaption>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E1E7F0" />
            <XAxis dataKey="code" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#586A84" }} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#586A84" }} />
            <Tooltip cursor={{ fill: "#EAF4FF" }} content={<ChartTooltip />} labelFormatter={(code) => data.find((d) => d.code === code)?.name ?? code} />
            <ReferenceLine y={passing} stroke="#F5B942" strokeDasharray="4 4" label={{ value: `Média ${passing}`, position: "insideTopRight", fontSize: 11, fill: "#9A6A07" }} />
            <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={40} label={{ position: "top", fontSize: 11, fill: "#0B1B33", formatter: (v: unknown) => fmtScore(Number(v)) }}>
              {data.map((d) => (
                <Cell key={d.code} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

/** Evolução por bimestre — uma linha por disciplina. */
export function TermEvolutionChart({
  data,
  series,
  height = 260,
}: {
  data: Record<string, number | string | null>[]
  series: { key: string; name: string; color: string }[]
  height?: number
}) {
  return (
    <figure>
      <figcaption className="sr-only">Evolução das médias por bimestre para {series.map((s) => s.name).join(", ")}.</figcaption>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E1E7F0" />
            <XAxis dataKey="term" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#586A84" }} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#586A84" }} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={6} stroke="#F5B942" strokeDasharray="4 4" />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} dot={{ r: 3.5 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-hidden>
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** Barras horizontais simples (indicadores administrativos). */
export function HorizontalBars({ data, max = 100, suffix = "%" }: { data: { label: string; value: number; color?: string }[]; max?: number; suffix?: string }) {
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="font-medium text-navy">{d.label}</span>
            <span className="font-semibold text-navy tabular-nums">
              {suffix === "%" ? d.value : fmtScore(d.value)}
              {suffix}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, (d.value / max) * 100)}%`, backgroundColor: d.color ?? "#1877D2" }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
