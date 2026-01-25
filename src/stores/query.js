import { defineStore } from 'pinia'
import { generateQuery, encodeToURL, parseFromURL } from '../composables/useVSS2.js'
import { checkAvailability } from '../composables/useNodes.js'
import nodes from '../data/nodes.json'

export const useQueryStore = defineStore('query', {
  state: () => ({
    forms: [],
    previewResults: [],
    isPreviewLoading: false,
  }),

  getters: {
    vss2Query: (state) => generateQuery(state.forms),

    hasValidQuery: (state) => {
      return state.forms.some(form => {
        const fields = form.fields || {}
        return Object.values(fields).some(v => v !== '' && v !== null && v !== undefined)
      })
    },

    availableNodes: (state) => {
      return state.previewResults.filter(r => r.available)
    },
  },

  actions: {
    addForm(type) {
      this.forms.push({
        id: Date.now(),
        type,
        fields: {},
      })
    },

    removeForm(formId) {
      const index = this.forms.findIndex(f => f.id === formId)
      if (index !== -1) {
        this.forms.splice(index, 1)
      }
    },

    updateFormField(formId, field, value) {
      const form = this.forms.find(f => f.id === formId)
      if (form) {
        form.fields[field] = value
      }
    },

    async runPreview() {
      if (!this.hasValidQuery) return

      this.isPreviewLoading = true
      this.previewResults = []

      try {
        const results = await checkAvailability(nodes, this.vss2Query)
        this.previewResults = results
      } catch (error) {
        console.error('Preview failed:', error)
      } finally {
        this.isPreviewLoading = false
      }
    },

    syncToURL() {
      const hash = encodeToURL(this.forms)
      if (hash) {
        window.history.replaceState(null, '', `#${hash}`)
      } else {
        window.history.replaceState(null, '', window.location.pathname)
      }
    },

    loadFromURL() {
      const hash = window.location.hash.slice(1)
      if (hash) {
        const forms = parseFromURL(hash)
        if (forms && forms.length > 0) {
          this.forms = forms
        }
      }
    },
  },
})
