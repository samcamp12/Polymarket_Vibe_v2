import { useEffect, useState, useCallback } from 'react'
import { getPopularMarkets, PopularMarket, getWatchlists, addMarket, Watchlist } from '../api'

// ── Category definitions ────────────────────────────────────────────────────

interface Category {
  slug: string
  label: string
  emoji: string
}

const ALL_CATEGORIES: Category[] = [
  { slug: 'politics',      label: 'Politics',       emoji: '🏛️' },
  { slug: 'crypto',        label: 'Crypto',          emoji: '₿' },
  { slug: 'sports',        label: 'Sports',          emoji: '⚽' },
  { slug: 'science',       label: 'Science',         emoji: '🔬' },
  { slug: 'entertainment', label: 'Entertainment',   emoji: '🎬' },
  { slug: 'business',      label: 'Business',        emoji: '📊' },
  { slug: 'technology',    label: 'Technology',      emoji: '💻' },
  { slug: 'climate',       label: 'Climate',         emoji: '🌍' },
  { slug: 'health',        label: 'Health',          emoji: '🏥' },
  { slug: 'elections',     label: 'Elections',       emoji: '🗳️' },
  { slug: 'world',         label: 'World Events',    emoji: '🌐' },
  { slug: 'finance',       label: 'Finance',         emoji: '💰' },
]

const DEFAULT_CATEGORIES = ['politics', 'crypto', 'sports', 'science', 'entertainment', 'business']
const STORAGE_KEY = 'polywatch_categories'
const MAX_CATEGORIES = 6

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number | null): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

function fmtVol(v: number | null): string {
  if (v == null) return ''
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function probColor(pct: number | null): string {
  if (pct == null) return 'bg-gray-600'
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 50) return 'bg-lime-500'
  if (pct >= 30) return 'bg-yellow-500'
  return 'bg-red-500'
}

// ── Market Card ──────────────────────────────────────────────────────────────

function MarketCard({ market, onAddToWatchlist }: {
  market: PopularMarket
  onAddToWatchlist: (market: PopularMarket) => void
}) {
  const yp = market.yesPct
  const barPct = yp != null ? Math.min(100, Math.max(0, yp)) : null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-3 hover:border-purple-700 transition-colors">
      {/* Question */}
      <p className="text-sm text-gray-100 font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
        {market.question}
      </p>

      {/* Probability bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>YES</span>
          <span className="font-semibold text-gray-200">{fmt(yp)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
          {barPct != null && (
            <div
              className={`h-full rounded-full ${probColor(yp)} transition-all`}
              style={{ width: `${barPct}%` }}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-gray-500">{fmtVol(market.volume)}</span>
        <div className="flex gap-2">
          <a
            href={`https://polymarket.com/event/${market.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
          >
            View ↗
          </a>
          <button
            onClick={() => onAddToWatchlist(market)}
            className="text-xs bg-gray-700 hover:bg-purple-700 text-gray-300 hover:text-white px-2 py-0.5 rounded transition-colors"
          >
            + Watch
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ category, onAddToWatchlist }: {
  category: Category
  onAddToWatchlist: (market: PopularMarket) => void
}) {
  const [markets, setMarkets] = useState<PopularMarket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPopularMarkets(category.slug, 6)
      .then(setMarkets)
      .catch(() => setMarkets([]))
      .finally(() => setLoading(false))
  }, [category.slug])

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span>{category.emoji}</span> {category.label}
      </h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg h-32 animate-pulse" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <p className="text-gray-600 text-sm italic">No markets available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {markets.map(m => (
            <MarketCard key={m.id} market={m} onAddToWatchlist={onAddToWatchlist} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── Customize Modal ───────────────────────────────────────────────────────────

function CustomizeModal({
  selected,
  onSave,
  onClose,
}: {
  selected: string[]
  onSave: (slugs: string[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<string[]>(selected)

  const toggle = (slug: string) => {
    setDraft(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : prev.length < MAX_CATEGORIES
          ? [...prev, slug]
          : prev
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-purple-300">Customize Categories</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Pick up to {MAX_CATEGORIES} categories ({draft.length}/{MAX_CATEGORIES} selected)
        </p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {ALL_CATEGORIES.map(cat => {
            const active = draft.includes(cat.slug)
            const disabled = !active && draft.length >= MAX_CATEGORIES
            return (
              <button
                key={cat.slug}
                onClick={() => toggle(cat.slug)}
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${active
                    ? 'border-purple-500 bg-purple-900/40 text-purple-200'
                    : disabled
                      ? 'border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
              >
                <span>{cat.emoji}</span> {cat.label}
              </button>
            )
          })}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200 px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose() }}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-5 py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add to Watchlist Modal ────────────────────────────────────────────────────

function AddToWatchlistModal({
  market,
  onClose,
}: {
  market: PopularMarket
  onClose: () => void
}) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [loading, setLoading]       = useState(true)
  const [adding, setAdding]         = useState<number | null>(null)
  const [added, setAdded]           = useState<Set<number>>(new Set())
  const [error, setError]           = useState('')

  useEffect(() => {
    getWatchlists()
      .then(setWatchlists)
      .catch(() => setError('Could not load watchlists.'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (watchlistId: number) => {
    setAdding(watchlistId)
    try {
      await addMarket(watchlistId, {
        marketId:   market.id,
        question:   market.question,
        yesTokenId: market.yesTokenId,
        noTokenId:  market.noTokenId,
      })
      setAdded(prev => new Set([...prev, watchlistId]))
    } catch {
      setError('Failed to add market.')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-purple-300">Add to Watchlist</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-400 mb-4 line-clamp-2">{market.question}</p>
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : watchlists.length === 0 ? (
          <p className="text-gray-500 text-sm">No watchlists yet. Create one first.</p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {watchlists.map(wl => (
              <div key={wl.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-200">{wl.name}</span>
                {added.has(wl.id) ? (
                  <span className="text-xs text-green-400 font-medium">✓ Added</span>
                ) : (
                  <button
                    onClick={() => handleAdd(wl.id)}
                    disabled={adding === wl.id}
                    className="text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1 rounded"
                  >
                    {adding === wl.id ? '…' : '+ Add'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="mt-4 text-xs text-gray-500 hover:text-gray-300">
          Close
        </button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [trending, setTrending]             = useState<PopularMarket[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [selectedCategories, setSelected]   = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { }
    return DEFAULT_CATEGORIES
  })
  const [showCustomize, setShowCustomize]   = useState(false)
  const [watchTarget, setWatchTarget]       = useState<PopularMarket | null>(null)

  useEffect(() => {
    getPopularMarkets(undefined, 8)
      .then(setTrending)
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false))
  }, [])

  const saveCategories = useCallback((slugs: string[]) => {
    setSelected(slugs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  }, [])

  const activeCats = ALL_CATEGORIES.filter(c => selectedCategories.includes(c.slug))

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold text-purple-300 mb-1">Popular Markets</h1>
        <p className="text-sm text-gray-500">Browse trending prediction markets from Polymarket</p>
      </div>

      {/* Trending section */}
      <section>
        <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
          🔥 Trending
        </h2>
        {trendingLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {trending.map(m => (
              <MarketCard key={m.id} market={m} onAddToWatchlist={setWatchTarget} />
            ))}
          </div>
        )}
      </section>

      {/* Category sections header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-300">Browse by Category</h2>
        <button
          onClick={() => setShowCustomize(true)}
          className="text-xs text-purple-400 hover:text-purple-300 border border-purple-800 hover:border-purple-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          ✏️ Edit Categories
        </button>
      </div>

      {/* Category pills (read-only preview) */}
      <div className="-mt-7 flex flex-wrap gap-2">
        {activeCats.map(cat => (
          <span key={cat.slug} className="text-xs bg-gray-800 text-gray-400 border border-gray-700 rounded-full px-3 py-1">
            {cat.emoji} {cat.label}
          </span>
        ))}
      </div>

      {/* One section per selected category */}
      {activeCats.map(cat => (
        <CategorySection key={cat.slug} category={cat} onAddToWatchlist={setWatchTarget} />
      ))}

      {/* Modals */}
      {showCustomize && (
        <CustomizeModal
          selected={selectedCategories}
          onSave={saveCategories}
          onClose={() => setShowCustomize(false)}
        />
      )}
      {watchTarget && (
        <AddToWatchlistModal
          market={watchTarget}
          onClose={() => setWatchTarget(null)}
        />
      )}
    </div>
  )
}
