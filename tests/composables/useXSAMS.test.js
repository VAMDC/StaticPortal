import { describe, it, expect } from 'vitest'
import {
  parseXSAMS,
  extractAtoms,
  extractMolecules,
  extractTransitions,
  extractCollisions,
  formatFileSize,
} from '../../src/composables/useXSAMS.js'

describe('useXSAMS', () => {
  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(100)).toBe('100 B')
      expect(formatFileSize(0)).toBe('0 B')
    })

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(2560)).toBe('2.5 KB')
    })

    it('formats megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatFileSize(52428800)).toBe('50.0 MB')
    })

    it('formats gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
    })

    it('handles null/undefined', () => {
      expect(formatFileSize(null)).toBe('Unknown size')
      expect(formatFileSize(undefined)).toBe('Unknown size')
    })
  })

  describe('extractAtoms', () => {
    it('extracts atom data from XSAMS', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Species>
            <Atoms>
              <Atom>
                <ChemicalElement>
                  <NuclearCharge>26</NuclearCharge>
                  <ElementSymbol>Fe</ElementSymbol>
                </ChemicalElement>
                <Isotope>
                  <IsotopeParameters>
                    <MassNumber>56</MassNumber>
                  </IsotopeParameters>
                  <Ion>
                    <IonCharge>2</IonCharge>
                    <AtomicState/>
                    <AtomicState/>
                    <AtomicState/>
                  </Ion>
                </Isotope>
              </Atom>
            </Atoms>
          </Species>
        </XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const atoms = extractAtoms(doc)

      expect(atoms).toHaveLength(1)
      expect(atoms[0]).toEqual({
        symbol: 'Fe',
        atomicNumber: 26,
        massNumber: 56,
        ionCharge: 2,
        stateCount: 3,
      })
    })

    it('handles atoms without isotope wrapper', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Species>
            <Atoms>
              <Atom>
                <ChemicalElement>
                  <NuclearCharge>1</NuclearCharge>
                  <ElementSymbol>H</ElementSymbol>
                </ChemicalElement>
                <Ion>
                  <IonCharge>0</IonCharge>
                  <AtomicState/>
                </Ion>
              </Atom>
            </Atoms>
          </Species>
        </XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const atoms = extractAtoms(doc)

      expect(atoms).toHaveLength(1)
      expect(atoms[0].symbol).toBe('H')
      expect(atoms[0].ionCharge).toBe(0)
      expect(atoms[0].massNumber).toBeNull()
    })

    it('returns empty array for no atoms', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData><Species></Species></XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const atoms = extractAtoms(doc)

      expect(atoms).toHaveLength(0)
    })
  })

  describe('extractMolecules', () => {
    it('extracts molecule data from XSAMS', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Species>
            <Molecules>
              <Molecule speciesID="X-CDMS-12345">
                <MolecularChemicalSpecies>
                  <ChemicalName>
                    <Value>Water</Value>
                  </ChemicalName>
                  <StoichiometricFormula>H2O</StoichiometricFormula>
                  <OrdinaryStructuralFormula>
                    <Value>H2O</Value>
                  </OrdinaryStructuralFormula>
                  <InChIKey>XLYOFNOQVPJJNP-UHFFFAOYSA-N</InChIKey>
                </MolecularChemicalSpecies>
                <MolecularState/>
                <MolecularState/>
              </Molecule>
            </Molecules>
          </Species>
        </XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const molecules = extractMolecules(doc)

      expect(molecules).toHaveLength(1)
      expect(molecules[0]).toEqual({
        speciesId: 'X-CDMS-12345',
        chemicalName: 'Water',
        stoichiometricFormula: 'H2O',
        ordinaryStructuralFormula: 'H2O',
        inchiKey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N',
        stateCount: 2,
      })
    })

    it('uses stoichiometric formula when structural is missing', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Species>
            <Molecules>
              <Molecule speciesID="X-123">
                <MolecularChemicalSpecies>
                  <StoichiometricFormula>CO2</StoichiometricFormula>
                </MolecularChemicalSpecies>
              </Molecule>
            </Molecules>
          </Species>
        </XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const molecules = extractMolecules(doc)

      expect(molecules[0].ordinaryStructuralFormula).toBe('CO2')
    })
  })

  describe('extractTransitions', () => {
    it('extracts radiative transition data', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Processes>
            <Radiative>
              <RadiativeTransition id="T001">
                <UpperStateRef>S001</UpperStateRef>
                <LowerStateRef>S002</LowerStateRef>
                <EnergyWavelength>
                  <Wavelength>
                    <Value units="A">6562.8</Value>
                  </Wavelength>
                  <Wavenumber>
                    <Value units="1/cm">15233.2</Value>
                  </Wavenumber>
                </EnergyWavelength>
                <Probability>
                  <TransitionProbabilityA>
                    <Value>4.41e7</Value>
                  </TransitionProbabilityA>
                </Probability>
              </RadiativeTransition>
            </Radiative>
          </Processes>
        </XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const transitions = extractTransitions(doc)

      expect(transitions).toHaveLength(1)
      expect(transitions[0]).toEqual({
        id: 'T001',
        upperStateRef: 'S001',
        lowerStateRef: 'S002',
        wavelength: 6562.8,
        wavelengthUnit: 'A',
        wavenumber: 15233.2,
        wavenumberUnit: '1/cm',
        frequency: null,
        frequencyUnit: '',
        probability: 4.41e7,
      })
    })

    it('handles missing wavelength/wavenumber', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Processes>
            <Radiative>
              <RadiativeTransition id="T002">
                <UpperStateRef>S003</UpperStateRef>
                <LowerStateRef>S004</LowerStateRef>
              </RadiativeTransition>
            </Radiative>
          </Processes>
        </XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const transitions = extractTransitions(doc)

      expect(transitions[0].wavelength).toBeNull()
      expect(transitions[0].wavenumber).toBeNull()
      expect(transitions[0].probability).toBeNull()
    })
  })

  describe('extractCollisions', () => {
    it('extracts collisional transition data', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Processes>
            <Collisions>
              <CollisionalTransition id="C001">
                <Reactant><SpeciesRef>Fe</SpeciesRef></Reactant>
                <Reactant><SpeciesRef>e-</SpeciesRef></Reactant>
                <Product><SpeciesRef>Fe+</SpeciesRef></Product>
                <Product><SpeciesRef>e-</SpeciesRef></Product>
                <DataSets>
                  <DataSet><Data>1</Data></DataSet>
                  <DataSet><Data>2</Data></DataSet>
                </DataSets>
              </CollisionalTransition>
            </Collisions>
          </Processes>
        </XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const collisions = extractCollisions(doc)

      expect(collisions).toHaveLength(1)
      expect(collisions[0]).toEqual({
        id: 'C001',
        reactants: ['Fe', 'e-'],
        products: ['Fe+', 'e-'],
        dataSetCount: 2,
      })
    })

    it('handles empty reactants/products', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Processes>
            <Collisions>
              <CollisionalTransition id="C002">
              </CollisionalTransition>
            </Collisions>
          </Processes>
        </XSAMSData>`

      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'text/xml')
      const collisions = extractCollisions(doc)

      expect(collisions[0].reactants).toEqual([])
      expect(collisions[0].products).toEqual([])
      expect(collisions[0].dataSetCount).toBe(0)
    })
  })

  describe('parseXSAMS', () => {
    it('parses complete XSAMS document', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData>
          <Species>
            <Atoms>
              <Atom>
                <ChemicalElement>
                  <NuclearCharge>1</NuclearCharge>
                  <ElementSymbol>H</ElementSymbol>
                </ChemicalElement>
                <Ion>
                  <IonCharge>0</IonCharge>
                </Ion>
              </Atom>
            </Atoms>
            <Molecules>
              <Molecule speciesID="M1">
                <MolecularChemicalSpecies>
                  <StoichiometricFormula>H2</StoichiometricFormula>
                </MolecularChemicalSpecies>
              </Molecule>
            </Molecules>
          </Species>
          <Processes>
            <Radiative>
              <RadiativeTransition id="T1">
                <UpperStateRef>S1</UpperStateRef>
                <LowerStateRef>S2</LowerStateRef>
              </RadiativeTransition>
            </Radiative>
          </Processes>
        </XSAMSData>`

      const result = parseXSAMS(xml)

      expect(result.atoms).toHaveLength(1)
      expect(result.molecules).toHaveLength(1)
      expect(result.transitions).toHaveLength(1)
      expect(result.collisions).toHaveLength(0)
    })

    it('returns empty data for malformed XML', () => {
      const invalidXml = '<not valid xml'
      const result = parseXSAMS(invalidXml)

      // Happy-dom doesn't throw on invalid XML, it just returns empty document
      expect(result.atoms).toHaveLength(0)
      expect(result.molecules).toHaveLength(0)
      expect(result.transitions).toHaveLength(0)
      expect(result.collisions).toHaveLength(0)
    })

    it('handles empty document', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <XSAMSData></XSAMSData>`

      const result = parseXSAMS(xml)

      expect(result.atoms).toHaveLength(0)
      expect(result.molecules).toHaveLength(0)
      expect(result.transitions).toHaveLength(0)
      expect(result.collisions).toHaveLength(0)
    })
  })
})
