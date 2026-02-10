import { roleProfiles, tendencyQuestions, type TraitKey } from './data'

export type AnswerValue = 1 | 2 | 3 | 4 | 5

export type RoleResult = {
  key: string
  label: string
  description: string
  score: number
}

export type TendencyResultPayload = {
  generatedAt: string
  totalQuestions: number
  results: RoleResult[]
}

const valueToDelta: Record<AnswerValue, number> = {
  1: -2,
  2: -1,
  3: 0,
  4: 1,
  5: 2,
}

export function computeRoleResults(answers: Record<number, AnswerValue>): RoleResult[] {
  const computed = roleProfiles.map((role) => {
    let raw = 0
    let maxAbs = 0

    for (const q of tendencyQuestions) {
      const answer = answers[q.id]
      if (!answer) continue

      const baseDelta = valueToDelta[answer]
      const signedDelta = q.reverse ? -baseDelta : baseDelta
      const traitWeight = role.traits[q.trait as TraitKey] ?? 0

      raw += signedDelta * traitWeight
      maxAbs += Math.abs(2 * traitWeight)
    }

    const score = maxAbs === 0 ? 0 : Math.round((raw / maxAbs) * 100)
    return { key: role.key, label: role.label, description: role.description, score }
  })

  return computed.sort((a, b) => b.score - a.score)
}

export function encodePayload(payload: TendencyResultPayload): string {
  if (typeof window === 'undefined') return ''
  const json = JSON.stringify(payload)
  const encoded = btoa(unescape(encodeURIComponent(json)))
  return encodeURIComponent(encoded)
}

export function decodePayload(raw: string | null): TendencyResultPayload | null {
  if (!raw || typeof window === 'undefined') return null
  try {
    const decoded = decodeURIComponent(raw)
    const json = decodeURIComponent(escape(atob(decoded)))
    const parsed = JSON.parse(json) as TendencyResultPayload
    if (!Array.isArray(parsed.results)) return null
    return parsed
  } catch {
    return null
  }
}

export function getBarColor(score: number) {
  if (score >= 70) return 'bg-sky-500'
  if (score >= 40) return 'bg-emerald-500'
  if (score >= 15) return 'bg-teal-500'
  if (score <= -70) return 'bg-orange-500'
  if (score <= -40) return 'bg-amber-500'
  if (score <= -15) return 'bg-yellow-500'
  return 'bg-slate-500'
}

export function getScoreTextColor(score: number) {
  if (score >= 15) return 'text-sky-400'
  if (score <= -15) return 'text-amber-400'
  return 'text-slate-400'
}

export function getIntensityText(score: number) {
  if (score >= 70) return '매우 강함'
  if (score >= 40) return '강한 편'
  if (score >= 15) return '약간 높음'
  if (score <= -70) return '매우 낮음'
  if (score <= -40) return '낮은 편'
  if (score <= -15) return '약간 낮음'
  return '중립'
}

