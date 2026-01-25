import { describe, it, expect } from 'vitest'
import {
  convertWavelength,
  convertFrequency,
  convertWavenumber,
  convertEnergy,
  convertRadiative,
  formatValue,
  CONSTANTS,
} from '../../src/composables/useUnits.js'

describe('useUnits', () => {
  describe('convertWavelength', () => {
    it('converts angstroms to other wavelength units', () => {
      const result = convertWavelength(5000, 'angstrom')
      expect(result.angstrom).toBeCloseTo(5000, 6)
      expect(result.nm).toBeCloseTo(500, 6)
      expect(result.um).toBeCloseTo(0.5, 6)
      expect(result.m).toBeCloseTo(5e-7, 12)
    })

    it('converts nanometers to angstroms', () => {
      const result = convertWavelength(500, 'nm')
      expect(result.angstrom).toBeCloseTo(5000, 6)
      expect(result.nm).toBeCloseTo(500, 6)
    })

    it('converts micrometers to angstroms', () => {
      const result = convertWavelength(1, 'um')
      expect(result.angstrom).toBeCloseTo(10000, 6)
      expect(result.nm).toBeCloseTo(1000, 6)
    })

    it('returns null for invalid input', () => {
      expect(convertWavelength(null, 'angstrom')).toBeNull()
      expect(convertWavelength(undefined, 'angstrom')).toBeNull()
      expect(convertWavelength(NaN, 'angstrom')).toBeNull()
    })
  })

  describe('convertFrequency', () => {
    it('converts MHz to other frequency units', () => {
      const result = convertFrequency(1000, 'MHz')
      expect(result.MHz).toBeCloseTo(1000, 6)
      expect(result.GHz).toBeCloseTo(1, 6)
      expect(result.Hz).toBeCloseTo(1e9, 0)
    })

    it('converts GHz to MHz', () => {
      const result = convertFrequency(10, 'GHz')
      expect(result.MHz).toBeCloseTo(10000, 6)
      expect(result.GHz).toBeCloseTo(10, 6)
    })

    it('converts THz to GHz', () => {
      const result = convertFrequency(1, 'THz')
      expect(result.GHz).toBeCloseTo(1000, 6)
      expect(result.THz).toBeCloseTo(1, 6)
    })

    it('returns null for invalid input', () => {
      expect(convertFrequency(null, 'MHz')).toBeNull()
    })
  })

  describe('convertWavenumber', () => {
    it('converts cm-1 to m-1', () => {
      const result = convertWavenumber(1000, 'cm-1')
      expect(result['cm-1']).toBeCloseTo(1000, 6)
      expect(result['m-1']).toBeCloseTo(100000, 6)
    })

    it('converts m-1 to cm-1', () => {
      const result = convertWavenumber(100000, 'm-1')
      expect(result['cm-1']).toBeCloseTo(1000, 6)
    })

    it('returns null for invalid input', () => {
      expect(convertWavenumber(null, 'cm-1')).toBeNull()
    })
  })

  describe('convertEnergy', () => {
    it('converts eV to Joules', () => {
      const result = convertEnergy(1, 'eV')
      expect(result.eV).toBeCloseTo(1, 6)
      expect(result.J).toBeCloseTo(CONSTANTS.ELEMENTARY_CHARGE, 25)
    })

    it('converts Joules to eV', () => {
      const result = convertEnergy(CONSTANTS.ELEMENTARY_CHARGE, 'J')
      expect(result.eV).toBeCloseTo(1, 6)
    })

    it('returns null for invalid input', () => {
      expect(convertEnergy(null, 'eV')).toBeNull()
    })
  })

  describe('convertRadiative', () => {
    // Test case: visible light at 500 nm (green)
    // Reference values:
    // - Wavelength: 500 nm = 5000 Å
    // - Frequency: ~599.58 THz
    // - Wavenumber: ~20000 cm⁻¹
    // - Energy: ~2.48 eV

    it('converts wavelength to all other quantities', () => {
      const result = convertRadiative(5000, 'wavelength', 'angstrom')

      expect(result.wavelength.angstrom).toBeCloseTo(5000, 4)
      expect(result.wavelength.nm).toBeCloseTo(500, 4)
      expect(result.frequency.THz).toBeCloseTo(599.58, 0)
      expect(result.wavenumber['cm-1']).toBeCloseTo(20000, 0)
      expect(result.energy.eV).toBeCloseTo(2.48, 1)
    })

    it('converts frequency to all other quantities', () => {
      const result = convertRadiative(599.58, 'frequency', 'THz')

      expect(result.wavelength.nm).toBeCloseTo(500, 0)
      expect(result.frequency.THz).toBeCloseTo(599.58, 2)
      expect(result.wavenumber['cm-1']).toBeCloseTo(20000, -1)
      expect(result.energy.eV).toBeCloseTo(2.48, 1)
    })

    it('converts wavenumber to all other quantities', () => {
      const result = convertRadiative(20000, 'wavenumber', 'cm-1')

      expect(result.wavelength.nm).toBeCloseTo(500, 2)
      expect(result.frequency.THz).toBeCloseTo(599.58, 0)
      expect(result.wavenumber['cm-1']).toBeCloseTo(20000, 4)
      expect(result.energy.eV).toBeCloseTo(2.48, 1)
    })

    it('converts energy to all other quantities', () => {
      const result = convertRadiative(2.48, 'energy', 'eV')

      expect(result.wavelength.nm).toBeCloseTo(500, -1)
      expect(result.frequency.THz).toBeCloseTo(600, 0)
      expect(result.wavenumber['cm-1']).toBeCloseTo(20000, -2)
      expect(result.energy.eV).toBeCloseTo(2.48, 4)
    })

    it('handles radio frequencies correctly', () => {
      // 1420 MHz hydrogen line
      const result = convertRadiative(1420, 'frequency', 'MHz')

      // Expected wavelength: ~21.1 cm = 2.11e8 nm
      expect(result.wavelength.nm / 1e8).toBeCloseTo(2.11, 1)
      expect(result.frequency.MHz).toBeCloseTo(1420, 4)
      expect(result.wavenumber['cm-1']).toBeCloseTo(0.0474, 2)
    })

    it('handles X-ray wavelengths correctly', () => {
      // Cu Kα X-ray: 1.54 Å
      const result = convertRadiative(1.54, 'wavelength', 'angstrom')

      expect(result.wavelength.angstrom).toBeCloseTo(1.54, 4)
      expect(result.energy.eV).toBeCloseTo(8050, -1) // ~8 keV
    })

    it('returns null for zero or negative values', () => {
      expect(convertRadiative(0, 'wavelength', 'angstrom')).toBeNull()
      expect(convertRadiative(-100, 'wavelength', 'angstrom')).toBeNull()
    })

    it('returns null for invalid type', () => {
      expect(convertRadiative(100, 'invalid', 'angstrom')).toBeNull()
    })
  })

  describe('formatValue', () => {
    it('formats regular numbers with precision', () => {
      expect(formatValue(123.456789)).toBe('123.457')
    })

    it('uses exponential notation for large numbers', () => {
      const result = formatValue(1234567890)
      expect(result).toMatch(/1\.23457e\+9/i)
    })

    it('uses exponential notation for small numbers', () => {
      const result = formatValue(0.000123456)
      expect(result).toMatch(/1\.23456e-4/i)
    })

    it('handles zero correctly', () => {
      expect(formatValue(0)).toBe('0.00000')
    })

    it('returns empty string for null/undefined', () => {
      expect(formatValue(null)).toBe('')
      expect(formatValue(undefined)).toBe('')
      expect(formatValue(NaN)).toBe('')
    })

    it('respects custom significant digits', () => {
      expect(formatValue(123.456, 4)).toBe('123.5')
    })
  })

  describe('Physical constants', () => {
    it('has correct speed of light', () => {
      expect(CONSTANTS.SPEED_OF_LIGHT).toBe(299792458)
    })

    it('has correct Planck constant', () => {
      expect(CONSTANTS.PLANCK).toBeCloseTo(6.62607015e-34, 42)
    })

    it('has correct elementary charge', () => {
      expect(CONSTANTS.ELEMENTARY_CHARGE).toBeCloseTo(1.602176634e-19, 28)
    })
  })
})
