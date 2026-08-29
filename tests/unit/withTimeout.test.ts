import { describe, it, expect, vi, afterEach } from 'vitest'
import { withTimeout } from '@/lib/withTimeout'

afterEach(() => {
  vi.useRealTimers()
})

describe('withTimeout', () => {
  it('reicht das Ergebnis durch, wenn es rechtzeitig kommt', async () => {
    await expect(withTimeout(Promise.resolve('da'), 50, 'Test')).resolves.toBe('da')
  })

  it('reicht einen Fehler unveraendert durch', async () => {
    const boom = new Error('kaputt')
    await expect(withTimeout(Promise.reject(boom), 50, 'Test')).rejects.toBe(boom)
  })

  it('lehnt ab, wenn das Versprechen nie antwortet', async () => {
    vi.useFakeTimers()
    // Genau der Fall aus der Praxis: Firestore wartet bei halb offener
    // Verbindung unbegrenzt, statt abzulehnen.
    const haengt = new Promise<string>(() => {})
    const p = withTimeout(haengt, 10_000, 'Profile laden')
    const gefangen = p.catch((e: Error) => e.message)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await gefangen).toContain('Profile laden')
  })

  it('haelt den Zeitgeber nicht am Leben, wenn frueh geantwortet wird', async () => {
    vi.useFakeTimers()
    await expect(withTimeout(Promise.resolve(1), 10_000, 'Test')).resolves.toBe(1)
    // Ohne clearTimeout bliebe hier ein Zeitgeber offen und hielte in Node
    // den Prozess (bzw. im Browser den Wakeup) laenger als noetig wach.
    expect(vi.getTimerCount()).toBe(0)
  })
})
