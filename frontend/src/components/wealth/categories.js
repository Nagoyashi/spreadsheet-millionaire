// Net Worth category configs — the field/column definitions driving the generic
// CategoryManager for each tab.
//
// The enum *values* below MUST mirror backend/net_worth_types.py (the backend
// CHECK constraints + Marshmallow OneOf reject anything else). Labels are
// UI-only. This is the frontend mirror, analogous to how the calculator
// registry's VALID_TYPES mirrors backend calc_types.py.
//
// A `gainloss` column uses a `derive(row)` from overviewSelectors so the per-item
// gain matches the backend's aggregate computation exactly.

import { assetGain, investmentGain, propertyGain } from './overviewSelectors'

export const ASSET_TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'pension', label: 'Pension' },
  // 'custom' is intentionally absent — it's surfaced via the Collectibles tab.
]

export const LIABILITY_TYPE_OPTIONS = [
  { value: 'credit_card', label: 'Credit card' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
]

export const ASSET_CLASS_OPTIONS = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'bond', label: 'Bond' },
  { value: 'other', label: 'Other' },
]

export const PROPERTY_TYPE_OPTIONS = [
  { value: 'primary', label: 'Primary residence' },
  { value: 'rental', label: 'Rental' },
  { value: 'investment', label: 'Investment' },
  { value: 'vacation', label: 'Vacation' },
]

// Each config: { title, resource, fixed?, fields[], columns[] }
//   resource — which useNetWorthData CRUD trio backs it (asset/liability/
//              investment/property); WealthPage maps it to the callbacks.
//   fixed    — values forced on every write (Collectibles -> asset_type custom).
//   fields   — form inputs (type: text | number | select | date).
//   columns  — table columns (format: money | percent | enum | text).
export const CATEGORY_CONFIGS = {
  liquid: {
    title: 'Liquid Assets',
    resource: 'asset',
    fields: [
      {
        name: 'asset_type',
        label: 'Type',
        type: 'select',
        options: ASSET_TYPE_OPTIONS,
        required: true,
      },
      { name: 'name', label: 'Name', type: 'text', required: true },
      {
        name: 'current_value',
        label: 'Current value',
        type: 'number',
        prefix: '$',
        min: 0,
        required: true,
      },
      { name: 'cost_basis', label: 'Cost basis', type: 'number', prefix: '$', min: 0 },
      { name: 'notes', label: 'Notes', type: 'text' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'asset_type', label: 'Type', format: 'enum', options: ASSET_TYPE_OPTIONS },
      { key: 'current_value', label: 'Value', format: 'money' },
      { key: 'cost_basis', label: 'Cost basis', format: 'money' },
      { key: 'gain', label: 'Gain / loss', format: 'gainloss', derive: assetGain },
    ],
  },

  collectibles: {
    title: 'Collectibles',
    resource: 'asset',
    fixed: { asset_type: 'custom' },
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      {
        name: 'current_value',
        label: 'Current value',
        type: 'number',
        prefix: '$',
        min: 0,
        required: true,
      },
      { name: 'cost_basis', label: 'Cost basis', type: 'number', prefix: '$', min: 0 },
      { name: 'notes', label: 'Notes', type: 'text' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'current_value', label: 'Value', format: 'money' },
      { key: 'cost_basis', label: 'Cost basis', format: 'money' },
      { key: 'gain', label: 'Gain / loss', format: 'gainloss', derive: assetGain },
    ],
  },

  investments: {
    title: 'Investments',
    resource: 'investment',
    fields: [
      { name: 'ticker', label: 'Ticker', type: 'text', required: true },
      {
        name: 'asset_class',
        label: 'Asset class',
        type: 'select',
        options: ASSET_CLASS_OPTIONS,
        required: true,
      },
      { name: 'quantity', label: 'Quantity', type: 'number', min: 0, required: true },
      {
        name: 'cost_basis',
        label: 'Cost basis / unit',
        type: 'number',
        prefix: '$',
        min: 0,
        required: true,
      },
      {
        name: 'current_value',
        label: 'Market value',
        type: 'number',
        prefix: '$',
        min: 0,
        hint: '(optional)',
      },
      { name: 'region', label: 'Region', type: 'text' },
      { name: 'purchase_date', label: 'Purchase date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'text' },
    ],
    columns: [
      { key: 'ticker', label: 'Ticker' },
      { key: 'asset_class', label: 'Class', format: 'enum', options: ASSET_CLASS_OPTIONS },
      { key: 'quantity', label: 'Qty' },
      { key: 'cost_basis', label: 'Cost / unit', format: 'money' },
      { key: 'current_value', label: 'Market value', format: 'money' },
      { key: 'gain', label: 'Gain / loss', format: 'gainloss', derive: investmentGain },
    ],
  },

  'real-estate': {
    title: 'Real Estate',
    resource: 'property',
    fields: [
      { name: 'property_name', label: 'Property name', type: 'text', required: true },
      {
        name: 'property_type',
        label: 'Type',
        type: 'select',
        options: PROPERTY_TYPE_OPTIONS,
        required: true,
      },
      {
        name: 'current_value',
        label: 'Current value',
        type: 'number',
        prefix: '$',
        min: 0,
        required: true,
      },
      { name: 'purchase_price', label: 'Purchase price', type: 'number', prefix: '$', min: 0 },
      { name: 'mortgage_balance', label: 'Mortgage balance', type: 'number', prefix: '$', min: 0 },
      {
        name: 'mortgage_interest_rate',
        label: 'Mortgage rate',
        type: 'number',
        suffix: '%',
        min: 0,
      },
      { name: 'mortgage_payment', label: 'Mortgage payment', type: 'number', prefix: '$', min: 0 },
      { name: 'monthly_rent', label: 'Monthly rent', type: 'number', prefix: '$', min: 0 },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'text' },
    ],
    columns: [
      { key: 'property_name', label: 'Property' },
      { key: 'property_type', label: 'Type', format: 'enum', options: PROPERTY_TYPE_OPTIONS },
      { key: 'current_value', label: 'Value', format: 'money' },
      { key: 'mortgage_balance', label: 'Mortgage', format: 'money' },
      { key: 'gain', label: 'Gain / loss', format: 'gainloss', derive: propertyGain },
    ],
  },

  liabilities: {
    title: 'Liabilities',
    singular: 'liability',
    resource: 'liability',
    fields: [
      {
        name: 'liability_type',
        label: 'Type',
        type: 'select',
        options: LIABILITY_TYPE_OPTIONS,
        required: true,
      },
      { name: 'name', label: 'Name', type: 'text', required: true },
      {
        name: 'current_balance',
        label: 'Balance',
        type: 'number',
        prefix: '$',
        min: 0,
        required: true,
      },
      { name: 'interest_rate', label: 'Interest rate', type: 'number', suffix: '%', min: 0 },
      { name: 'minimum_payment', label: 'Min. payment', type: 'number', prefix: '$', min: 0 },
      { name: 'due_date', label: 'Due date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'text' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'liability_type', label: 'Type', format: 'enum', options: LIABILITY_TYPE_OPTIONS },
      { key: 'current_balance', label: 'Balance', format: 'money' },
      { key: 'interest_rate', label: 'Rate', format: 'percent' },
    ],
  },
}
