import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Types ─────────────────────────────────────────────────────────────────

export interface Watchlist {
  id: number
  name: string
  createdAt: string
}

export interface GammaMarketSummary {
  id: string
  question: string
  slug: string
  yesTokenId: string
  noTokenId: string
}

export interface RuleDto {
  id: number
  watchlistMarketId: number
  lowThreshold: number
  highThreshold: number
}

export interface WatchlistViewRow {
  watchlistMarketId: number
  marketId: string
  question: string
  yesPct: number | null
  noPct: number | null
  isInRange: boolean | null
  priceUpdatedAt: string | null
  rule: RuleDto | null
}

// ── Watchlists ─────────────────────────────────────────────────────────────

export const getWatchlists = () =>
  api.get<Watchlist[]>('/watchlists').then(r => r.data)

export const createWatchlist = (name: string) =>
  api.post<Watchlist>('/watchlists', { name }).then(r => r.data)

export const getWatchlistView = (
  id: number,
  inRangeOnly?: boolean,
  sort?: string
) => {
  const params: Record<string, string> = {}
  if (inRangeOnly) params.inRangeOnly = 'true'
  if (sort) params.sort = sort
  return api.get<WatchlistViewRow[]>(`/watchlists/${id}/view`, { params }).then(r => r.data)
}

// ── Markets ────────────────────────────────────────────────────────────────

export const searchMarkets = (q: string) =>
  api.get<GammaMarketSummary[]>('/search', { params: { q } }).then(r => r.data)

export const addMarket = (
  watchlistId: number,
  market: { marketId: string; question: string; yesTokenId: string; noTokenId: string }
) =>
  api.post(`/watchlists/${watchlistId}/markets`, market).then(r => r.data)

export const removeMarket = (watchlistId: number, watchlistMarketId: number) =>
  api.delete(`/watchlists/${watchlistId}/markets/${watchlistMarketId}`)

// ── Rules ─────────────────────────────────────────────────────────────────

export const createRule = (
  watchlistMarketId: number,
  lowThreshold: number,
  highThreshold: number
) =>
  api.post<RuleDto>('/rules', { watchlistMarketId, lowThreshold, highThreshold }).then(r => r.data)

export const deleteRule = (ruleId: number) =>
  api.delete(`/rules/${ruleId}`)
