import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import NumInput from './NumInput'

// Controlled harness — NumInput is a controlled component, so a bare render
// with a static `value` can't exercise the typing flow. This mirrors how every
// calculator wires it (state + set).
function Harness({ initial = '', onChange: spy, ...bounds }) {
  const [value, setValue] = useState(initial)
  return (
    <NumInput
      label="Current Age"
      value={value}
      onChange={(v) => {
        setValue(v)
        spy?.(v)
      }}
      {...bounds}
    />
  )
}

function type(input, raw) {
  fireEvent.change(input, { target: { value: raw } })
}

describe('NumInput clamping', () => {
  it('allows typing a value digit-by-digit through a raised min (the age-field bug)', () => {
    // min=18: "3" is a prefix of "35" and must NOT snap to 18 mid-typing.
    render(<Harness initial="35" min={18} max={70} />)
    const input = screen.getByLabelText('Current Age')

    type(input, '') // user clears the field
    type(input, '4') // first digit of "45" — below min, must survive
    expect(input).toHaveValue('4')
    type(input, '45')
    expect(input).toHaveValue('45')
  })

  it('snaps an under-min value to min on blur', () => {
    render(<Harness initial="35" min={18} max={70} />)
    const input = screen.getByLabelText('Current Age')

    type(input, '')
    type(input, '4') // committed as-is while focused
    fireEvent.blur(input)
    expect(input).toHaveValue('18')
  })

  it('leaves an in-range value untouched on blur', () => {
    render(<Harness initial="35" min={18} max={70} />)
    const input = screen.getByLabelText('Current Age')
    fireEvent.blur(input)
    expect(input).toHaveValue('35')
  })

  it('still clamps max immediately on change', () => {
    // Overshooting max is never a prefix of a valid entry — snap right away.
    render(<Harness initial="35" min={18} max={70} />)
    const input = screen.getByLabelText('Current Age')

    type(input, '185')
    expect(input).toHaveValue('70')
  })

  it('keeps an empty field empty on blur (calculators read "" as 0)', () => {
    const spy = vi.fn()
    render(<Harness initial="35" min={18} max={70} onChange={spy} />)
    const input = screen.getByLabelText('Current Age')

    type(input, '')
    spy.mockClear()
    fireEvent.blur(input)
    expect(spy).not.toHaveBeenCalled()
    expect(input).toHaveValue('')
  })

  it('clamps a pasted scientific-notation monster to max', () => {
    // "8e31" is the canonical pasted-garbage case the clamp exists for.
    render(<Harness initial="5" min={0} max={20} />)
    const input = screen.getByLabelText('Current Age')

    type(input, '8e31')
    expect(input).toHaveValue('20')
  })

  it('snaps a negative into a non-negative range immediately (min=0 fields unchanged)', () => {
    // A negative can never be a prefix of an in-range entry when min >= 0,
    // so it clamps on change — pasted "-5" never sits visible in a money field.
    render(<Harness initial="1000" min={0} />)
    const input = screen.getByLabelText('Current Age')

    type(input, '-5')
    expect(input).toHaveValue('0')
  })

  it('lets a between-0-and-min value stay while focused (prefix of a valid entry)', () => {
    render(<Harness initial="10" min={1} max={100} />)
    const input = screen.getByLabelText('Current Age')

    type(input, '')
    type(input, '0') // under min but non-negative — stays while focused, snaps on blur
    expect(input).toHaveValue('0')
    fireEvent.blur(input)
    expect(input).toHaveValue('1')
  })
})

describe('NumInput comma decimals (v0.15.2)', () => {
  it('normalises a comma decimal to a dot', () => {
    render(<Harness initial="" min={0} />)
    const input = screen.getByLabelText('Current Age')
    type(input, '1,5')
    expect(input).toHaveValue('1.5')
  })

  it('keeps a trailing comma as an in-progress decimal', () => {
    render(<Harness initial="" min={0} />)
    const input = screen.getByLabelText('Current Age')
    type(input, '12,')
    expect(input).toHaveValue('12.')
    type(input, '12.3')
    expect(input).toHaveValue('12.3')
  })

  it('still ignores garbage that is not a number either way', () => {
    render(<Harness initial="5" min={0} />)
    const input = screen.getByLabelText('Current Age')
    type(input, '1,2,3') // two separators — not a number, keep previous value
    expect(input).toHaveValue('5')
  })

  it('clamps a comma value against max like a dot value', () => {
    render(<Harness initial="" min={0} max={20} />)
    const input = screen.getByLabelText('Current Age')
    type(input, '99,5')
    expect(input).toHaveValue('20')
  })
})
