import { useCallback, useMemo } from 'react'
import { emulateValue, hasEmulator } from '../services/injectable-emulator'
import {
  INTERNAL_INJECTABLE_KEYS,
  isInternalInjectable,
  type Injectable,
} from '../types/injectable'
import type { InjectableFormValues } from '../types/preview'

interface UseEmulatedValuesReturn {
  /**
   * Obtiene el valor emulado para una variable de sistema
   */
  getEmulatedValue: (key: string) => unknown | null
  /**
   * Verifica si una key tiene emulador disponible
   */
  canEmulate: (key: string) => boolean
  /**
   * Genera valores emulados para todas las variables de sistema
   */
  generateSystemValues: (injectables: Injectable[]) => InjectableFormValues
  /**
   * Lista de keys de sistema disponibles
   */
  systemKeys: readonly string[]
}

/**
 * Hook para manejar valores emulados de variables de sistema
 */
export function useEmulatedValues(): UseEmulatedValuesReturn {
  const getEmulatedValue = useCallback((key: string): unknown | null => {
    return emulateValue(key)
  }, [])

  const canEmulate = useCallback((key: string): boolean => {
    return hasEmulator(key)
  }, [])

  const generateSystemValues = useCallback(
    (injectables: Injectable[]): InjectableFormValues => {
      const values: InjectableFormValues = {}

      for (const injectable of injectables) {
        if (isInternalInjectable(injectable) && hasEmulator(injectable.key)) {
          values[injectable.key] = emulateValue(injectable.key)
        }
      }

      return values
    },
    []
  )

  const systemKeys = useMemo(() => INTERNAL_INJECTABLE_KEYS, [])

  return {
    getEmulatedValue,
    canEmulate,
    generateSystemValues,
    systemKeys,
  }
}
