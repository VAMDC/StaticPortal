/**
 * Unit Conversion for Radiative Transitions
 *
 * VAMDC uses specific units for radiative transition queries:
 * - Wavelength: Angstroms (1 Å = 10⁻¹⁰ m)
 * - Frequency: MHz
 * - Wavenumber: 1/cm (kayser)
 * - Energy: eV
 *
 * All conversions go through SI base units internally.
 */

// Physical constants (CODATA 2018)
const SPEED_OF_LIGHT = 299792458 // m/s
const PLANCK = 6.62607015e-34 // J·s
const ELEMENTARY_CHARGE = 1.602176634e-19 // C (Joules per eV)

// Unit conversion factors to SI base units
const WAVELENGTH_TO_M = {
  angstrom: 1e-10,
  nm: 1e-9,
  um: 1e-6,
  m: 1,
}

const FREQUENCY_TO_HZ = {
  Hz: 1,
  kHz: 1e3,
  MHz: 1e6,
  GHz: 1e9,
  THz: 1e12,
}

const WAVENUMBER_TO_PER_M = {
  'cm-1': 100, // 1/cm = 100/m
  'm-1': 1,
}

const ENERGY_TO_J = {
  eV: ELEMENTARY_CHARGE,
  J: 1,
}

/**
 * Convert wavelength to other units
 * @param {number} value - Input value
 * @param {string} fromUnit - Input unit (angstrom, nm, um, m)
 * @returns {Object} Converted values in all wavelength units
 */
export function convertWavelength(value, fromUnit) {
  if (!value || isNaN(value)) return null

  // Convert to meters
  const meters = value * (WAVELENGTH_TO_M[fromUnit] || WAVELENGTH_TO_M.angstrom)

  return {
    angstrom: meters / WAVELENGTH_TO_M.angstrom,
    nm: meters / WAVELENGTH_TO_M.nm,
    um: meters / WAVELENGTH_TO_M.um,
    m: meters,
  }
}

/**
 * Convert frequency to other units
 * @param {number} value - Input value
 * @param {string} fromUnit - Input unit (Hz, kHz, MHz, GHz, THz)
 * @returns {Object} Converted values in all frequency units
 */
export function convertFrequency(value, fromUnit) {
  if (!value || isNaN(value)) return null

  // Convert to Hz
  const hz = value * (FREQUENCY_TO_HZ[fromUnit] || FREQUENCY_TO_HZ.MHz)

  return {
    Hz: hz,
    kHz: hz / FREQUENCY_TO_HZ.kHz,
    MHz: hz / FREQUENCY_TO_HZ.MHz,
    GHz: hz / FREQUENCY_TO_HZ.GHz,
    THz: hz / FREQUENCY_TO_HZ.THz,
  }
}

/**
 * Convert wavenumber to other units
 * @param {number} value - Input value
 * @param {string} fromUnit - Input unit (cm-1, m-1)
 * @returns {Object} Converted values in all wavenumber units
 */
export function convertWavenumber(value, fromUnit) {
  if (!value || isNaN(value)) return null

  // Convert to 1/m
  const perM = value * (WAVENUMBER_TO_PER_M[fromUnit] || WAVENUMBER_TO_PER_M['cm-1'])

  return {
    'cm-1': perM / WAVENUMBER_TO_PER_M['cm-1'],
    'm-1': perM,
  }
}

/**
 * Convert energy to other units
 * @param {number} value - Input value
 * @param {string} fromUnit - Input unit (eV, J)
 * @returns {Object} Converted values in all energy units
 */
export function convertEnergy(value, fromUnit) {
  if (!value || isNaN(value)) return null

  // Convert to Joules
  const joules = value * (ENERGY_TO_J[fromUnit] || ENERGY_TO_J.eV)

  return {
    eV: joules / ENERGY_TO_J.eV,
    J: joules,
  }
}

/**
 * Convert between different physical quantities for radiative transitions
 * All quantities are related through E = hν = hc/λ = hck
 *
 * @param {number} value - Input value
 * @param {string} fromType - Input type (wavelength, frequency, wavenumber, energy)
 * @param {string} fromUnit - Input unit
 * @returns {Object} Values in all physical quantities (in VAMDC standard units)
 */
export function convertRadiative(value, fromType, fromUnit) {
  if (!value || isNaN(value) || value <= 0) return null

  let wavelengthM, frequencyHz, wavenumberPerM, energyJ

  // First convert input to SI base units
  switch (fromType) {
    case 'wavelength':
      wavelengthM = value * (WAVELENGTH_TO_M[fromUnit] || WAVELENGTH_TO_M.angstrom)
      frequencyHz = SPEED_OF_LIGHT / wavelengthM
      wavenumberPerM = 1 / wavelengthM
      energyJ = PLANCK * frequencyHz
      break

    case 'frequency':
      frequencyHz = value * (FREQUENCY_TO_HZ[fromUnit] || FREQUENCY_TO_HZ.MHz)
      wavelengthM = SPEED_OF_LIGHT / frequencyHz
      wavenumberPerM = 1 / wavelengthM
      energyJ = PLANCK * frequencyHz
      break

    case 'wavenumber':
      wavenumberPerM = value * (WAVENUMBER_TO_PER_M[fromUnit] || WAVENUMBER_TO_PER_M['cm-1'])
      wavelengthM = 1 / wavenumberPerM
      frequencyHz = SPEED_OF_LIGHT / wavelengthM
      energyJ = PLANCK * frequencyHz
      break

    case 'energy':
      energyJ = value * (ENERGY_TO_J[fromUnit] || ENERGY_TO_J.eV)
      frequencyHz = energyJ / PLANCK
      wavelengthM = SPEED_OF_LIGHT / frequencyHz
      wavenumberPerM = 1 / wavelengthM
      break

    default:
      return null
  }

  // Return in VAMDC standard units
  return {
    wavelength: {
      angstrom: wavelengthM / WAVELENGTH_TO_M.angstrom,
      nm: wavelengthM / WAVELENGTH_TO_M.nm,
      um: wavelengthM / WAVELENGTH_TO_M.um,
    },
    frequency: {
      MHz: frequencyHz / FREQUENCY_TO_HZ.MHz,
      GHz: frequencyHz / FREQUENCY_TO_HZ.GHz,
      THz: frequencyHz / FREQUENCY_TO_HZ.THz,
    },
    wavenumber: {
      'cm-1': wavenumberPerM / WAVENUMBER_TO_PER_M['cm-1'],
    },
    energy: {
      eV: energyJ / ENERGY_TO_J.eV,
    },
  }
}

/**
 * Format a number for display with appropriate precision
 * @param {number} value - Number to format
 * @param {number} significantDigits - Number of significant digits (default: 6)
 * @returns {string} Formatted string
 */
export function formatValue(value, significantDigits = 6) {
  if (value === null || value === undefined || isNaN(value)) return ''

  // Use exponential notation for very large or very small numbers
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
    return value.toExponential(significantDigits - 1)
  }

  return value.toPrecision(significantDigits)
}

// Export constants for testing
export const CONSTANTS = {
  SPEED_OF_LIGHT,
  PLANCK,
  ELEMENTARY_CHARGE,
}
