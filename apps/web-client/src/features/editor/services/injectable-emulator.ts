/**
 * Sistema de emuladores para inyectables de sistema (INTERNAL)
 *
 * Los emuladores calculan valores automáticos para inyectables de sistema
 * como fechas, horas, años, etc.
 */

type EmulatorFunction = () => unknown

/**
 * Registro de emuladores por key de injectable
 */
const emulators: Map<string, EmulatorFunction> = new Map([
  [
    'date_time_now',
    () =>
      new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
  ],

  ['date_now', () => new Date().toISOString().split('T')[0]],

  [
    'time_now',
    () =>
      new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
  ],

  ['year_now', () => new Date().getFullYear()],

  ['month_now', () => (new Date().getMonth() + 1).toString()],

  ['day_now', () => new Date().getDate()],
])

/**
 * Emula/calcula el valor de un injectable de sistema
 *
 * @param key - Key del injectable (ej: 'date_now', 'time_now')
 * @returns Valor emulado o null si no hay emulador para esa key
 */
export function emulateValue(key: string): unknown | null {
  const emulator = emulators.get(key)
  return emulator ? emulator() : null
}

/**
 * Verifica si existe un emulador para una key dada
 *
 * @param key - Key del injectable
 * @returns true si existe emulador, false si no
 */
export function hasEmulator(key: string): boolean {
  return emulators.has(key)
}

/**
 * Obtiene todas las keys con emuladores disponibles
 *
 * @returns Array de keys con emuladores
 */
export function getEmulatorKeys(): string[] {
  return Array.from(emulators.keys())
}

/**
 * Registra un nuevo emulador
 *
 * @param key - Key del injectable
 * @param emulatorFn - Función que calcula el valor
 */
export function registerEmulator(
  key: string,
  emulatorFn: EmulatorFunction
): void {
  emulators.set(key, emulatorFn)
}
