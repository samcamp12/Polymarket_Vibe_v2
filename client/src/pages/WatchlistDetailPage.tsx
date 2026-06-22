import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getWatchlistView, removeMarket, WatchlistViewRow } from '../api'

const POLL_INTERVAL_MS = 30_000   // 30 s

function pct(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

function RangeBadge({ isInRange, rule }: { isInRange: boolean | null; rule: WatchlistViewRow['rule'] }) {
  if (!rule) return <span className="text-xs text-gray-600 italic">no rule</span>
  if (isInRange === null) return <span className="text-xs text-gray-500">pending</span>
  return isInRange ? (
    <span className="inline-block rounded-full bg-green-700 text-green-100 text-xs px-2 py-0.5 font-semibold">
      IN RANGE
    </span>
  ) : (
    <span className="inline-block rounded-full bg-gray-700 text-gray-400 text-xs px-2 py-0.5">
      out of range
    </span>
  )
}

export default function WatchlistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const watchlistId = Number(id)
  const navigate = useNavigate()

  const [rows, setRows]           = useState<WatchlistViewRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [lastRefresh, setLast]    = useState<Date | null>(null)
  const [inRangeOnly, setFilter]  = useState(false)
  const [sort, setSort]           = useState('')
  const [removing, setRemoving]   = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async () => {
    try {
      const data = await getWatchlistView(watchlistId, inRangeOnly || undefined, sort || undefined)
      setRows(data)
      setLast(new Date())
    } catch {
      // silently ignore poll errors
    } finally {
      setLoading(false)
    }
  }

  // Initial load + whenever filters change
  useEffect(() => {
    setLoading(true)
    load()
  }, [watchlistId, inRangeOnly, sort])

  // Polling
  useEffect(() => {
    timerRef.current = setInterval(load, POLL_INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [watchlistId, inRangeOnly, sort])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/watchlists')} className="text-gray-500 hover:text-gray-300 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-purple-300">Watchlist #{watchlistId}</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <button
          onClick={() => navigate(`/watchlists/${id}/add-market`)}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-1.5 rounded"
        >
          + Add Market
        </button>

        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={inRangeOnly}
            onChange={e => setFilter(e.target.checked)}
            className="accent-purple-500"
          />
          In-range only
        </label>

        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
        >
          <option value="">Sort: default</option>
          <option value="yes_desc">YES% ↓</option>
          <option value="yes_asc">YES% ↑</option>
          <option value="flag">Flagged first</option>
        </select>

        {lastRefresh && (
          <span className="text-xs text-gray-600 ml-auto">
            Last updated: {lastRefresh.toLocaleTimeString()} (auto-refreshes every 30 s)
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {inRangeOnly ? 'No markets currently in range.' : 'No markets yet. Add one above.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Market</th>
                <th className="px-4 py-3 text-right">YES%</th>
                <th className="px-4 py-3 text-right">NO%</th>
                <th className="px-4 py-3 text-center">In Range</th>
                <th className="px-4 py-3 text-center">Rule</th>
                <th className="px-4 py-3 text-center">Updated</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map(row => (
                <tr
                  key={row.watchlistMarketId}
                  className={`hover:bg-gray-850 transition-colors ${row.isInRange ? 'bg-green-950/30' : ''}`}
                >
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-gray-100 leading-snug line-clamp-2">{row.question}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{row.marketId}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                    {pct(row.yesPct)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-rose-400">
                    {pct(row.noPct)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RangeBadge isInRange={row.isInRange} rule={row.rule} />
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {row.rule
                      ? `${(row.rule.lowThreshold * 100).toFixed(0)}–${(row.rule.highThreshold * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {row.priceUpdatedAt
                      ? new Date(row.priceUpdatedAt).toLocaleTimeString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() =>
                          navigate(`/watchlists/${id}/rules/${row.watchlistMarketId}`, {
                            state: { question: row.question, rule: row.rule }
                          })
                        }
                        className="text-xs text-purple-400 hover:text-purple-200 underline"
                      >
                        {row.rule ? 'Edit rule' : 'Set rule'}
                      </button>
                      <button
                        disabled={removing === row.watchlistMarketId}
                        onClick={async () => {
                          if (!confirm(`Remove "${row.question}" from this watchlist?`)) return
                          setRemoving(row.watchlistMarketId)
                          try {
                            await removeMarket(watchlistId, row.watchlistMarketId)
                            setRows(prev => prev.filter(r => r.watchlistMarketId !== row.watchlistMarketId))
                          } catch {
                            alert('Failed to remove market.')
                          } finally {
                            setRemoving(null)
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-300 underline disabled:opacity-40"
                      >
                        {removing === row.watchlistMarketId ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
