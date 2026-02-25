import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { searchMarkets, addMarket, GammaMarketSummary } from '../api'

export default function AddMarketPage() {
  const { id } = useParams<{ id: string }>()
  const watchlistId = Number(id)
  const navigate = useNavigate()

  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<GammaMarketSummary[]>([])
  const [loading, setLoading]   = useState(false)
  const [adding, setAdding]     = useState<string | null>(null)  // marketId being added
  const [added, setAdded]       = useState<Set<string>>(new Set())
  const [error, setError]       = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await searchMarkets(query.trim())
      setResults(data)
      if (data.length === 0) setError('No markets found.')
    } catch {
      setError('Search failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (market: GammaMarketSummary) => {
    setAdding(market.id)
    try {
      await addMarket(watchlistId, {
        marketId:   market.id,
        question:   market.question,
        yesTokenId: market.yesTokenId,
        noTokenId:  market.noTokenId
      })
      setAdded(prev => new Set([...prev, market.id]))
    } catch {
      setError(`Failed to add "${market.question}".`)
    } finally {
      setAdding(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/watchlists/${id}`)} className="text-gray-500 hover:text-gray-300 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-purple-300">Add Market</h1>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search Polymarket (e.g. bitcoin, election, …)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Results */}
      <div className="space-y-3">
        {results.map(m => (
          <div
            key={m.id}
            className="bg-gray-800 border border-gray-700 rounded-lg px-5 py-4 flex justify-between items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-gray-100 text-sm leading-snug">{m.question}</p>
              <p className="text-xs text-gray-600 mt-0.5 truncate">
                id: {m.id} &nbsp;|&nbsp; YES: {m.yesTokenId} &nbsp;|&nbsp; NO: {m.noTokenId}
              </p>
            </div>
            <button
              onClick={() => handleAdd(m)}
              disabled={adding === m.id || added.has(m.id)}
              className={`text-sm font-medium px-4 py-1.5 rounded shrink-0 ${
                added.has(m.id)
                  ? 'bg-green-800 text-green-300 cursor-default'
                  : 'bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white'
              }`}
            >
              {added.has(m.id) ? '✓ Added' : adding === m.id ? 'Adding…' : 'Add'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
