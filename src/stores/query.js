import { defineStore } from 'pinia'
import { generateQuery, encodeToURL, parseFromURL, getRequiredRestrictables } from '../composables/useVSS2.js'
import { checkAvailabilityStreaming } from '../composables/useNodes.js'
import allNodes from '../data/nodes.json'

// Only use active nodes
const nodes = allNodes.filter(n => n.active !== false)

/**
 * Filter nodes by supported restrictables (case-insensitive)
 */
function filterNodesByCapabilities(nodeList, requiredRestrictables) {
  if (requiredRestrictables.size === 0) {
    return nodeList
  }

  return nodeList.filter(node => {
    const nodeRestrictables = (node.restrictables || []).map(r => r.toLowerCase())
    // Node must support ALL required restrictables
    for (const required of requiredRestrictables) {
      if (!nodeRestrictables.includes(required.toLowerCase())) {
        return false
      }
    }
    return true
  })
}

// Store abort controller outside of reactive state
let previewAbortController = null
let xsamsAbortController = null

export const useQueryStore = defineStore('query', {
  state: () => ({
    forms: [],
    customQuery: null, // When set, overrides generated query
    previewResults: [],
    isPreviewLoading: false,
    pendingNodeCount: 0,
    selectedNodeId: null,
    totalNodeCount: nodes.length, // Only active nodes
    compatibleNodeCount: 0,
    // XSAMS preview state
    previewNodeId: null,
    previewData: null,
    previewLoading: false,
    previewError: null,
    previewSize: null,
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

      // Cancel any existing preview
      if (previewAbortController) {
        previewAbortController.abort()
      }

      previewAbortController = new AbortController()
      this.isPreviewLoading = true
      this.previewResults = []

      // Filter nodes by capabilities
      const requiredRestrictables = getRequiredRestrictables(this.forms)
      const compatibleNodes = filterNodesByCapabilities(nodes, requiredRestrictables)
      this.compatibleNodeCount = compatibleNodes.length
      this.pendingNodeCount = compatibleNodes.length

      try {
        await checkAvailabilityStreaming(
          compatibleNodes,
          this.vss2Query,
          (result) => {
            // Add result as it arrives
            this.previewResults.push(result)
            this.pendingNodeCount--
          },
          previewAbortController.signal
        )
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Preview failed:', error)
        }
      } finally {
        this.isPreviewLoading = false
        this.pendingNodeCount = 0
        previewAbortController = null
      }
    },

    stopPreview() {
      if (previewAbortController) {
        previewAbortController.abort()
        previewAbortController = null
      }
      this.isPreviewLoading = false
      this.pendingNodeCount = 0
    },

    async runPreviewWithQuery(query) {
      this.customQuery = query

      // Cancel any existing preview
      if (previewAbortController) {
        previewAbortController.abort()
      }

      previewAbortController = new AbortController()
      this.isPreviewLoading = true
      this.previewResults = []

      // When using custom query, query all nodes (can't filter by capabilities)
      this.compatibleNodeCount = nodes.length
      this.pendingNodeCount = nodes.length

      try {
        await checkAvailabilityStreaming(
          nodes,
          query,
          (result) => {
            this.previewResults.push(result)
            this.pendingNodeCount--
          },
          previewAbortController.signal
        )
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Preview failed:', error)
        }
      } finally {
        this.isPreviewLoading = false
        this.pendingNodeCount = 0
        previewAbortController = null
      }
    },

    selectNode(nodeId) {
      this.selectedNodeId = nodeId
    },

    syncToURL(replace = false) {
      const hash = encodeToURL(this.forms)
      const newURL = hash ? `#${hash}` : window.location.pathname
      const currentHash = window.location.hash.slice(1)

      // Skip if URL hasn't changed
      if (hash === currentHash) return

      if (replace) {
        window.history.replaceState(null, '', newURL)
      } else {
        window.history.pushState(null, '', newURL)
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

    async openPreview(nodeId) {
      // Cancel any existing preview load
      if (xsamsAbortController) {
        xsamsAbortController.abort()
      }

      this.previewNodeId = nodeId
      this.previewData = null
      this.previewError = null
      this.previewSize = null
      this.previewLoading = true

      // Find the query URL for this node
      const result = this.previewResults.find(r => r.nodeId === nodeId)
      if (!result?.queryUrl) {
        this.previewError = 'No query URL available'
        this.previewLoading = false
        return
      }

      xsamsAbortController = new AbortController()

      try {
        // First check size via HEAD request
        const headResponse = await fetch(result.queryUrl, {
          method: 'HEAD',
          signal: xsamsAbortController.signal,
        })

        const contentLength = headResponse.headers.get('Content-Length')
        this.previewSize = contentLength ? parseInt(contentLength, 10) : null

        // If size is over 50MB, pause and wait for confirmation
        const maxSize = 50 * 1024 * 1024
        if (this.previewSize && this.previewSize > maxSize) {
          this.previewLoading = false
          return
        }

        // Proceed to load data
        await this.loadPreviewData()
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.previewError = error.message || 'Failed to check file size'
          this.previewLoading = false
        }
      }
    },

    async loadPreviewData() {
      const result = this.previewResults.find(r => r.nodeId === this.previewNodeId)
      if (!result?.queryUrl) {
        this.previewError = 'No query URL available'
        this.previewLoading = false
        return
      }

      this.previewLoading = true
      this.previewError = null

      if (!xsamsAbortController) {
        xsamsAbortController = new AbortController()
      }

      try {
        const response = await fetch(result.queryUrl, {
          signal: xsamsAbortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const xml = await response.text()
        this.previewData = xml
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.previewError = error.message || 'Failed to load XSAMS data'
        }
      } finally {
        this.previewLoading = false
        xsamsAbortController = null
      }
    },

    closePreview() {
      if (xsamsAbortController) {
        xsamsAbortController.abort()
        xsamsAbortController = null
      }
      this.previewNodeId = null
      this.previewData = null
      this.previewError = null
      this.previewSize = null
      this.previewLoading = false
    },
  },
})
