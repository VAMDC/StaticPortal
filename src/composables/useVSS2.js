/**
 * VSS2 Query Generation
 *
 * VSS2 (VAMDC SQL Subset 2) is an SQL-like query language for atomic/molecular data.
 * Syntax: SELECT [branches] WHERE [conditions]
 *
 * Example: SELECT * WHERE AtomSymbol = 'Fe' AND AtomIonCharge >= 1
 */

/**
 * Mapping of form field names to VSS2 restrictables
 */
const RESTRICTABLES = {
  atoms: {
    symbol: 'AtomSymbol',
    nuclearCharge: 'AtomNuclearCharge',
    massNumber: 'AtomMassNumber',
    ionChargeMin: 'AtomIonCharge',
    ionChargeMax: 'AtomIonCharge',
    stateEnergyMin: 'AtomStateEnergy',
    stateEnergyMax: 'AtomStateEnergy',
    inchikey: 'InChIKey',
  },
  molecules: {
    stoichiometricFormula: 'MoleculeStoichiometricFormula',
    chemicalName: 'MoleculeChemicalName',
    inchikey: 'InChIKey',
  },
  radiative: {
    wavelengthMin: 'RadTransWavelength',
    wavelengthMax: 'RadTransWavelength',
    frequencyMin: 'RadTransFrequency',
    frequencyMax: 'RadTransFrequency',
    wavenumberMin: 'RadTransWavenumber',
    wavenumberMax: 'RadTransWavenumber',
    energyMin: 'RadTransEnergy',
    energyMax: 'RadTransEnergy',
  },
  collisions: {
    targetSymbol: 'AtomSymbol',
    targetFormula: 'MoleculeStoichiometricFormula',
    colliderSymbol: 'CollisionSpecies',
    colliderFormula: 'CollisionSpecies',
    processType: 'CollisionCode',
    energyMin: 'CollisionEnergy',
    energyMax: 'CollisionEnergy',
    temperatureMin: 'CollisionTrange',
    temperatureMax: 'CollisionTrange',
  },
}

/**
 * Generate a single condition from a field value
 */
function generateCondition(restrictable, value, operator = '=') {
  if (value === null || value === undefined || value === '') {
    return null
  }

  // String values need quotes
  if (typeof value === 'string' && !['>=', '<=', '>', '<'].includes(operator)) {
    return `${restrictable} ${operator} '${value}'`
  }

  return `${restrictable} ${operator} ${value}`
}

/**
 * Generate conditions for a single form
 */
function generateFormConditions(form) {
  const conditions = []
  const fields = form.fields || {}
  const mapping = RESTRICTABLES[form.type] || {}

  for (const [fieldName, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') continue

    const restrictable = mapping[fieldName]
    if (!restrictable) continue

    // Handle range fields (Min/Max suffixes)
    if (fieldName.endsWith('Min')) {
      const cond = generateCondition(restrictable, value, '>=')
      if (cond) conditions.push(cond)
    } else if (fieldName.endsWith('Max')) {
      const cond = generateCondition(restrictable, value, '<=')
      if (cond) conditions.push(cond)
    } else {
      const cond = generateCondition(restrictable, value, '=')
      if (cond) conditions.push(cond)
    }
  }

  return conditions
}

/**
 * Generate a complete VSS2 query from form state
 *
 * @param {Array} forms - Array of form objects with type and fields
 * @returns {string} VSS2 query string
 */
export function generateQuery(forms) {
  if (!forms || forms.length === 0) {
    return ''
  }

  const allConditions = []

  for (const form of forms) {
    const conditions = generateFormConditions(form)
    allConditions.push(...conditions)
  }

  if (allConditions.length === 0) {
    return ''
  }

  return `SELECT * WHERE ${allConditions.join(' AND ')}`
}

/**
 * Encode form state to URL-safe string
 *
 * Format: type1.field1=value1&type1.field2=value2&type2.field1=value1
 *
 * @param {Array} forms - Array of form objects
 * @returns {string} URL-encoded string
 */
export function encodeToURL(forms) {
  if (!forms || forms.length === 0) {
    return ''
  }

  const params = []

  for (const form of forms) {
    const fields = form.fields || {}
    for (const [field, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined && value !== '') {
        params.push(`${form.type}.${field}=${encodeURIComponent(value)}`)
      }
    }
  }

  return params.join('&')
}

/**
 * Parse URL hash back to form state
 *
 * @param {string} hash - URL hash (without leading #)
 * @returns {Array} Array of form objects
 */
export function parseFromURL(hash) {
  if (!hash) {
    return []
  }

  const formMap = new Map()

  const pairs = hash.split('&')
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    if (!key || value === undefined) continue

    const dotIndex = key.indexOf('.')
    if (dotIndex === -1) continue

    const type = key.slice(0, dotIndex)
    const field = key.slice(dotIndex + 1)
    const decodedValue = decodeURIComponent(value)

    if (!formMap.has(type)) {
      formMap.set(type, {
        id: Date.now() + formMap.size,
        type,
        fields: {},
      })
    }

    const form = formMap.get(type)

    // Try to parse as number for numeric fields
    if (field.includes('Min') || field.includes('Max') || field.includes('Charge') || field.includes('Number')) {
      const numValue = parseFloat(decodedValue)
      form.fields[field] = isNaN(numValue) ? decodedValue : numValue
    } else {
      form.fields[field] = decodedValue
    }
  }

  return Array.from(formMap.values())
}

/**
 * Build the full TAP query URL for a node
 *
 * @param {Object} node - Node object with url property
 * @param {string} query - VSS2 query string
 * @returns {string} Full URL
 */
export function buildQueryURL(node, query) {
  const baseUrl = node.url.endsWith('/') ? node.url : `${node.url}/`
  return `${baseUrl}sync?LANG=VSS2&FORMAT=XSAMS&QUERY=${encodeURIComponent(query)}`
}

/**
 * Get the set of restrictables required by the current forms
 *
 * @param {Array} forms - Array of form objects with type and fields
 * @returns {Set<string>} Set of restrictable names
 */
export function getRequiredRestrictables(forms) {
  const required = new Set()

  if (!forms || forms.length === 0) {
    return required
  }

  for (const form of forms) {
    const fields = form.fields || {}
    const mapping = RESTRICTABLES[form.type] || {}

    for (const [fieldName, value] of Object.entries(fields)) {
      if (value === null || value === undefined || value === '') continue

      const restrictable = mapping[fieldName]
      if (restrictable) {
        required.add(restrictable)
      }
    }
  }

  return required
}
