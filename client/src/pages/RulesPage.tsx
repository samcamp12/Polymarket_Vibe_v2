import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createRule, deleteRule, RuleDto } from '../api'

interface LocationState {
  question: string
  rule: RuleDto | null
}

export default function RulesPage() {
  const { id, marketId } = useParams<{ id: string; marketId: string }>()
  const watchlistId      = Number(id)
  const watchlistMarketId = Number(marketId)
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState | null }

  const existingRule = state?.rule ?? null
  const question     = state?.question ?? `Market #${watchlistMarketId}`

  // Pre-fill from existing rule or sensible defaults
  const [low,  setLow]  = useState(String(existingRule ? (existingRule.lowThreshold  * 100).toFixed(0) : '55'))
  const [high, setHigh] = useState(String(existingRule ? (existingRule.highThreshold * 100).toFixed(0) : '65'))
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const lo = parseFloat(low)   / 100
    const hi = parseFloat(high)  / 100
    if (isNaN(lo) || isNaN(hi) || lo < 0 || hi > 1 || lo >= hi) {
      setError('Low must be < High, both in 0–100 range.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createRule(watchlistMarketId, lo, hi)
      navigate(`/watchlists/${watchlistId}`)
    } catch {
      setError('Failed to save rule.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingRule) return
    setDeleting(true)
    try {
      await deleteRule(existingRule.id)
      navigate(`/watchlists/${watchlistId}`)
    } catch {
      setError('Failed to delete rule.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/watchlists/${id}`)} className="text-gray-500 hover:text-gray-300 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-purple-300">
          {existingRule ? 'Edit Rule' : 'Set Rule'}
        </h1>
      </div>

      <p className="text-sm text-gray-400 mb-6 leading-relaxed bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
        {question}
      </p>

      <p className="text-sm text-gray-400 mb-4">
        Flag this market when <strong className="text-emerald-400">YES%</strong> is between the two thresholds (inclusive).
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex gap-4">
          <label className="flex-1">
            <span className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Low (%)</span>
            <input
              type="number"
              min={0} max={99} step={1}
              value={low}
              onChange={e => setLow(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
            />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">High (%)</span>
            <input
              type="number"
              min={1} max={100} step={1}
              value={high}
              onChange={e => setHigh(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
            />
          </label>
        </div>

        {/* Preview */}
        <p className="text-xs text-gray-600">
          Rule: flag when YES ∈ [
          <span className="text-emerald-400 font-mono">{low || '?'}%</span>
          ,&nbsp;
          <span className="text-emerald-400 font-mono">{high || '?'}%</span>
          ]
        </p>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white text-sm font-medium px-5 py-2 rounded"
          >
            {saving ? 'Saving…' : 'Save Rule'}
          </button>

          {existingRule && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-800 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded"
            >
              {deleting ? 'Deleting…' : 'Delete Rule'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
