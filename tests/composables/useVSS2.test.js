import { describe, it, expect } from 'vitest'
import { generateQuery, encodeToURL, parseFromURL, buildQueryURL, getRequiredRestrictables } from '../../src/composables/useVSS2.js'

describe('useVSS2', () => {
  describe('generateQuery', () => {
    it('returns empty string for empty forms array', () => {
      expect(generateQuery([])).toBe('')
    })

    it('returns empty string for null/undefined', () => {
      expect(generateQuery(null)).toBe('')
      expect(generateQuery(undefined)).toBe('')
    })

    it('generates query for single atom symbol', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { symbol: 'Fe' }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE AtomSymbol = 'Fe'")
    })

    it('generates query for atom symbol with different case', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { symbol: 'fe' }
      }]
      // Should preserve user input
      expect(generateQuery(forms)).toBe("SELECT * WHERE AtomSymbol = 'fe'")
    })

    it('generates query for ion charge range', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { ionChargeMin: 1, ionChargeMax: 3 }
      }]
      const query = generateQuery(forms)
      expect(query).toContain('AtomIonCharge >= 1')
      expect(query).toContain('AtomIonCharge <= 3')
      expect(query).toContain('AND')
    })

    it('generates query for single ion charge (min only)', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { ionChargeMin: 2 }
      }]
      expect(generateQuery(forms)).toBe('SELECT * WHERE AtomIonCharge >= 2')
    })

    it('generates query for mass number', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { massNumber: 56 }
      }]
      expect(generateQuery(forms)).toBe('SELECT * WHERE AtomMassNumber = 56')
    })

    it('combines multiple conditions with AND', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: {
          symbol: 'Fe',
          ionChargeMin: 1,
          ionChargeMax: 2
        }
      }]
      const query = generateQuery(forms)
      expect(query).toContain("AtomSymbol = 'Fe'")
      expect(query).toContain('AtomIonCharge >= 1')
      expect(query).toContain('AtomIonCharge <= 2')
      expect(query.match(/AND/g).length).toBe(2)
    })

    it('ignores empty/null/undefined field values', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: {
          symbol: 'H',
          ionChargeMin: null,
          ionChargeMax: undefined,
          massNumber: ''
        }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE AtomSymbol = 'H'")
    })

    it('handles forms with empty fields object', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: {}
      }]
      expect(generateQuery(forms)).toBe('')
    })

    it('handles multiple forms', () => {
      const forms = [
        { id: 1, type: 'atoms', fields: { symbol: 'H' } },
        { id: 2, type: 'atoms', fields: { symbol: 'He' } }
      ]
      const query = generateQuery(forms)
      expect(query).toContain("AtomSymbol = 'H'")
      expect(query).toContain("AtomSymbol = 'He'")
    })

    // Molecules form tests
    it('generates query for molecule stoichiometric formula', () => {
      const forms = [{
        id: 1,
        type: 'molecules',
        fields: { stoichiometricFormula: 'H2O' }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE MoleculeStoichiometricFormula = 'H2O'")
    })

    it('generates query for molecule chemical name', () => {
      const forms = [{
        id: 1,
        type: 'molecules',
        fields: { chemicalName: 'water' }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE MoleculeChemicalName = 'water'")
    })

    it('generates query for molecule InChIKey', () => {
      const forms = [{
        id: 1,
        type: 'molecules',
        fields: { inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N' }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE InChIKey = 'XLYOFNOQVPJJNP-UHFFFAOYSA-N'")
    })

    it('combines molecule fields with AND', () => {
      const forms = [{
        id: 1,
        type: 'molecules',
        fields: { stoichiometricFormula: 'CO2', chemicalName: 'carbon dioxide' }
      }]
      const query = generateQuery(forms)
      expect(query).toContain("MoleculeStoichiometricFormula = 'CO2'")
      expect(query).toContain("MoleculeChemicalName = 'carbon dioxide'")
      expect(query).toContain('AND')
    })

    // Radiative form tests
    it('generates query for radiative wavelength range', () => {
      const forms = [{
        id: 1,
        type: 'radiative',
        fields: { wavelengthMin: 4000, wavelengthMax: 7000 }
      }]
      const query = generateQuery(forms)
      expect(query).toContain('RadTransWavelength >= 4000')
      expect(query).toContain('RadTransWavelength <= 7000')
    })

    it('generates query for radiative frequency range', () => {
      const forms = [{
        id: 1,
        type: 'radiative',
        fields: { frequencyMin: 1000, frequencyMax: 2000 }
      }]
      const query = generateQuery(forms)
      expect(query).toContain('RadTransFrequency >= 1000')
      expect(query).toContain('RadTransFrequency <= 2000')
    })

    it('generates query for radiative wavenumber range', () => {
      const forms = [{
        id: 1,
        type: 'radiative',
        fields: { wavenumberMin: 10000, wavenumberMax: 25000 }
      }]
      const query = generateQuery(forms)
      expect(query).toContain('RadTransWavenumber >= 10000')
      expect(query).toContain('RadTransWavenumber <= 25000')
    })

    it('generates query for radiative energy range', () => {
      const forms = [{
        id: 1,
        type: 'radiative',
        fields: { energyMin: 1.5, energyMax: 3.0 }
      }]
      const query = generateQuery(forms)
      expect(query).toContain('RadTransEnergy >= 1.5')
      expect(query).toContain('RadTransEnergy <= 3')
    })

    it('generates query for single radiative wavelength bound', () => {
      const forms = [{
        id: 1,
        type: 'radiative',
        fields: { wavelengthMin: 5000 }
      }]
      expect(generateQuery(forms)).toBe('SELECT * WHERE RadTransWavelength >= 5000')
    })

    // Collisions form tests
    it('generates query for collision target atom symbol', () => {
      const forms = [{
        id: 1,
        type: 'collisions',
        fields: { targetSymbol: 'H' }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE AtomSymbol = 'H'")
    })

    it('generates query for collision target molecule formula', () => {
      const forms = [{
        id: 1,
        type: 'collisions',
        fields: { targetFormula: 'H2' }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE MoleculeStoichiometricFormula = 'H2'")
    })

    it('generates query for collision species (collider)', () => {
      const forms = [{
        id: 1,
        type: 'collisions',
        fields: { colliderSymbol: 'e-' }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE CollisionSpecies = 'e-'")
    })

    it('generates query for collision process type', () => {
      const forms = [{
        id: 1,
        type: 'collisions',
        fields: { processType: 'ioni' }
      }]
      expect(generateQuery(forms)).toBe("SELECT * WHERE CollisionCode = 'ioni'")
    })

    it('generates query for collision temperature range', () => {
      const forms = [{
        id: 1,
        type: 'collisions',
        fields: { temperatureMin: 100, temperatureMax: 1000 }
      }]
      const query = generateQuery(forms)
      expect(query).toContain('CollisionTrange >= 100')
      expect(query).toContain('CollisionTrange <= 1000')
    })

    it('generates query for collision energy range', () => {
      const forms = [{
        id: 1,
        type: 'collisions',
        fields: { energyMin: 0.1, energyMax: 10 }
      }]
      const query = generateQuery(forms)
      expect(query).toContain('CollisionEnergy >= 0.1')
      expect(query).toContain('CollisionEnergy <= 10')
    })

    it('combines collision fields with AND', () => {
      const forms = [{
        id: 1,
        type: 'collisions',
        fields: {
          targetSymbol: 'H',
          colliderSymbol: 'e-',
          processType: 'exci'
        }
      }]
      const query = generateQuery(forms)
      expect(query).toContain("AtomSymbol = 'H'")
      expect(query).toContain("CollisionSpecies = 'e-'")
      expect(query).toContain("CollisionCode = 'exci'")
      expect(query.match(/AND/g).length).toBe(2)
    })

    // Mixed form tests
    it('combines atoms and molecules forms', () => {
      const forms = [
        { id: 1, type: 'atoms', fields: { symbol: 'Fe' } },
        { id: 2, type: 'molecules', fields: { stoichiometricFormula: 'H2O' } }
      ]
      const query = generateQuery(forms)
      expect(query).toContain("AtomSymbol = 'Fe'")
      expect(query).toContain("MoleculeStoichiometricFormula = 'H2O'")
    })

    it('combines atoms and radiative forms', () => {
      const forms = [
        { id: 1, type: 'atoms', fields: { symbol: 'Fe', ionChargeMin: 1 } },
        { id: 2, type: 'radiative', fields: { wavelengthMin: 4000, wavelengthMax: 7000 } }
      ]
      const query = generateQuery(forms)
      expect(query).toContain("AtomSymbol = 'Fe'")
      expect(query).toContain('AtomIonCharge >= 1')
      expect(query).toContain('RadTransWavelength >= 4000')
      expect(query).toContain('RadTransWavelength <= 7000')
    })
  })

  describe('encodeToURL', () => {
    it('returns empty string for empty forms', () => {
      expect(encodeToURL([])).toBe('')
      expect(encodeToURL(null)).toBe('')
    })

    it('encodes single form with single field', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { symbol: 'Fe' }
      }]
      expect(encodeToURL(forms)).toBe('atoms.symbol=Fe')
    })

    it('encodes multiple fields', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { symbol: 'Fe', ionChargeMin: 1 }
      }]
      const encoded = encodeToURL(forms)
      expect(encoded).toContain('atoms.symbol=Fe')
      expect(encoded).toContain('atoms.ionChargeMin=1')
    })

    it('URL-encodes special characters', () => {
      const forms = [{
        id: 1,
        type: 'molecules',
        fields: { chemicalName: 'water & ice' }
      }]
      expect(encodeToURL(forms)).toBe('molecules.chemicalName=water%20%26%20ice')
    })

    it('ignores empty/null/undefined values', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { symbol: 'H', ionChargeMin: null, massNumber: '' }
      }]
      expect(encodeToURL(forms)).toBe('atoms.symbol=H')
    })
  })

  describe('parseFromURL', () => {
    it('returns empty array for empty string', () => {
      expect(parseFromURL('')).toEqual([])
      expect(parseFromURL(null)).toEqual([])
    })

    it('parses single field', () => {
      const forms = parseFromURL('atoms.symbol=Fe')
      expect(forms).toHaveLength(1)
      expect(forms[0].type).toBe('atoms')
      expect(forms[0].fields.symbol).toBe('Fe')
    })

    it('parses multiple fields for same form type', () => {
      const forms = parseFromURL('atoms.symbol=Fe&atoms.ionChargeMin=1')
      expect(forms).toHaveLength(1)
      expect(forms[0].fields.symbol).toBe('Fe')
      expect(forms[0].fields.ionChargeMin).toBe(1)
    })

    it('parses numeric values as numbers', () => {
      const forms = parseFromURL('atoms.ionChargeMin=2&atoms.ionChargeMax=5')
      expect(forms[0].fields.ionChargeMin).toBe(2)
      expect(forms[0].fields.ionChargeMax).toBe(5)
      expect(typeof forms[0].fields.ionChargeMin).toBe('number')
    })

    it('decodes URL-encoded values', () => {
      const forms = parseFromURL('molecules.chemicalName=water%20%26%20ice')
      expect(forms[0].fields.chemicalName).toBe('water & ice')
    })

    it('assigns unique ids to forms', () => {
      const forms = parseFromURL('atoms.symbol=H&molecules.formula=H2O')
      expect(forms).toHaveLength(2)
      expect(forms[0].id).not.toBe(forms[1].id)
    })
  })

  describe('URL round-trip', () => {
    it('round-trips simple form state', () => {
      const original = [{
        id: 1,
        type: 'atoms',
        fields: { symbol: 'Fe' }
      }]
      const encoded = encodeToURL(original)
      const decoded = parseFromURL(encoded)

      expect(decoded).toHaveLength(1)
      expect(decoded[0].type).toBe('atoms')
      expect(decoded[0].fields.symbol).toBe('Fe')
    })

    it('round-trips numeric fields', () => {
      const original = [{
        id: 1,
        type: 'atoms',
        fields: { ionChargeMin: 1, ionChargeMax: 3 }
      }]
      const encoded = encodeToURL(original)
      const decoded = parseFromURL(encoded)

      expect(decoded[0].fields.ionChargeMin).toBe(1)
      expect(decoded[0].fields.ionChargeMax).toBe(3)
    })

    it('round-trips molecules form', () => {
      const original = [{
        id: 1,
        type: 'molecules',
        fields: { stoichiometricFormula: 'H2O', chemicalName: 'water' }
      }]
      const encoded = encodeToURL(original)
      const decoded = parseFromURL(encoded)

      expect(decoded[0].type).toBe('molecules')
      expect(decoded[0].fields.stoichiometricFormula).toBe('H2O')
      expect(decoded[0].fields.chemicalName).toBe('water')
    })

    it('round-trips radiative form with numeric ranges', () => {
      const original = [{
        id: 1,
        type: 'radiative',
        fields: { wavelengthMin: 4000, wavelengthMax: 7000 }
      }]
      const encoded = encodeToURL(original)
      const decoded = parseFromURL(encoded)

      expect(decoded[0].type).toBe('radiative')
      expect(decoded[0].fields.wavelengthMin).toBe(4000)
      expect(decoded[0].fields.wavelengthMax).toBe(7000)
    })

    it('round-trips collisions form', () => {
      const original = [{
        id: 1,
        type: 'collisions',
        fields: { targetSymbol: 'H', temperatureMin: 100, temperatureMax: 1000 }
      }]
      const encoded = encodeToURL(original)
      const decoded = parseFromURL(encoded)

      expect(decoded[0].type).toBe('collisions')
      expect(decoded[0].fields.targetSymbol).toBe('H')
      expect(decoded[0].fields.temperatureMin).toBe(100)
      expect(decoded[0].fields.temperatureMax).toBe(1000)
    })

    it('round-trips mixed form types', () => {
      const original = [
        { id: 1, type: 'atoms', fields: { symbol: 'Fe' } },
        { id: 2, type: 'radiative', fields: { wavelengthMin: 5000 } }
      ]
      const encoded = encodeToURL(original)
      const decoded = parseFromURL(encoded)

      expect(decoded).toHaveLength(2)
      expect(decoded.find(f => f.type === 'atoms').fields.symbol).toBe('Fe')
      expect(decoded.find(f => f.type === 'radiative').fields.wavelengthMin).toBe(5000)
    })
  })

  describe('buildQueryURL', () => {
    it('builds correct URL with trailing slash', () => {
      const node = { url: 'http://example.com/tap/' }
      const query = "SELECT * WHERE AtomSymbol = 'Fe'"
      const url = buildQueryURL(node, query)

      expect(url).toBe("http://example.com/tap/sync?LANG=VSS2&FORMAT=XSAMS&QUERY=SELECT%20*%20WHERE%20AtomSymbol%20%3D%20'Fe'")
    })

    it('builds correct URL without trailing slash', () => {
      const node = { url: 'http://example.com/tap' }
      const query = "SELECT * WHERE AtomSymbol = 'H'"
      const url = buildQueryURL(node, query)

      expect(url).toContain('http://example.com/tap/sync?')
    })

    it('properly encodes query parameter', () => {
      const node = { url: 'http://example.com/tap/' }
      const query = "SELECT * WHERE AtomIonCharge >= 1 AND AtomIonCharge <= 3"
      const url = buildQueryURL(node, query)

      expect(url).toContain('QUERY=')
      expect(url).toContain(encodeURIComponent(query))
    })
  })

  describe('getRequiredRestrictables', () => {
    it('returns empty set for empty forms', () => {
      expect(getRequiredRestrictables([])).toEqual(new Set())
      expect(getRequiredRestrictables(null)).toEqual(new Set())
    })

    it('extracts restrictables from atoms form', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { symbol: 'Fe', ionChargeMin: 1 }
      }]
      const required = getRequiredRestrictables(forms)
      expect(required.has('AtomSymbol')).toBe(true)
      expect(required.has('AtomIonCharge')).toBe(true)
      expect(required.size).toBe(2)
    })

    it('extracts restrictables from molecules form', () => {
      const forms = [{
        id: 1,
        type: 'molecules',
        fields: { stoichiometricFormula: 'H2O' }
      }]
      const required = getRequiredRestrictables(forms)
      expect(required.has('MoleculeStoichiometricFormula')).toBe(true)
      expect(required.size).toBe(1)
    })

    it('extracts restrictables from radiative form', () => {
      const forms = [{
        id: 1,
        type: 'radiative',
        fields: { wavelengthMin: 4000, wavelengthMax: 7000 }
      }]
      const required = getRequiredRestrictables(forms)
      expect(required.has('RadTransWavelength')).toBe(true)
      expect(required.size).toBe(1)
    })

    it('extracts restrictables from collisions form', () => {
      const forms = [{
        id: 1,
        type: 'collisions',
        fields: { targetSymbol: 'H', processType: 'ioni' }
      }]
      const required = getRequiredRestrictables(forms)
      expect(required.has('AtomSymbol')).toBe(true)
      expect(required.has('CollisionCode')).toBe(true)
      expect(required.size).toBe(2)
    })

    it('ignores empty field values', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { symbol: 'Fe', ionChargeMin: null, massNumber: '' }
      }]
      const required = getRequiredRestrictables(forms)
      expect(required.size).toBe(1)
      expect(required.has('AtomSymbol')).toBe(true)
    })

    it('deduplicates restrictables from min/max fields', () => {
      const forms = [{
        id: 1,
        type: 'atoms',
        fields: { ionChargeMin: 1, ionChargeMax: 3 }
      }]
      const required = getRequiredRestrictables(forms)
      expect(required.has('AtomIonCharge')).toBe(true)
      expect(required.size).toBe(1)
    })

    it('combines restrictables from multiple forms', () => {
      const forms = [
        { id: 1, type: 'atoms', fields: { symbol: 'Fe' } },
        { id: 2, type: 'radiative', fields: { wavelengthMin: 5000 } }
      ]
      const required = getRequiredRestrictables(forms)
      expect(required.has('AtomSymbol')).toBe(true)
      expect(required.has('RadTransWavelength')).toBe(true)
      expect(required.size).toBe(2)
    })
  })
})
