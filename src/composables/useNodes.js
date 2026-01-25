/**
 * Node interaction utilities for VAMDC TAP services
 */

import { buildQueryURL } from './useVSS2.js'

/**
 * Parse VAMDC-specific headers from a response
 */
function parseVamdcHeaders(headers) {
  return {
    atomCount: headers.get('VAMDC-COUNT-ATOMS'),
    moleculeCount: headers.get('VAMDC-COUNT-MOLECULES'),
    stateCount: headers.get('VAMDC-COUNT-STATES'),
    sourceCount: headers.get('VAMDC-COUNT-SOURCES'),
    processCount: headers.get('VAMDC-COUNT-RADIATIVE'),
    truncated: headers.get('VAMDC-TRUNCATED'),
    approxSize: headers.get('VAMDC-APPROX-SIZE'),
  }
}

/**
 * Check data availability at a single node via HEAD request
 *
 * @param {Object} node - Node object with id, name, url
 * @param {string} query - VSS2 query string
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object>} Result with availability info
 */
async function checkNode(node, query, signal) {
  const url = buildQueryURL(node, query)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      signal,
    })

    const vamdcHeaders = parseVamdcHeaders(response.headers)

    return {
      nodeId: node.id,
      nodeName: node.name,
      nodeUrl: node.url,
      available: response.ok,
      status: response.status,
      queryUrl: url,
      ...vamdcHeaders,
    }
  } catch (error) {
    // Don't report abort as an error
    if (error.name === 'AbortError') {
      return {
        nodeId: node.id,
        nodeName: node.name,
        nodeUrl: node.url,
        available: false,
        status: 0,
        aborted: true,
        queryUrl: url,
      }
    }
    return {
      nodeId: node.id,
      nodeName: node.name,
      nodeUrl: node.url,
      available: false,
      status: 0,
      error: error.message,
      queryUrl: url,
    }
  }
}

/**
 * Check data availability across multiple nodes in parallel,
 * streaming results as they arrive.
 *
 * @param {Array} nodes - Array of node objects
 * @param {string} query - VSS2 query string
 * @param {Function} onResult - Callback called with each result as it arrives
 * @param {AbortSignal} signal - Optional abort signal to cancel pending requests
 * @returns {Promise<void>} Resolves when all requests complete or are aborted
 */
export async function checkAvailabilityStreaming(nodes, query, onResult, signal) {
  if (!query) {
    return
  }

  const promises = nodes.map(async (node) => {
    const result = await checkNode(node, query, signal)
    if (!result.aborted) {
      onResult(result)
    }
    return result
  })

  await Promise.allSettled(promises)
}

/**
 * Check data availability across multiple nodes in parallel
 * (Legacy non-streaming version for backwards compatibility)
 *
 * @param {Array} nodes - Array of node objects
 * @param {string} query - VSS2 query string
 * @returns {Promise<Array>} Array of results
 */
export async function checkAvailability(nodes, query) {
  if (!query) {
    return []
  }

  const results = []
  await checkAvailabilityStreaming(nodes, query, (result) => {
    results.push(result)
  })
  return results
}

/**
 * Fetch capabilities from a node's /tap/capabilities endpoint
 *
 * @param {Object} node - Node object with url
 * @returns {Promise<Object>} Capabilities including restrictables
 */
export async function fetchNodeCapabilities(node) {
  const baseUrl = node.url.endsWith('/') ? node.url : `${node.url}/`
  const capUrl = `${baseUrl}capabilities`

  try {
    const response = await fetch(capUrl)
    const text = await response.text()

    // Parse XML capabilities (basic extraction)
    // Full XML parsing could be added if needed
    return {
      nodeId: node.id,
      available: response.ok,
      raw: text,
    }
  } catch (error) {
    return {
      nodeId: node.id,
      available: false,
      error: error.message,
    }
  }
}
