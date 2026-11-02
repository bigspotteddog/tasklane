export type AnalyticsPeriod = 'day' | '24h' | '7d' | '30d' | '90d' | '12mo' | 'all'

export type AnalyticsMetric = 'visitors' | 'visits' | 'pageviews' | 'viewsPerVisit' | 'bounceRate' | 'visitDuration'

export type AnalyticsBreakdownMetric = Exclude<AnalyticsMetric, 'viewsPerVisit'>

export type AnalyticsInterval = 'hour' | 'day' | 'month'

export type AnalyticsDimension = 'page' | 'source' | 'country' | 'browser' | 'os' | 'device'

export type AnalyticsFilterOperator = 'is' | 'isNot' | 'contains'

export type AnalyticsExportFormat = 'json' | 'csv'

export type AnalyticsErrorData = Record<string, unknown>

export interface AnalyticsFilter {
    dimension: AnalyticsDimension
    operator?: AnalyticsFilterOperator
    value: string | Array<string>
}

export interface AnalyticsRangeOptions {
    period?: AnalyticsPeriod
    from?: string
    to?: string
    filters?: Array<AnalyticsFilter>
}

export interface AnalyticsStatsOptions<M extends AnalyticsMetric = AnalyticsMetric> extends AnalyticsRangeOptions {
    metrics?: Array<M>
}

export interface AnalyticsTimeseriesOptions extends AnalyticsRangeOptions {
    interval?: AnalyticsInterval
}

export interface AnalyticsBreakdownOptions<M extends AnalyticsBreakdownMetric = 'visitors'> extends AnalyticsRangeOptions {
    metrics?: Array<M>
    limit?: number
    page?: number
}

export interface AnalyticsOverviewOptions extends AnalyticsRangeOptions {
    interval?: AnalyticsInterval
    limit?: number
}

export interface AnalyticsExportOptions {
    format?: AnalyticsExportFormat
}

export interface AnalyticsRange {
    period: AnalyticsPeriod | 'custom'
    from: string | null
    to: string | null
}

export interface AnalyticsStatus {
    enabled: boolean
    collecting: boolean
    installed: boolean
    published: boolean
    lastPublishedAt: string | null
}

export interface AnalyticsRealtime {
    visitors: number
    published: boolean
}

export interface AnalyticsTotals {
    visitors: number
    visits: number
    pageviews: number
    viewsPerVisit: number
    bounceRate: number
    visitDuration: number
}

export type AnalyticsStats<M extends AnalyticsMetric = AnalyticsMetric> = Pick<AnalyticsTotals, M> & { range: AnalyticsRange, published: boolean }

export interface AnalyticsPoint extends AnalyticsTotals {
    time: string
    partial: boolean
}

export interface AnalyticsSeries {
    interval: AnalyticsInterval
    partialIndex: number
    points: Array<AnalyticsPoint>
}

export interface AnalyticsTimeseries extends AnalyticsSeries {
    range: AnalyticsRange
    published: boolean
}

export type AnalyticsBreakdownRow<M extends AnalyticsBreakdownMetric = 'visitors'> = Pick<AnalyticsTotals, M> & { value: string, name?: string }

export interface AnalyticsBreakdown<M extends AnalyticsBreakdownMetric = 'visitors'> {
    range: AnalyticsRange
    published: boolean
    dimension: AnalyticsDimension
    page: number
    limit: number
    hasMore: boolean
    rows: Array<AnalyticsBreakdownRow<M>>
}

export interface AnalyticsOverview {
    range: AnalyticsRange
    published: boolean
    interval: AnalyticsInterval
    totals: AnalyticsTotals
    series: AnalyticsSeries
    breakdowns: Record<AnalyticsDimension, Array<AnalyticsBreakdownRow> | null>
    realtime: Pick<AnalyticsRealtime, 'visitors'> | null
    status: AnalyticsStatus
    failed: Array<string>
}

export interface AnalyticsExportRow {
    name: string
    visitors: number
    pageviews: number
}

export interface AnalyticsExport {
    period: 'all'
    published: boolean
    pages: Array<AnalyticsExportRow>
    sources: Array<AnalyticsExportRow>
    countries: Array<AnalyticsExportRow>
    browsers: Array<AnalyticsExportRow>
    operatingSystems: Array<AnalyticsExportRow>
    devices: Array<AnalyticsExportRow>
}

const RETRYABLE_STATUSES = [0, 429, 502, 503]
const REQUEST_TIMEOUT_MS = 30000
const TRAILING_SLASHES = /\/+$/
const RANGE_OPTION_KEYS = ['period', 'from', 'to', 'filters']
const STATS_OPTION_KEYS = [...RANGE_OPTION_KEYS, 'metrics']
const TIMESERIES_OPTION_KEYS = [...RANGE_OPTION_KEYS, 'interval']
const BREAKDOWN_OPTION_KEYS = [...RANGE_OPTION_KEYS, 'metrics', 'limit', 'page']
const OVERVIEW_OPTION_KEYS = [...RANGE_OPTION_KEYS, 'interval', 'limit']
const EXPORT_OPTION_KEYS = ['format']

export class AnalyticsError extends Error {
    status: number
    data: AnalyticsErrorData | null
    retryAfter: number | null
    retryable: boolean

    constructor(message: string, status: number, data: AnalyticsErrorData | null, retryAfter: number | null = null) {
        super(message)
        this.name = 'AnalyticsError'
        this.status = status
        this.data = data
        this.retryAfter = retryAfter
        this.retryable = RETRYABLE_STATUSES.includes(status)
    }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const assertOptions = (name: string, options: unknown, allowed: Array<string>): void => {
    if (options === null || options === undefined) return

    if (!isObject(options)) throw new Error(`${name} takes its options as an object.`)

    const unknown = Object.keys(options).filter(key => !allowed.includes(key))

    if (unknown.length > 0) throw new Error(`${name} does not accept the option ${unknown.join(', ')}. Allowed options: ${allowed.join(', ')}.`)
}

const baseUrl = (): string => (process.env.MODULIFY_ANALYTICS_URL || '').trim().replace(TRAILING_SLASHES, '')
const analyticsKey = (): string => (process.env.MODULIFY_ANALYTICS_KEY || '').trim()

const timeoutSignal = (): AbortSignal | undefined =>
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined

const unreachable = (error: unknown): AnalyticsError => {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')

    return new AnalyticsError(timedOut ? 'The analytics service did not answer in time.' : 'The analytics service could not be reached.', 0, null)
}

const readMessage = (payload: unknown, status: number): string =>
    isObject(payload) && typeof payload.message === 'string' && payload.message.trim() ? payload.message : `Analytics request failed with status ${status}.`

const readData = (payload: unknown): AnalyticsErrorData | null =>
    isObject(payload) && isObject(payload.data) ? payload.data : null

const readRetryAfter = (response: Response): number | null => {
    const seconds = Number.parseInt(response.headers.get('retry-after') || '', 10)

    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
}

const send = async (path: string, body: Record<string, unknown>): Promise<Response> => {
    if (typeof window !== 'undefined') throw new Error('@/lib/modulify/analytics is server-only and must not be used in a client component.')

    if (!baseUrl() || !analyticsKey()) throw new Error('Analytics is not configured for this environment. MODULIFY_ANALYTICS_URL and MODULIFY_ANALYTICS_KEY reach the preview when it starts and the published site when it is published again.')

    return fetch(`${baseUrl()}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Analytics-Key': analyticsKey()
        },
        body: JSON.stringify(body),
        signal: timeoutSignal()
    }).catch((error: unknown) => {
        throw unreachable(error)
    })
}

const request = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
    const response = await send(path, body)
    const payload: unknown = await response.json().catch(() => null)

    if (response.ok && isObject(payload) && payload.success === true) return payload.data as T

    throw new AnalyticsError(readMessage(payload, response.status), response.status, readData(payload), readRetryAfter(response))
}

const requestText = async (path: string, body: Record<string, unknown>): Promise<string> => {
    const response = await send(path, body)

    if (response.ok) return response.text().catch((error: unknown) => {
        throw unreachable(error)
    })

    const payload: unknown = await response.json().catch(() => null)

    throw new AnalyticsError(readMessage(payload, response.status), response.status, readData(payload), readRetryAfter(response))
}

export const getStatus = async (): Promise<AnalyticsStatus> => request<AnalyticsStatus>('/status', {})

export const getRealtimeVisitors = async (): Promise<number> => {
    const { visitors } = await request<AnalyticsRealtime>('/realtime', {})

    return visitors
}

export const getStats = async <M extends AnalyticsMetric = AnalyticsMetric>(options: AnalyticsStatsOptions<M> = {}): Promise<AnalyticsStats<M>> => {
    assertOptions('getStats', options, STATS_OPTION_KEYS)

    return request<AnalyticsStats<M>>('/stats', { ...options })
}

export const getTimeseries = async (options: AnalyticsTimeseriesOptions = {}): Promise<AnalyticsTimeseries> => {
    assertOptions('getTimeseries', options, TIMESERIES_OPTION_KEYS)

    return request<AnalyticsTimeseries>('/timeseries', { ...options })
}

export const getBreakdown = async <M extends AnalyticsBreakdownMetric = 'visitors'>(dimension: AnalyticsDimension, options: AnalyticsBreakdownOptions<M> = {}): Promise<AnalyticsBreakdown<M>> => {
    assertOptions('getBreakdown', options, BREAKDOWN_OPTION_KEYS)

    return request<AnalyticsBreakdown<M>>('/breakdown', { ...options, dimension })
}

export const getOverview = async (options: AnalyticsOverviewOptions = {}): Promise<AnalyticsOverview> => {
    assertOptions('getOverview', options, OVERVIEW_OPTION_KEYS)

    return request<AnalyticsOverview>('/overview', { ...options })
}

export function exportAnalytics(options?: { format?: 'json' }): Promise<AnalyticsExport>
export function exportAnalytics(options: { format: 'csv' }): Promise<string>
export async function exportAnalytics(options: AnalyticsExportOptions = {}): Promise<AnalyticsExport | string> {
    assertOptions('exportAnalytics', options, EXPORT_OPTION_KEYS)

    if (options?.format === 'csv') return requestText('/export', { format: 'csv' })

    return request<AnalyticsExport>('/export', { format: 'json' })
}