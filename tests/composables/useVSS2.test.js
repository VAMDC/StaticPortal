import { describe, it, expect } from 'vitest'
import { generateQuery, encodeToURL, parseFromURL, buildQueryURL } from '../../src/composables/useVSS2.js'

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
})
