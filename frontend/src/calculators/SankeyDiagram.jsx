import { useState, useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey'
import { TrendingUp, TrendingDown, PiggyBank, Percent, Plus, Link2, Check, Trash2 } from 'lucide-react'
import { fmt } from '../utils/format'
import { migrate, stripVersion } from '../utils/migrateCalcData'

// ─── Data shape (v2) ────────────────────────────────────────────────────────
//
// v1 was flat: { income_sources[], expense_categories[] }
// v2 is nested: { income_sources[], expense_groups[] } where each group has
// an items[] array. The diagram is now 4 columns:
//
//   income source → Budget (hub) → expense group → subcategory
//
// The v1→v2 migration (utils/migrateCalcData.js) wraps any old flat expense
// list into a single "Expenses" group, so saved records load without loss.

const DEFAULTS = {
  version: 2,
  income_sources: [
    { id: 'salary',    label: 'Salary',    value: 4200 },
    { id: 'side',      label: 'Side income', value: 800 },
  ],
  expense_groups: [
    {
      id: 'housing',
      label: 'Housing',
      items: [
        { id: 'rent',        label: 'Rent',        value: 1450 },
        { id: 'electricity', label: 'Electricity', value: 120  },
      ],
    },
    {
      id: 'daily',
      label: 'Daily living',
      items: [
        { id: 'groceries', label: 'Groceries', value: 520 },
        { id: 'transport', label: 'Transport', value: 210 },
      ],
    },
    {
      id: 'savings',
      label: 'Savings',
      items: [
        { id: 'investments', label: 'Investments', value: 900 },
        { id: 'emergency',   label: 'Emergency fund', value: 300 },
      ],
    },
  ],
}

// Softer, lower-saturation palette inspired by the reference: muted teal/blue
// income, sand/amber groups, sage/green for everything downstream. Pastel so
// the bands read as flow, not alarm.
const HUB_COLOUR = '#3f4a5a'   // dark slate hub bar

const GROUP_PALETTE = [
  { node: '#e0a85c', band: '#f3dcae' },  // sand
  { node: '#5cb88a', band: '#bfe3d0' },  // sage
  { node: '#6f9bd1', band: '#c4d8ef' },  // dusty blue
  { node: '#c98a9b', band: '#ecd0d7' },  // rose
  { node: '#9784c4', band: '#d8cfe9' },  // muted violet
  { node: '#5bb0b5', band: '#c0e2e3' },  // teal
]

const INCOME_PALETTE = [
  { node: '#6f9bd1', band: '#c4d8ef' },  // dusty blue
  { node: '#e08a6f', band: '#f3cfc1' },  // soft terracotta
  { node: '#5cb88a', band: '#bfe3d0' },  // sage
  { node: '#9784c4', band: '#d8cfe9' },  // violet
]

const MIN_RENDER_VALUE = 1   // entries below this aren't drawn (avoids 1px stubs)

function uid() { return Math.random().toString(36).slice(2, 8) }

const CURRENCIES = ['$', '€', '£']

// ─── Editable item row ────────────────────────────────────────────────────────
function ItemRow({ item, colour, currency, onLabelChange, onValueChange, onRemove, indent }) {
  return (
    <div className={`flex items-center gap-2 group ${indent ? 'pl-4' : ''}`}>
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
      <input
        type="text"
        value={item.label}
        onChange={e => onLabelChange(item.id, e.target.value)}
        maxLength={40}
        aria-label="Item name"
        className="flex-1 min-w-0 text-sm text-gray-700 bg-transparent border-b border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors truncate"
      />
      <div className="flex rounded border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400 shrink-0">
        <span className="px-2 py-1 bg-gray-50 text-gray-400 text-xs border-r border-gray-200 flex items-center">{currency}</span>
        <input
          type="number"
          value={item.value}
          onChange={e => {
            // Native min only guards the spinner; clamp typed/pasted negatives too.
            const raw = e.target.value
            if (raw === '') { onValueChange(item.id, ''); return }
            const num = Number(raw)
            if (!Number.isFinite(num)) return
            onValueChange(item.id, num < 0 ? '0' : raw)
          }}
          min={0}
          aria-label={`${item.label || 'Item'} amount`}
          className="w-16 px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none text-right"
        />
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="text-gray-300 hover:text-red-400 transition-colors px-0.5 opacity-0 group-hover:opacity-100 shrink-0"
        aria-label="Remove"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── D3 Sankey chart (4-column) ───────────────────────────────────────────────
function SankeyChart({ incomeSources, expenseGroups, currency, mode, totalIncome }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ width: 700, height: 460 })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w > 0) setDims({ width: w, height: Math.max(380, Math.min(w * 0.62, 620)) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width: W, height: H } = dims
    const PAD = { top: 24, right: 16, bottom: 24, left: 16 }

    // Filter out non-renderable (zero / sub-threshold) entries so we never draw
    // 1px stub bands. They remain in the inputs — just not in the diagram.
    const incomes = incomeSources.filter(s => (parseFloat(s.value) || 0) >= MIN_RENDER_VALUE)
    const groups  = expenseGroups
      .map(g => ({ ...g, items: g.items.filter(it => (parseFloat(it.value) || 0) >= MIN_RENDER_VALUE) }))
      .filter(g => g.items.length > 0)

    const incomeTotal = incomes.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
    if (incomeTotal === 0) return

    // ── Build nodes ──
    // columns: 0 income, 1 hub, 2 group, 3 subcategory
    const nodes = []
    const nodeIndex = {}
    const push = (id, label, colour, meta = {}) => {
      nodeIndex[id] = nodes.length
      nodes.push({ id, label, colour, ...meta })
    }

    incomes.forEach((s, i) => {
      const pal = INCOME_PALETTE[i % INCOME_PALETTE.length]
      push(`inc_${s.id}`, s.label, pal.node, { band: pal.band, raw: parseFloat(s.value) || 0 })
    })
    push('hub', 'Budget', HUB_COLOUR, { raw: incomeTotal })
    groups.forEach((g, gi) => {
      const pal = GROUP_PALETTE[gi % GROUP_PALETTE.length]
      const groupTotal = g.items.reduce((s, it) => s + (parseFloat(it.value) || 0), 0)
      push(`grp_${g.id}`, g.label, pal.node, { band: pal.band, raw: groupTotal })
      g.items.forEach(it => {
        push(`sub_${g.id}_${it.id}`, it.label, pal.node, { band: pal.band, raw: parseFloat(it.value) || 0 })
      })
    })

    // ── Build links ──
    const links = []
    incomes.forEach(s => {
      links.push({ source: nodeIndex[`inc_${s.id}`], target: nodeIndex['hub'], value: parseFloat(s.value) || 0, band: nodes[nodeIndex[`inc_${s.id}`]].band })
    })
    groups.forEach(g => {
      const groupTotal = g.items.reduce((s, it) => s + (parseFloat(it.value) || 0), 0)
      links.push({ source: nodeIndex['hub'], target: nodeIndex[`grp_${g.id}`], value: groupTotal, band: nodes[nodeIndex[`grp_${g.id}`]].band })
      g.items.forEach(it => {
        links.push({ source: nodeIndex[`grp_${g.id}`], target: nodeIndex[`sub_${g.id}_${it.id}`], value: parseFloat(it.value) || 0, band: nodes[nodeIndex[`sub_${g.id}_${it.id}`]].band })
      })
    })

    const layout = sankey()
      .nodeId(d => d.index)
      .nodeAlign(sankeyJustify)
      .nodeWidth(12)
      .nodePadding(16)
      .extent([[PAD.left, PAD.top], [W - PAD.right, H - PAD.bottom]])

    let graph
    try {
      graph = layout({
        nodes: nodes.map((n, i) => ({ ...n, index: i })),
        links: links.map(l => ({ ...l })),
      })
    } catch {
      return  // malformed graph (e.g. cycle) — bail rather than crash
    }

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    // ── Links ──
    svg.append('g').selectAll('path').data(graph.links).join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', d => d.band || '#d4d4d8')
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('opacity', 0.55)

    // ── Nodes ──
    svg.append('g').selectAll('rect').data(graph.nodes).join('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => Math.max(2, d.y1 - d.y0))
      .attr('fill', d => d.colour)
      .attr('rx', 2)

    // ── Labels ──
    // Format a node's value per the active mode (currency or % of income).
    const formatValue = (raw) => {
      if (mode === 'percent') {
        const pct = totalIncome > 0 ? (raw / totalIncome) * 100 : 0
        return `${pct.toFixed(pct < 10 ? 1 : 0)}%`
      }
      return fmt(raw, { currency, thousandDecimals: 1 })
    }

    const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

    const labelG = svg.append('g')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('font-size', 12)

    graph.nodes.forEach(node => {
      const midY      = (node.y0 + node.y1) / 2
      const bandH     = node.y1 - node.y0
      const isLeftCol = node.x0 < W * 0.25
      const isHub     = node.id === 'hub'

      // Place label outside on the far columns, inside-ish on the middle ones.
      let x, anchor
      if (isLeftCol) { x = node.x1 + 8; anchor = 'start' }
      else if (node.x1 > W * 0.78) { x = node.x0 - 8; anchor = 'end' }
      else { x = node.x0 + (node.x1 - node.x0) / 2; anchor = 'middle' }

      const maxChars = isHub ? 18 : 22
      const labelText = `${truncate(node.label, maxChars)}: ${formatValue(node.raw)}`

      // Skip drawing if the band is too thin to host a readable label and it's
      // not an endpoint column (endpoints always get labels). Middle thin bands
      // would collide otherwise.
      const isEndpoint = isLeftCol || node.x1 > W * 0.78 || isHub
      if (!isEndpoint && bandH < 12) return

      const t = labelG.append('text')
        .attr('x', x)
        .attr('y', midY)
        .attr('dy', '0.35em')
        .attr('text-anchor', anchor)
        .attr('fill', isHub ? '#ffffff' : '#374151')
        .attr('font-weight', isHub ? 600 : 500)

      if (isHub) {
        // Hub label sits centered on the dark bar — white, stacked above the bar
        t.attr('x', node.x0 + (node.x1 - node.x0) / 2)
          .attr('y', node.y0 - 8)
          .attr('dy', 0)
          .attr('fill', '#475569')
          .attr('text-anchor', 'middle')
          .text(labelText)
      } else {
        t.text(labelText)
      }
    })
  }, [incomeSources, expenseGroups, dims, currency, mode, totalIncome])

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full overflow-visible" />
    </div>
  )
}

// ─── Group editor (one expense group with its subcategories) ───────────────────
function GroupEditor({ group, colour, currency, onGroupLabel, onItemLabel, onItemValue, onItemRemove, onItemAdd, onGroupRemove }) {
  return (
    <div className="border border-gray-100 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 group/header">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
        <input
          type="text"
          value={group.label}
          onChange={e => onGroupLabel(group.id, e.target.value)}
          maxLength={40}
          aria-label="Group name"
          className="flex-1 min-w-0 text-sm font-semibold text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors truncate"
        />
        <button
          onClick={() => onGroupRemove(group.id)}
          className="text-gray-300 hover:text-red-400 transition-colors px-0.5 opacity-0 group-hover/header:opacity-100 shrink-0"
          aria-label="Remove group"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {group.items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            colour={colour}
            currency={currency}
            indent
            onLabelChange={(id, label) => onItemLabel(group.id, id, label)}
            onValueChange={(id, value) => onItemValue(group.id, id, value)}
            onRemove={(id) => onItemRemove(group.id, id)}
          />
        ))}
      </div>

      <button
        onClick={() => onItemAdd(group.id)}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition pl-4"
      >
        + Add item
      </button>
    </div>
  )
}

// ─── State helpers ─────────────────────────────────────────────────────────────
const CURRENT_VERSION = DEFAULTS.version

function buildInitialSlices(initialData) {
  if (!initialData) {
    return {
      income_sources: DEFAULTS.income_sources,
      expense_groups: DEFAULTS.expense_groups,
    }
  }
  const migrated = migrate('sankey', initialData, CURRENT_VERSION)
  // Normalise the loaded record too — a corrupt saved blob (e.g. a group missing
  // its items array) must fall back to a safe shape, not crash the renderer (#24).
  return normalizeSlices(migrated)
}

// Permalink: encode/decode full state as base64 in the URL (?data=...).
// No backend — pure client-side share.
function encodeState(state) {
  try {
    const json = JSON.stringify(state)
    return btoa(encodeURIComponent(json))
  } catch {
    return null
  }
}
// Normalise an untrusted state object (a decoded permalink or a loaded saved
// record) into the exact shape the renderer assumes: income_sources is an array
// of {id,label,value}, and EVERY expense group has an `items` array of the same.
// Malformed entries are dropped; a missing/non-array field falls back to the
// default. This is the guard that stops a crafted `?data=` or a corrupt saved
// record from reaching `g.items.reduce(...)` on undefined and white-screening
// the app (#24). Always returns a valid object — never throws.
function _normItem(it) {
  if (!it || typeof it !== 'object') return null
  const value = parseFloat(it.value)
  return { id: it.id ?? uid(), label: String(it.label ?? ''), value: Number.isFinite(value) ? value : 0 }
}

export function normalizeSlices(obj) {
  const src = obj && typeof obj === 'object' ? obj : {}
  return {
    income_sources: Array.isArray(src.income_sources)
      ? src.income_sources.map(_normItem).filter(Boolean)
      : DEFAULTS.income_sources,
    expense_groups: Array.isArray(src.expense_groups)
      ? src.expense_groups
          .filter(g => g && typeof g === 'object')
          .map(g => ({
            id: g.id ?? uid(),
            label: String(g.label ?? ''),
            items: Array.isArray(g.items) ? g.items.map(_normItem).filter(Boolean) : [],
          }))
      : DEFAULTS.expense_groups,
  }
}

function decodeState(param) {
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(param)))
    // Normalise rather than trust: a parseable-but-malformed payload renders the
    // default diagram instead of crashing. Only an undecodable param → null.
    return normalizeSlices(parsed)
  } catch {
    return null
  }
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SankeyDiagram({ initialData, onDataChange }) {
  // Permalink takes precedence over initialData on first mount.
  const urlState = (() => {
    if (typeof window === 'undefined') return null
    const param = new URLSearchParams(window.location.search).get('data')
    return param ? decodeState(param) : null
  })()

  const seed = urlState
    ? { income_sources: urlState.income_sources, expense_groups: urlState.expense_groups }
    : buildInitialSlices(initialData)

  const [incomeSources, setIncomeSources] = useState(seed.income_sources)
  const [expenseGroups, setExpenseGroups] = useState(seed.expense_groups)
  const [currency, setCurrency]           = useState(urlState?.currency || '$')
  const [mode, setMode]                   = useState('amount')   // 'amount' | 'percent'
  const [copied, setCopied]               = useState(false)

  // Reload when a saved record loads (but not when the URL seeded us)
  useEffect(() => {
    if (initialData && !urlState) {
      const next = buildInitialSlices(initialData)
      setIncomeSources(next.income_sources)
      setExpenseGroups(next.expense_groups)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  // Notify parent (strip internal version key)
  const onDataChangeRef = useRef(onDataChange)
  useEffect(() => { onDataChangeRef.current = onDataChange }, [onDataChange])
  useEffect(() => {
    onDataChangeRef.current?.(stripVersion({
      income_sources: incomeSources,
      expense_groups: expenseGroups,
    }))
  }, [incomeSources, expenseGroups])

  // ── Income mutations ──
  const addIncome    = () => setIncomeSources(p => [...p, { id: uid(), label: 'New source', value: 0 }])
  const incomeLabel  = (id, label) => setIncomeSources(p => p.map(s => s.id === id ? { ...s, label } : s))
  const incomeValue  = (id, value) => setIncomeSources(p => p.map(s => s.id === id ? { ...s, value: parseFloat(value) || 0 } : s))
  const removeIncome = (id) => setIncomeSources(p => p.filter(s => s.id !== id))

  // ── Group / item mutations ──
  const addGroup = () => setExpenseGroups(p => [...p, { id: uid(), label: 'New group', items: [{ id: uid(), label: 'New item', value: 0 }] }])
  const removeGroup = (gid) => setExpenseGroups(p => p.filter(g => g.id !== gid))
  const groupLabel = (gid, label) => setExpenseGroups(p => p.map(g => g.id === gid ? { ...g, label } : g))
  const addItem = (gid) => setExpenseGroups(p => p.map(g => g.id === gid ? { ...g, items: [...g.items, { id: uid(), label: 'New item', value: 0 }] } : g))
  const itemLabel = (gid, iid, label) => setExpenseGroups(p => p.map(g => g.id === gid ? { ...g, items: g.items.map(it => it.id === iid ? { ...it, label } : it) } : g))
  const itemValue = (gid, iid, value) => setExpenseGroups(p => p.map(g => g.id === gid ? { ...g, items: g.items.map(it => it.id === iid ? { ...it, value: parseFloat(value) || 0 } : it) } : g))
  const itemRemove = (gid, iid) => setExpenseGroups(p => p.map(g => g.id === gid ? { ...g, items: g.items.filter(it => it.id !== iid) } : g))

  // ── Totals ──
  const totalIncome   = incomeSources.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
  const totalExpenses = expenseGroups.reduce((s, g) => s + g.items.reduce((gs, it) => gs + (parseFloat(it.value) || 0), 0), 0)
  const surplus       = totalIncome - totalExpenses
  const savingsRate   = totalIncome > 0 ? ((surplus / totalIncome) * 100).toFixed(1) : '0'

  // ── Permalink ──
  const handleCopyLink = useCallback(async () => {
    const encoded = encodeState({ income_sources: incomeSources, expense_groups: expenseGroups, currency })
    if (!encoded) return
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      // Reflect the shareable state in the address bar without a reload
      window.history.replaceState(null, '', url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — still update the URL so the user can copy manually
      window.history.replaceState(null, '', url)
    }
  }, [incomeSources, expenseGroups, currency])

  const fmtStat = (v) => mode === 'percent'
    ? `${totalIncome > 0 ? ((v / totalIncome) * 100).toFixed(1) : '0'}%`
    : fmt(v, { currency, thousandDecimals: 1 })

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SankeyStat label="Total Income"   value={fmtStat(totalIncome)}        Icon={TrendingUp}  iconClass="text-emerald-500" gradientClass="from-emerald-500 to-teal-600" />
        <SankeyStat label="Total Expenses" value={fmtStat(totalExpenses)}      Icon={TrendingDown} iconClass="text-red-500"     gradientClass="from-red-500 to-rose-600" />
        <SankeyStat label={surplus >= 0 ? 'Surplus' : 'Deficit'} value={fmtStat(Math.abs(surplus))} Icon={PiggyBank} iconClass="text-emerald-500" gradientClass="from-emerald-500 to-teal-600" highlight={surplus > 0} />
        <SankeyStat label="Savings Rate"   value={`${savingsRate}%`}           Icon={Percent}     iconClass="text-violet-500"  gradientClass="from-violet-500 to-purple-600" />
      </div>

      {/* Main area */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Inputs */}
        <div className="flex flex-col gap-4 w-full lg:w-72 shrink-0">

          {/* Income */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Income</h3>
              <button onClick={addIncome} className="text-xs text-blue-600 hover:text-blue-700 font-medium transition inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2.5">
              {incomeSources.map((item, i) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  colour={INCOME_PALETTE[i % INCOME_PALETTE.length].node}
                  currency={currency}
                  onLabelChange={incomeLabel}
                  onValueChange={incomeValue}
                  onRemove={removeIncome}
                />
              ))}
            </div>
          </div>

          {/* Expense groups */}
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Expense groups</h3>
              <button onClick={addGroup} className="text-xs text-blue-600 hover:text-blue-700 font-medium transition inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add group
              </button>
            </div>
            <div className="space-y-3">
              {expenseGroups.map((group, gi) => (
                <GroupEditor
                  key={group.id}
                  group={group}
                  colour={GROUP_PALETTE[gi % GROUP_PALETTE.length].node}
                  currency={currency}
                  onGroupLabel={groupLabel}
                  onGroupRemove={removeGroup}
                  onItemLabel={itemLabel}
                  onItemValue={itemValue}
                  onItemRemove={itemRemove}
                  onItemAdd={addItem}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Diagram */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6 min-h-64">

          {/* Toolbar: currency picker + % toggle + permalink */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {/* Currency segmented control */}
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                {CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1.5 text-sm font-medium transition ${currency === c ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {/* Amount / % toggle */}
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setMode('amount')}
                  className={`px-3 py-1.5 text-sm font-medium transition ${mode === 'amount' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  {currency}
                </button>
                <button
                  onClick={() => setMode('percent')}
                  className={`px-3 py-1.5 text-sm font-medium transition ${mode === 'percent' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  %
                </button>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
            >
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Link2 className="w-4 h-4" /> Copy permalink</>}
            </button>
          </div>

          {totalIncome === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">Add income to see the diagram.</p>
          ) : (
            <SankeyChart
              incomeSources={incomeSources}
              expenseGroups={expenseGroups}
              currency={currency}
              mode={mode}
              totalIncome={totalIncome}
            />
          )}

          {mode === 'percent' && (
            <p className="text-xs text-gray-400 mt-3">Percentages are shown as a share of total income.</p>
          )}
        </div>
      </div>

    </div>
  )
}

// Local stat card (kept here — Sankey's `highlight` variant isn't in ui/StatCard)
function SankeyStat({ label, value, Icon, iconClass, gradientClass, highlight }) {
  return (
    <div className={`rounded-lg shadow-md p-5 hover:shadow-lg hover:-translate-y-1 transition ${highlight ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'bg-white'}`}>
      <div className="flex items-start justify-between mb-3">
        <p className={`text-sm font-medium ${highlight ? 'text-emerald-100' : 'text-gray-600'}`}>{label}</p>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-white/20' : 'bg-gray-50'}`}>
          <Icon className={`w-4 h-4 ${highlight ? 'text-white' : iconClass}`} />
        </div>
      </div>
      <p className={`text-4xl font-bold ${highlight ? 'text-white' : 'text-gray-800'}`}>{value}</p>
      {!highlight && <div className={`h-1 rounded-full bg-gradient-to-r ${gradientClass} mt-4`} />}
    </div>
  )
}
