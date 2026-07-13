/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { api } from '@/lib/api'

import type { RankingPeriod, RankingsSnapshot } from './types'

type RankingsResponse = {
  success: boolean
  message?: string
  data: RankingsSnapshot
}

export async function getRankings(
  period: RankingPeriod
): Promise<RankingsResponse> {
  const res = await api.get('/api/rankings', {
    params: { period },
    skipBusinessError: true,
    skipErrorHandler: true,
  })
  return normalizeRankingsResponse(res.data)
}

function normalizeRankingsResponse(raw: unknown): RankingsResponse {
  const response = isRecord(raw) ? raw : {}
  if (response.success === false) {
    throw new Error(
      typeof response.message === 'string' ? response.message : 'Request failed'
    )
  }

  const data = isRecord(response.data) ? response.data : {}
  const modelsHistory = isRecord(data.models_history) ? data.models_history : {}
  const vendorShareHistory = isRecord(data.vendor_share_history)
    ? data.vendor_share_history
    : {}

  return {
    success: response.success === true,
    message:
      typeof response.message === 'string' ? response.message : undefined,
    data: {
      models: arrayOrEmpty(data.models),
      vendors: arrayOrEmpty(data.vendors),
      top_movers: arrayOrEmpty(data.top_movers),
      top_droppers: arrayOrEmpty(data.top_droppers),
      models_history: {
        points: arrayOrEmpty(modelsHistory.points),
        models: arrayOrEmpty(modelsHistory.models),
        buckets:
          typeof modelsHistory.buckets === 'number' ? modelsHistory.buckets : 0,
      },
      vendor_share_history: {
        points: arrayOrEmpty(vendorShareHistory.points),
        vendors: arrayOrEmpty(vendorShareHistory.vendors),
        buckets:
          typeof vendorShareHistory.buckets === 'number'
            ? vendorShareHistory.buckets
            : 0,
      },
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function arrayOrEmpty<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}
