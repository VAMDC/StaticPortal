/**
 * XSAMS XML parsing utilities
 */

/**
 * Extract atom data from XSAMS document
 */
export function extractAtoms(doc) {
  const atoms = []
  const atomElements = doc.querySelectorAll('Atom')

  for (const atom of atomElements) {
    const speciesId = atom.querySelector('ChemicalElement > ElementSymbol')?.textContent || ''
    const atomicNumber = atom.querySelector('ChemicalElement > NuclearCharge')?.textContent || ''
    const isotopes = atom.querySelectorAll('Isotope')

    for (const isotope of isotopes) {
      const massNumber = isotope.querySelector('IsotopeParameters > MassNumber')?.textContent || ''
      const ions = isotope.querySelectorAll('Ion')

      for (const ion of ions) {
        const ionCharge = ion.querySelector('IonCharge')?.textContent || '0'
        const stateCount = ion.querySelectorAll('AtomicState').length

        atoms.push({
          symbol: speciesId,
          atomicNumber: parseInt(atomicNumber, 10) || null,
          massNumber: parseInt(massNumber, 10) || null,
          ionCharge: parseInt(ionCharge, 10),
          stateCount,
        })
      }
    }

    // Handle atoms without isotope wrapper
    if (isotopes.length === 0) {
      const ions = atom.querySelectorAll('Ion')
      for (const ion of ions) {
        const ionCharge = ion.querySelector('IonCharge')?.textContent || '0'
        const stateCount = ion.querySelectorAll('AtomicState').length

        atoms.push({
          symbol: speciesId,
          atomicNumber: parseInt(atomicNumber, 10) || null,
          massNumber: null,
          ionCharge: parseInt(ionCharge, 10),
          stateCount,
        })
      }
    }
  }

  return atoms
}

/**
 * Extract molecule data from XSAMS document
 */
export function extractMolecules(doc) {
  const molecules = []
  const moleculeElements = doc.querySelectorAll('Molecule')

  for (const molecule of moleculeElements) {
    const speciesId = molecule.getAttribute('speciesID') || ''
    const chemicalName = molecule.querySelector('MolecularChemicalSpecies > ChemicalName > Value')?.textContent || ''
    const stoichiometricFormula = molecule.querySelector('MolecularChemicalSpecies > StoichiometricFormula')?.textContent || ''
    const ordinaryStructuralFormula = molecule.querySelector('MolecularChemicalSpecies > OrdinaryStructuralFormula > Value')?.textContent || ''
    const inchiKey = molecule.querySelector('MolecularChemicalSpecies > InChIKey')?.textContent || ''
    const stateCount = molecule.querySelectorAll('MolecularState').length

    molecules.push({
      speciesId,
      chemicalName,
      stoichiometricFormula,
      ordinaryStructuralFormula: ordinaryStructuralFormula || stoichiometricFormula,
      inchiKey,
      stateCount,
    })
  }

  return molecules
}

/**
 * Extract atomic states from XSAMS document
 */
export function extractAtomicStates(doc) {
  const states = []
  const stateElements = doc.querySelectorAll('AtomicState')

  for (const state of stateElements) {
    const stateId = state.getAttribute('stateID') || ''

    // Energy
    const energyEl = state.querySelector('AtomicNumericalData > StateEnergy > Value')
    const energy = energyEl ? parseFloat(energyEl.textContent) : null
    const energyUnit = energyEl?.getAttribute('units') || 'eV'

    // Configuration - try multiple possible locations
    const configLabel = state.querySelector('AtomicComposition > Component > Configuration > ConfigurationLabel')?.textContent ||
                       state.querySelector('AtomicComposition > Component > Configuration > AtomicCore > Configuration > ConfigurationLabel')?.textContent ||
                       ''

    // Term - try LS coupling term symbol
    const termEl = state.querySelector('AtomicComposition > Component > Term')
    let term = ''
    if (termEl) {
      const l = termEl.querySelector('LS > L > Value')?.textContent || ''
      const s = termEl.querySelector('LS > S')?.textContent || ''
      const termSymbol = termEl.querySelector('TermLabel')?.textContent || ''
      term = termSymbol || (l && s ? `${2*parseFloat(s)+1}${['S','P','D','F','G','H','I','K'][parseInt(l)] || l}` : '')
    }

    // Total angular momentum J
    const j = state.querySelector('AtomicQuantumNumbers > TotalAngularMomentum')?.textContent || ''

    states.push({
      stateId,
      energy,
      energyUnit,
      configuration: configLabel,
      term,
      j,
      type: 'atomic'
    })
  }

  return states
}

/**
 * Extract molecular states from XSAMS document
 */
export function extractMolecularStates(doc) {
  const states = []
  const stateElements = doc.querySelectorAll('MolecularState')

  for (const state of stateElements) {
    const stateId = state.getAttribute('stateID') || ''

    // Energy
    const energyEl = state.querySelector('MolecularStateCharacterisation > StateEnergy > Value')
    const energy = energyEl ? parseFloat(energyEl.textContent) : null
    const energyUnit = energyEl?.getAttribute('units') || 'eV'

    // Try to get electronic state label or description
    const stateDesc = state.querySelector('Description')?.textContent || ''
    const elecState = state.querySelector('Case > ElecStateLabel')?.textContent || ''

    states.push({
      stateId,
      energy,
      energyUnit,
      configuration: elecState || stateDesc,
      term: '',
      j: '',
      type: 'molecular'
    })
  }

  return states
}

/**
 * Extract radiative transitions from XSAMS document
 */
export function extractTransitions(doc) {
  const transitions = []
  const transitionElements = doc.querySelectorAll('RadiativeTransition')

  for (const transition of transitionElements) {
    const id = transition.getAttribute('id') || ''
    const upperStateRef = transition.querySelector('UpperStateRef')?.textContent || ''
    const lowerStateRef = transition.querySelector('LowerStateRef')?.textContent || ''

    // Get wavelength/wavenumber/frequency
    const wavelengthEl = transition.querySelector('EnergyWavelength > Wavelength > Value')
    const wavenumberEl = transition.querySelector('EnergyWavelength > Wavenumber > Value')
    const frequencyEl = transition.querySelector('EnergyWavelength > Frequency > Value')

    let wavelength = null
    let wavelengthUnit = ''
    let wavenumber = null
    let wavenumberUnit = ''
    let frequency = null
    let frequencyUnit = ''

    if (wavelengthEl) {
      wavelength = parseFloat(wavelengthEl.textContent) || null
      wavelengthUnit = wavelengthEl.getAttribute('units') || 'A'
    }

    if (wavenumberEl) {
      wavenumber = parseFloat(wavenumberEl.textContent) || null
      wavenumberUnit = wavenumberEl.getAttribute('units') || '1/cm'
    }

    if (frequencyEl) {
      frequency = parseFloat(frequencyEl.textContent) || null
      frequencyUnit = frequencyEl.getAttribute('units') || 'MHz'
    }

    // Get probability (Einstein A coefficient)
    const probabilityEl = transition.querySelector('Probability > TransitionProbabilityA > Value')
    const probability = probabilityEl ? parseFloat(probabilityEl.textContent) : null

    transitions.push({
      id,
      upperStateRef,
      lowerStateRef,
      wavelength,
      wavelengthUnit,
      wavenumber,
      wavenumberUnit,
      frequency,
      frequencyUnit,
      probability,
    })
  }

  return transitions
}

/**
 * Extract collisional transitions from XSAMS document
 */
export function extractCollisions(doc) {
  const collisions = []
  const collisionElements = doc.querySelectorAll('CollisionalTransition')

  for (const collision of collisionElements) {
    const id = collision.getAttribute('id') || ''
    const reactants = []
    const products = []

    // Get reactant species refs
    const reactantRefs = collision.querySelectorAll('Reactant > SpeciesRef')
    for (const ref of reactantRefs) {
      reactants.push(ref.textContent || '')
    }

    // Get product species refs
    const productRefs = collision.querySelectorAll('Product > SpeciesRef')
    for (const ref of productRefs) {
      products.push(ref.textContent || '')
    }

    // Get data sets count
    const dataSetCount = collision.querySelectorAll('DataSets > DataSet').length

    collisions.push({
      id,
      reactants,
      products,
      dataSetCount,
    })
  }

  return collisions
}

/**
 * Parse XSAMS XML and extract all data types
 */
export function parseXSAMS(xml) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Failed to parse XSAMS XML: ' + parseError.textContent)
  }

  const atomicStates = extractAtomicStates(doc)
  const molecularStates = extractMolecularStates(doc)
  const states = [...atomicStates, ...molecularStates]

  // Build state lookup map
  const stateMap = new Map()
  for (const state of states) {
    stateMap.set(state.stateId, state)
  }

  return {
    atoms: extractAtoms(doc),
    molecules: extractMolecules(doc),
    states,
    stateMap,
    transitions: extractTransitions(doc),
    collisions: extractCollisions(doc),
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
