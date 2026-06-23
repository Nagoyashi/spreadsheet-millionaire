import { describe, it, expect } from 'vitest'
import {
  buildPayload,
  canSubmit,
  initialForm,
  formFromRow,
  formatCell,
  deriveCell,
  gainTone,
} from './managerHelpers'

const FIELDS = [
  {
    name: 'asset_type',
    type: 'select',
    options: [{ value: 'cash' }, { value: 'crypto' }],
    required: true,
  },
  { name: 'name', type: 'text', required: true },
  { name: 'current_value', type: 'number', required: true },
  { name: 'cost_basis', type: 'number' },
  { name: 'notes', type: 'text' },
]

describe('buildPayload', () => {
  it('coerces number fields and omits empty/null ones', () => {
    const form = {
      asset_type: 'cash',
      name: 'Checking',
      current_value: '1500.5',
      cost_basis: '',
      notes: '',
    }
    expect(buildPayload(FIELDS, form)).toEqual({
      asset_type: 'cash',
      name: 'Checking',
      current_value: 1500.5,
    })
  })

  it('merges fixed values (e.g. Collectibles asset_type)', () => {
    const form = { name: 'Watch', current_value: '3000' }
    const out = buildPayload(FIELDS, form, { asset_type: 'custom' })
    expect(out.asset_type).toBe('custom')
    expect(out.current_value).toBe(3000)
  })
})

describe('canSubmit', () => {
  it('is false when a required field is empty', () => {
    expect(canSubmit(FIELDS, { asset_type: 'cash', name: '', current_value: '5' })).toBe(false)
  })
  it('is true when all required fields are present', () => {
    expect(canSubmit(FIELDS, { asset_type: 'cash', name: 'X', current_value: '5' })).toBe(true)
  })
})

describe('initialForm', () => {
  it('defaults a required select to its first option, others empty', () => {
    expect(initialForm(FIELDS)).toEqual({
      asset_type: 'cash',
      name: '',
      current_value: '',
      cost_basis: '',
      notes: '',
    })
  })
})

describe('formFromRow', () => {
  it('stringifies values and maps missing ones to empty', () => {
    const row = { asset_type: 'crypto', name: 'BTC', current_value: 1000, cost_basis: null }
    expect(formFromRow(FIELDS, row)).toEqual({
      asset_type: 'crypto',
      name: 'BTC',
      current_value: '1000',
      cost_basis: '',
      notes: '',
    })
  })
})

describe('formatCell', () => {
  it('formats money, percent, enum, and falls back for empty', () => {
    expect(formatCell(1500, 'money')).toBe('$1,500')
    expect(formatCell(5.5, 'percent')).toBe('5.5%')
    expect(formatCell('cash', 'enum', [{ value: 'cash', label: 'Cash' }])).toBe('Cash')
    expect(formatCell('', 'money')).toBe('—')
    expect(formatCell(null, 'text')).toBe('—')
  })

  it('formats gain/loss with an explicit sign', () => {
    expect(formatCell(1500, 'gainloss')).toBe('+$1,500')
    expect(formatCell(-1500, 'gainloss')).toBe('-$1,500')
    expect(formatCell(0, 'gainloss')).toBe('$0')
  })
})

describe('deriveCell', () => {
  it('reads row[col.key] for a plain column', () => {
    expect(deriveCell({ key: 'current_value' }, { current_value: 42 })).toBe(42)
  })
  it('computes via derive(row) for a derived column', () => {
    const col = { key: 'gain', derive: (r) => r.current_value - r.cost_basis }
    expect(deriveCell(col, { current_value: 100, cost_basis: 60 })).toBe(40)
  })
})

describe('gainTone', () => {
  it('greens gains, reds losses, greys zero/non-finite', () => {
    expect(gainTone(10)).toBe('text-green-600')
    expect(gainTone(-10)).toBe('text-red-600')
    expect(gainTone(0)).toBe('text-gray-500')
    expect(gainTone(NaN)).toBe('text-gray-500')
  })
})
