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
 * @returns {Promise<Object>} Result with availability info
 */
async function checkNode(node, query) {
  const url = buildQueryURL(node, query)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
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
 * Check data availability across multiple nodes in parallel
 *
 * @param {Array} nodes - Array of node objects
 * @param {string} query - VSS2 query string
 * @returns {Promise<Array>} Array of results
 */
export async function checkAvailability(nodes, query) {
  if (!query) {
    return []
  }

  const promises = nodes.map(node => checkNode(node, query))
  const results = await Promise.allSettled(promises)

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        nodeId: nodes[index].id,
        nodeName: nodes[index].name,
        available: false,
        error: result.reason?.message || 'Unknown error',
      }
    }
  })
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
