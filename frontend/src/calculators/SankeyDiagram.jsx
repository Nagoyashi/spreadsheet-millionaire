import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey'
import { TrendingUp, TrendingDown, PiggyBank, Percent } from 'lucide-react'

const DEFAULTS = {
  income_sources: [
    { id: 'salary',    label: 'Salary',    value: 75000 },
    { id: 'freelance', label: 'Freelance', value: 12000 },
  ],
  expense_categories: [
    { id: 'housing',   label: 'Housing',   value: 18000 },
    { id: 'food',      label: 'Food',      value: 7200  },
    { id: 'transport', label: 'Transport', value: 4800  },
    { id: 'health',    label: 'Health',    value: 2400  },
    { id: 'leisure',   label: 'Leisure',   value: 3600  },
    { id: 'savings',   label: 'Savings',   value: 24000 },
    { id: 'other',     label: 'Other',     value: 3000  },
  ],
}

const INCOME_COLOURS  = ['#f59e0b', '#fbbf24', '#d97706', '#b45309', '#92400e']
const EXPENSE_COLOURS = ['#6366f1', '#8b5cf6', '#a78bfa', '#7c3aed', '#4f46e5', '#818cf8', '#c4b5fd']

function uid() { return Math.random().toString(36).slice(2, 8) }

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, Icon, iconClass, gradientClass, highlight }) {
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

// ─── Editable item row ─────────────────────────────────────────────────────────
function ItemRow({ item, colour, onLabelChange, onValueChange, onRemove }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="flex items-center gap-2 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
      <input
        type="text"
        value={item.label}
        onChange={e => onLabelChange(item.id, e.target.value)}
        className="flex-1 text-sm text-gray-700 bg-transparent border-b border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 min-w-0 transition-colors"
      />
      <div className="flex rounded border border-gray-200 overflow-hidden focus-within:ring-1 focus-within:ring-blue-400">
        <span className="px-2 py-1 bg-gray-50 text-gray-400 text-xs border-r border-gray-200 flex items-center">$</span>
        <input
          type="number"
          value={item.value}
          onChange={e => onValueChange(item.id, e.target.value)}
          min={0}
          className="w-20 px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none text-right"
        />
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className={`text-gray-300 hover:text-red-400 transition-colors text-xs px-1 ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >
        ✕
      </button>
    </div>
  )
}

// ─── D3 Sankey chart ───────────────────────────────────────────────────────────
function SankeyChart({ incomeSources, expenseCategories }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ width: 600, height: 400 })

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
    const PAD = { top: 16, right: 130, bottom: 16, left: 130 }

    const totalIncome = incomeSources.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
    if (totalIncome === 0) return

    const nodes = [
      ...incomeSources.map((s, i) => ({ id: `income_${s.id}`, label: s.label, colour: INCOME_COLOURS[i % INCOME_COLOURS.length] })),
      { id: 'hub', label: 'Total Income', colour: '#f59e0b' },
      ...expenseCategories.map((e, i) => ({ id: `expense_${e.id}`, label: e.label, colour: EXPENSE_COLOURS[i % EXPENSE_COLOURS.length] })),
    ]

    const nodeIndex = Object.fromEntries(nodes.map((n, i) => [n.id, i]))
    const hubIdx = nodeIndex['hub']

    const links = [
      ...incomeSources.map(s => ({ source: nodeIndex[`income_${s.id}`], target: hubIdx, value: Math.max(1, parseFloat(s.value) || 0) })),
      ...expenseCategories.map(e => ({ source: hubIdx, target: nodeIndex[`expense_${e.id}`], value: Math.max(1, parseFloat(e.value) || 0) })),
    ]

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

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)

    const defs = svg.append('defs')
    graph.links.forEach((link, i) => {
      const gradId = `lg_${i}`
      const grad = defs.append('linearGradient').attr('id', gradId).attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1).attr('x2', link.target.x0)
      const srcColour = nodes[typeof link.source === 'object' ? link.source.index : link.source]?.colour ?? '#f59e0b'
      const tgtColour = nodes[typeof link.target === 'object' ? link.target.index : link.target]?.colour ?? '#6366f1'
      grad.append('stop').attr('offset', '0%').attr('stop-color', srcColour).attr('stop-opacity', 0.5)
      grad.append('stop').attr('offset', '100%').attr('stop-color', tgtColour).attr('stop-opacity', 0.5)
      link._gradId = gradId
    })

    svg.append('g').selectAll('path').data(graph.links).join('path')
      .attr('d', sankeyLinkHorizontal()).attr('fill', 'none')
      .attr('stroke', d => `url(#${d._gradId})`).attr('stroke-width', d => Math.max(1, d.width)).attr('opacity', 0.8)

    svg.append('g').selectAll('rect').data(graph.nodes).join('rect')
      .attr('x', d => d.x0).attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0).attr('height', d => Math.max(1, d.y1 - d.y0))
      .attr('fill', d => d.colour).attr('rx', 3)

    const labelG = svg.append('g').attr('font-family', 'system-ui, sans-serif').attr('font-size', 11)

    graph.nodes.forEach(node => {
      const midY  = (node.y0 + node.y1) / 2
      const isHub  = node.id === 'hub'
      const isLeft = node.x0 < W / 2
      const x      = isHub ? node.x0 + (node.x1 - node.x0) / 2 : isLeft ? node.x0 - 10 : node.x1 + 10
      const anchor = isHub ? 'middle' : isLeft ? 'end' : 'start'
      const yOff   = isHub ? -8 : 0

      labelG.append('text').attr('x', x).attr('y', midY + yOff).attr('dy', '0.35em')
        .attr('text-anchor', anchor).attr('fill', node.colour).attr('font-weight', 600).text(node.label)
      labelG.append('text').attr('x', x).attr('y', midY + yOff + 15).attr('dy', '0.35em')
        .attr('text-anchor', anchor).attr('fill', '#6b7280').text(fmt(node.value))
    })
  }, [incomeSources, expenseCategories, dims])

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full overflow-visible" />
    </div>
  )
}

// ─── Input section ─────────────────────────────────────────────────────────────
function InputSection({ title, accentColor, items, colours, onAdd, onLabelChange, onValueChange, onRemove }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
        </div>
        <button
          onClick={onAdd}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <ItemRow
            key={item.id}
            item={item}
            colour={colours[i % colours.length]}
            onLabelChange={onLabelChange}
            onValueChange={onValueChange}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SankeyDiagram({ initialData, onDataChange }) {
  const [incomeSources, setIncomeSources]         = useState(initialData?.income_sources      ?? DEFAULTS.income_sources)
  const [expenseCategories, setExpenseCategories] = useState(initialData?.expense_categories  ?? DEFAULTS.expense_categories)

  useEffect(() => {
    if (initialData) {
      setIncomeSources(initialData.income_sources      ?? DEFAULTS.income_sources)
      setExpenseCategories(initialData.expense_categories ?? DEFAULTS.expense_categories)
    }
  }, [initialData])

  useEffect(() => {
    onDataChange?.({ income_sources: incomeSources, expense_categories: expenseCategories })
  }, [incomeSources, expenseCategories, onDataChange])

  const addIncome = () => setIncomeSources(p => [...p, { id: uid(), label: 'New source',   value: 0 }])
  const addExpense = () => setExpenseCategories(p => [...p, { id: uid(), label: 'New category', value: 0 }])

  const updateIncomeLabel = (id, label) => setIncomeSources(p => p.map(s => s.id === id ? { ...s, label } : s))
  const updateIncomeValue = (id, value) => setIncomeSources(p => p.map(s => s.id === id ? { ...s, value: parseFloat(value) || 0 } : s))
  const removeIncome      = (id) => setIncomeSources(p => p.filter(s => s.id !== id))

  const updateExpenseLabel = (id, label) => setExpenseCategories(p => p.map(e => e.id === id ? { ...e, label } : e))
  const updateExpenseValue = (id, value) => setExpenseCategories(p => p.map(e => e.id === id ? { ...e, value: parseFloat(value) || 0 } : e))
  const removeExpense      = (id) => setExpenseCategories(p => p.filter(e => e.id !== id))

  const totalIncome   = incomeSources.reduce((s, x)     => s + (parseFloat(x.value) || 0), 0)
  const totalExpenses = expenseCategories.reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
  const surplus       = totalIncome - totalExpenses
  const savingsRate   = totalIncome > 0 ? ((surplus / totalIncome) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Income"
          value={fmt(totalIncome)}
          Icon={TrendingUp}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
        />
        <StatCard
          label="Total Expenses"
          value={fmt(totalExpenses)}
          Icon={TrendingDown}
          iconClass="text-red-500"
          gradientClass="from-red-500 to-rose-600"
        />
        <StatCard
          label={surplus >= 0 ? 'Surplus' : 'Deficit'}
          value={fmt(Math.abs(surplus))}
          Icon={PiggyBank}
          iconClass="text-emerald-500"
          gradientClass="from-emerald-500 to-teal-600"
          highlight={surplus > 0}
        />
        <StatCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          Icon={Percent}
          iconClass="text-violet-500"
          gradientClass="from-violet-500 to-purple-600"
        />
      </div>

      {/* Main area: inputs + diagram */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Input panels */}
        <div className="flex flex-col gap-4 w-full lg:w-64 shrink-0">
          <InputSection
            title="Income Sources"
            accentColor="#f59e0b"
            items={incomeSources}
            colours={INCOME_COLOURS}
            onAdd={addIncome}
            onLabelChange={updateIncomeLabel}
            onValueChange={updateIncomeValue}
            onRemove={removeIncome}
          />
          <InputSection
            title="Expenses"
            accentColor="#6366f1"
            items={expenseCategories}
            colours={EXPENSE_COLOURS}
            onAdd={addExpense}
            onLabelChange={updateExpenseLabel}
            onValueChange={updateExpenseValue}
            onRemove={removeExpense}
          />
        </div>

        {/* Diagram */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6 min-h-64 flex items-center justify-center lg:items-start lg:justify-start">
          {totalIncome === 0 ? (
            <p className="text-sm text-gray-400">Add income sources to see the diagram.</p>
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
