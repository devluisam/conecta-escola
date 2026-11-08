import type { GradeView } from "@/lib/data/repository"
import type { Subject } from "@/lib/types"

const round1 = (n: number) => Math.round(n * 10) / 10
const norm = (g: { score: number; maxScore: number }) => (g.score / g.maxScore) * 10

export function average(values: number[]) {
  return values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null
}

/** Média (0–10) de cada disciplina, considerando todas as avaliações. */
export function averageBySubject(grades: GradeView[]) {
  const map = new Map<string, { subject: Subject; values: number[] }>()
  for (const g of grades) {
    const entry = map.get(g.subjectId) ?? { subject: g.subject, values: [] }
    entry.values.push(norm(g))
    map.set(g.subjectId, entry)
  }
  return [...map.values()]
    .map(({ subject, values }) => ({ subject, name: subject.name, code: subject.code, color: subject.color, average: average(values) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

/** Média por disciplina e bimestre: { [subjectId]: { [term]: média } } */
export function averageBySubjectTerm(grades: GradeView[]) {
  const out: Record<string, Record<number, number | null>> = {}
  const groups = new Map<string, number[]>()
  for (const g of grades) {
    const k = `${g.subjectId}|${g.term}`
    groups.set(k, [...(groups.get(k) ?? []), norm(g)])
  }
  for (const [k, values] of groups) {
    const [subjectId, term] = k.split("|")
    out[subjectId] ??= {}
    out[subjectId][Number(term)] = average(values)
  }
  return out
}

/** Linhas para o gráfico de evolução: [{ term: "1º bim", sub-mat: 7.2, ... }] */
export function termEvolution(grades: GradeView[], terms: number) {
  const bySubject = averageBySubjectTerm(grades)
  return Array.from({ length: terms }, (_, i) => {
    const row: Record<string, number | string | null> = { term: `${i + 1}º bim.` }
    for (const [subjectId, byTerm] of Object.entries(bySubject)) row[subjectId] = byTerm[i + 1] ?? null
    return row
  })
}

export function overallAverage(grades: GradeView[]) {
  return average(averageBySubject(grades).map((s) => s.average))
}
