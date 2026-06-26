import type { Stage } from './types'

const STAGES: Stage[] = ['observing', 'hypothesis', 'strategy', 'hint', 'fullAnswer']

type Callback = (field: Stage, text: string, done: boolean) => void

// Char-by-char state machine. Works across chunk boundaries, handles escape sequences.
// propertyOrdering on the schema guarantees fields arrive in STAGES order.
export function createParser(onUpdate: Callback) {
  type State = 'scan' | 'in-key' | 'after-key' | 'after-colon' | 'in-value'
  let state: State = 'scan'
  let keyBuf = ''
  let currentField: Stage | null = null
  let valueBuf = ''
  let inEscape = false
  const emitted = new Set<Stage>()

  return {
    feed(chunk: string) {
      for (const ch of chunk) {
        switch (state) {
          case 'scan':
            if (ch === '"') { state = 'in-key'; keyBuf = '' }
            break

          case 'in-key':
            if (ch === '"') {
              const f = keyBuf as Stage
              if (STAGES.includes(f) && !emitted.has(f)) {
                currentField = f
                state = 'after-key'
              } else {
                state = 'scan'
              }
              keyBuf = ''
            } else {
              keyBuf += ch
            }
            break

          case 'after-key':
            if (ch === ':') state = 'after-colon'
            break

          case 'after-colon':
            if (ch === '"') { state = 'in-value'; valueBuf = ''; inEscape = false }
            break

          case 'in-value':
            if (inEscape) {
              if (ch === 'n') valueBuf += '\n'
              else if (ch === 't') valueBuf += '\t'
              else valueBuf += ch
              inEscape = false
              onUpdate(currentField!, valueBuf, false)
            } else if (ch === '\\') {
              inEscape = true
            } else if (ch === '"') {
              emitted.add(currentField!)
              onUpdate(currentField!, valueBuf, true)
              currentField = null
              valueBuf = ''
              state = 'scan'
            } else {
              valueBuf += ch
              onUpdate(currentField!, valueBuf, false)
            }
            break
        }
      }
    },
  }
}
