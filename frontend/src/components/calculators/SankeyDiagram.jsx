import { useState, useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey'

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULTS = {
  income_sources: [
    { id: 'salary',    label: 'Salary',      value: 75000 },
    { id: 'freelance', label: 'Freelance',   value: 12000 },
  ],
  expense_categories: [
    { id: 'housing',      label: 'Housing',       value: 18000 },
    { id: 'food',         label: 'Food',           value: 7200  },
    { id: 'transport',    label: 'Transport',      value: 4800  },
    { id: 'health',       label: 'Health',         value: 2400  },
    { id: 'leisure',      label: 'Leisure',        value: 3600  },
    { id: 'savings',      label: 'Savings',        value: 24000 },
    { id: 'other',        label: 'Other',          value: 3000  },
  ],
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const INCOME_COLOURS  = ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e']
const EXPENSE_COLOURS = ['#6366f1', '#8b5cf6', '#a78bfa', '#7c3aed', '#4f46e5', '#818cf8', '#c4b5fd']

// ─── Small helpers ────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 8)
}

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

// ─── Editable row for income / expense items ──────────────────────────────────
function ItemRow({ item, colour, onLabelChange, onValueChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 group">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colour }} />
      <input
        type="text"
        value={item.label}
        onChange={e => onLabelChange(item.id, e.target.value)}
        className="flex-1 bg-transparent border-b border-stone-700 text-stone-200 font-body text-sm px-1 py-0.5 focus:outline-none focus:border-amber-400 transition-colors min-w-0"
      />
      <div className="flex items-center border border-stone-700 focus-within:border-amber-400 transition-colors bg-stone-900">
        <span className="font-mono text-xs text-stone-600 px-1.5">$</span>
        <input
          type="number"
          value={item.value}
          onChange={e => onValueChange(item.id, e.target.value)}
          min={0}
          className="w-24 bg-transparent text-stone-100 font-mono text-xs px-1 py-1 focus:outline-none text-right"
        />
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="text-stone-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 font-mono text-xs"
      >
        ✕
      </button>
    </div>
  )
}

// ─── D3 Sankey renderer ───────────────────────────────────────────────────────
function SankeyChart({ incomeSources, expenseCategories }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ width: 600, height: 400 })

  // Responsive width
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w > 0) setDims({ width: w, height: Math.max(320, w * 0.55) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width: W, height: H } = dims
    const PAD = { top: 16, right: 120, bottom: 16, left: 120 }

    // ── Build graph ──────────────────────────────────────────────────────────
    const totalIncome  = incomeSources.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)

    // Nodes: income sources → "Income" hub → expense categories
    const nodes = [
      ...incomeSources.map((s, i) => ({
        id: `income_${s.id}`,
        label: s.label,
        colour: INCOME_COLOURS[i % INCOME_COLOURS.length],
      })),
      {
        id: 'hub',
        label: 'Total Income',
        colour: '#fbbf24',
      },
      ...expenseCategories.map((e, i) => ({
        id: `expense_${e.id}`,
        label: e.label,
        colour: EXPENSE_COLOURS[i % EXPENSE_COLOURS.length],
      })),
    ]

    const nodeIndex = Object.fromEntries(nodes.map((n, i) => [n.id, i]))
    const hubIdx    = nodeIndex['hub']

    const links = [
      // income sources → hub
      ...incomeSources.map(s => ({
        source: nodeIndex[`income_${s.id}`],
        target: hubIdx,
        value:  Math.max(1, parseFloat(s.value) || 0),
      })),
      // hub → expenses (proportional to total income if expenses exceed it)
      ...expenseCategories.map(e => {
        const raw = parseFloat(e.value) || 0
        return {
          source: hubIdx,
          target: nodeIndex[`expense_${e.id}`],
          value:  Math.max(1, raw),
        }
      }),
    ]

    // Guard: need at least one income and one expense with value
    if (totalIncome === 0) return

    // ── Sankey layout ────────────────────────────────────────────────────────
    const layout = sankey()
      .nodeId(d => d.index)
      .nodeAlign(sankeyLeft)
      .nodeWidth(14)
      .nodePadding(14)
      .extent([[PAD.left, PAD.top], [W - PAD.right, H - PAD.bottom]])

    const graph = layout({
      nodes: nodes.map((n, i) => ({ ...n, index: i })),
      links: links.map(l => ({ ...l })),
    })

    // ── Draw ─────────────────────────────────────────────────────────────────
    svg
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W)
      .attr('height', H)

    const defs = svg.append('defs')

    // Gradient per link (source colour → target colour)
    graph.links.forEach((link, i) => {
      const gradId = `lg_${i}`
      const grad = defs.append('linearGradient')
        .attr('id', gradId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1)
        .attr('x2', link.target.x0)

      const srcColour = nodes[typeof link.source === 'object' ? link.source.index : link.source]?.colour ?? '#fbbf24'
      const tgtColour = nodes[typeof link.target === 'object' ? link.target.index : link.target]?.colour ?? '#6366f1'

      grad.append('stop').attr('offset', '0%').attr('stop-color', srcColour).attr('stop-opacity', 0.6)
      grad.append('stop').attr('offset', '100%').attr('stop-color', tgtColour).attr('stop-opacity', 0.6)

      link._gradId = gradId
    })

    // Links
    svg.append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('fill', 'none')
        .attr('stroke', (d, i) => `url(#${d._gradId})`)
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('opacity', 0.8)

    // Nodes
    svg.append('g')
      .selectAll('rect')
      .data(graph.nodes)
      .join('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => Math.max(1, d.y1 - d.y0))
        .attr('fill', d => d.colour)
        .attr('rx', 2)

    // Node labels — left side (income) and right side (expenses)
    const labelG = svg.append('g')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', 11)
      .attr('fill', '#a8a29e')

    graph.nodes.forEach(node => {
      const midY   = (node.y0 + node.y1) / 2
      const isLeft  = node.x0 < W / 2
      const isHub   = node.id === 'hub'
      const x       = isHub ? node.x0 + (node.x1 - node.x0) / 2
                     : isLeft ? node.x0 - 8
                     : node.x1 + 8
      const anchor  = isHub ? 'middle' : isLeft ? 'end' : 'start'
      const yOff    = isHub ? -8 : 0

      labelG.append('text')
        .attr('x', x)
        .attr('y', midY + yOff)
        .attr('dy', '0.35em')
        .attr('text-anchor', anchor)
        .attr('fill', node.colour)
        .text(node.label)

      labelG.append('text')
        .attr('x', x)
        .attr('y', midY + yOff + 14)
        .attr('dy', '0.35em')
        .attr('text-anchor', anchor)
        .attr('fill', '#57534e')
        .text(fmt(node.value))
    })
  }, [incomeSources, expenseCategories, dims])

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full overflow-visible" />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SankeyDiagram({ initialData, onDataChange }) {
  const [incomeSources, setIncomeSources]       = useState(
    initialData?.income_sources ?? DEFAULTS.income_sources
  )
  const [expenseCategories, setExpenseCategories] = useState(
    initialData?.expense_categories ?? DEFAULTS.expense_categories
  )

  // When a saved calc is loaded, replace all inputs
  useEffect(() => {
    if (initialData) {
      setIncomeSources(initialData.income_sources ?? DEFAULTS.income_sources)
      setExpenseCategories(initialData.expense_categories ?? DEFAULTS.expense_categories)
    }
  }, [initialData])

  // Notify parent on every change
  useEffect(() => {
    onDataChange?.({ income_sources: incomeSources, expense_categories: expenseCategories })
  }, [incomeSources, expenseCategories, onDataChange])

  // ── Income helpers ──────────────────────────────────────────────────────────
  function addIncome() {
    setIncomeSources(prev => [...prev, { id: uid(), label: 'New source', value: 0 }])
  }
  function updateIncomeLabel(id, label) {
    setIncomeSources(prev => prev.map(s => s.id === id ? { ...s, label } : s))
  }
  function updateIncomeValue(id, value) {
    setIncomeSources(prev => prev.map(s => s.id === id ? { ...s, value: parseFloat(value) || 0 } : s))
  }
  function removeIncome(id) {
    setIncomeSources(prev => prev.filter(s => s.id !== id))
  }

  // ── Expense helpers ─────────────────────────────────────────────────────────
  function addExpense() {
    setExpenseCategories(prev => [...prev, { id: uid(), label: 'New category', value: 0 }])
  }
  function updateExpenseLabel(id, label) {
    setExpenseCategories(prev => prev.map(e => e.id === id ? { ...e, label } : e))
  }
  function updateExpenseValue(id, value) {
    setExpenseCategories(prev => prev.map(e => e.id === id ? { ...e, value: parseFloat(value) || 0 } : e))
  }
  function removeExpense(id) {
    setExpenseCategories(prev => prev.filter(e => e.id !== id))
  }

  // ── Summary numbers ─────────────────────────────────────────────────────────
  const totalIncome   = incomeSources.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
  const totalExpenses = expenseCategories.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
  const surplus       = totalIncome - totalExpenses

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="font-mono text-xs text-amber-400 uppercase tracking-widest mb-1">Calculator</p>
        <h2 className="font-display text-3xl text-stone-100">Cash Flow Sankey</h2>
        <p className="font-body text-sm text-stone-500 mt-1">Visualise where your money goes</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-stone-800 bg-stone-900/50 p-3">
          <p className="font-mono text-xs text-stone-600 uppercase tracking-widest mb-1">Income</p>
          <p className="font-display text-xl text-amber-400">{fmt(totalIncome)}</p>
        </div>
        <div className="border border-stone-800 bg-stone-900/50 p-3">
          <p className="font-mono text-xs text-stone-600 uppercase tracking-widest mb-1">Expenses</p>
          <p className="font-display text-xl text-stone-100">{fmt(totalExpenses)}</p>
        </div>
        <div className={`border p-3 ${surplus >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <p className="font-mono text-xs text-stone-600 uppercase tracking-widest mb-1">
            {surplus >= 0 ? 'Surplus' : 'Deficit'}
          </p>
          <p className={`font-display text-xl ${surplus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(Math.abs(surplus))}
          </p>
        </div>
      </div>

      {/* Main layout: inputs left, diagram right on large screens */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Input panels ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:w-64 shrink-0">

          {/* Income sources */}
          <div className="border border-stone-800 bg-stone-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-xs text-stone-500 uppercase tracking-widest">
                Income Sources
              </p>
              <button
                onClick={addIncome}
                className="font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2.5">
              {incomeSources.map((s, i) => (
                <ItemRow
                  key={s.id}
                  item={s}
                  colour={INCOME_COLOURS[i % INCOME_COLOURS.length]}
                  onLabelChange={updateIncomeLabel}
                  onValueChange={updateIncomeValue}
                  onRemove={removeIncome}
                />
              ))}
            </div>
          </div>

          {/* Expense categories */}
          <div className="border border-stone-800 bg-stone-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-xs text-stone-500 uppercase tracking-widest">
                Expenses
              </p>
              <button
                onClick={addExpense}
                className="font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2.5">
              {expenseCategories.map((e, i) => (
                <ItemRow
                  key={e.id}
                  item={e}
                  colour={EXPENSE_COLOURS[i % EXPENSE_COLOURS.length]}
                  onLabelChange={updateExpenseLabel}
                  onValueChange={updateExpenseValue}
                  onRemove={removeExpense}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Diagram ──────────────────────────────────────────────────────── */}
        <div className="flex-1 border border-stone-800 bg-stone-900/30 p-4 min-h-64">
          {totalIncome === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="font-body text-sm text-stone-600">Add income to see the diagram</p>
            </div>
          ) : (
            <SankeyChart
              incomeSources={incomeSources}
              expenseCategories={expenseCategories}
            />
          )}
        </div>
      </div>
    </div>
  )
}
