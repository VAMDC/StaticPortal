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
 * Extract radiative transitions from XSAMS document
 */
export function extractTransitions(doc) {
  const transitions = []
  const transitionElements = doc.querySelectorAll('RadiativeTransition')

  for (const transition of transitionElements) {
    const id = transition.getAttribute('id') || ''
    const upperStateRef = transition.querySelector('UpperStateRef')?.textContent || ''
    const lowerStateRef = transition.querySelector('LowerStateRef')?.textContent || ''

    // Get wavelength/wavenumber
    const wavelengthEl = transition.querySelector('EnergyWavelength > Wavelength > Value')
    const wavenumberEl = transition.querySelector('EnergyWavelength > Wavenumber > Value')

    let wavelength = null
    let wavelengthUnit = ''
    let wavenumber = null
    let wavenumberUnit = ''

    if (wavelengthEl) {
      wavelength = parseFloat(wavelengthEl.textContent) || null
      wavelengthUnit = wavelengthEl.getAttribute('units') || 'A'
    }

    if (wavenumberEl) {
      wavenumber = parseFloat(wavenumberEl.textContent) || null
      wavenumberUnit = wavenumberEl.getAttribute('units') || '1/cm'
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

  return {
    atoms: extractAtoms(doc),
    molecules: extractMolecules(doc),
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
