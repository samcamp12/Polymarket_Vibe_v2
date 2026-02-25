import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWatchlists, createWatchlist, Watchlist } from '../api'

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [newName, setNewName]       = useState('')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const navigate = useNavigate()

  const load = async () => {
    try {
      setWatchlists(await getWatchlists())
    } catch {
      setError('Failed to load watchlists.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const wl = await createWatchlist(newName.trim())
      setWatchlists(prev => [wl, ...prev])
      setNewName('')
    } catch {
      setError('Failed to create watchlist.')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-purple-300 mb-6">My Watchlists</h1>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-3 mb-8">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New watchlist name…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded"
        >
          + Create
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      <div className="space-y-3">
        {watchlists.map(wl => (
          <div
            key={wl.id}
            onClick={() => navigate(`/watchlists/${wl.id}`)}
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg px-5 py-4 cursor-pointer flex justify-between items-center group"
          >
            <div>
              <p className="font-medium text-gray-100 group-hover:text-purple-300 transition-colors">
                {wl.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Created {new Date(wl.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className="text-gray-500 group-hover:text-purple-400 text-xl">›</span>
          </div>
        ))}
        {!loading && watchlists.length === 0 && (
          <p className="text-gray-500 text-sm">No watchlists yet. Create one above.</p>
        )}
      </div>
    </div>
  )
}
