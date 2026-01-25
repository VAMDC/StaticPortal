#!/usr/bin/env node
/**
 * Update nodes.json and consumers.json from the VAMDC registry
 *
 * Usage:
 *   node scripts/update-registry.js
 *   npm run update-registry
 *
 * The VAMDC registry uses SOAP/XML. This script sends XQuery requests
 * to fetch the current list of nodes and consumers.
 *
 * For consumers, we fetch the /capabilities endpoint to get the actual
 * service URL (registry URLs don't include the /service path).
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse command line args
const DEBUG = process.argv.includes('--debug')

const REGISTRY_URL = 'https://registry.vamdc.org/registry-12.07/services/RegistryQueryv1_0'

// XQuery to fetch VAMDC-TAP nodes (data providers)
// Use *:Resource to match Resource element in any namespace
const NODES_XQUERY = `
  for $x in //*:Resource[not (@status='inactive') and not (@status='deleted')]
  where $x/*:capability[@standardID='ivo://vamdc/std/VAMDC-TAP']
  return $x
`.trim()

// XQuery to fetch XSAMS consumers (data processors)
const CONSUMERS_XQUERY = `
  for $x in //*:Resource[not (@status='inactive') and not (@status='deleted')]
  where $x/*:capability[@standardID='ivo://vamdc/std/XSAMS-consumer']
  return $x
`.trim()

/**
 * Build SOAP envelope for registry query
 */
function buildSoapRequest(xquery) {
  // The registry expects 'xquery' element without namespace prefix
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ri="http://www.ivoa.net/wsdl/RegistrySearch/v1.0">
  <soapenv:Body>
    <ri:XQuerySearch>
      <xquery><![CDATA[${xquery}]]></xquery>
    </ri:XQuerySearch>
  </soapenv:Body>
</soapenv:Envelope>`
}

/**
 * Decode HTML entities in text (handles double-encoding)
 */
function decodeEntities(text) {
  if (!text) return text
  let result = text
  let prev
  // Loop until no more entities are decoded (handles double-encoding)
  do {
    prev = result
    result = result
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
  } while (result !== prev)
  return result
}

/**
 * Extract text content from XML element
 */
function extractText(xml, tagName) {
  // Handle namespaced tags like <title> or <ns:title>
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'),
    new RegExp(`<[^:]+:${tagName}[^>]*>([^<]*)</[^:]+:${tagName}>`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = xml.match(pattern)
    if (match) return decodeEntities(match[1].trim())
  }
  return null
}

/**
 * Extract accessURL from capability element
 */
function extractAccessURL(xml, standardID) {
  // Find the capability block with the given standardID
  const capabilityPattern = new RegExp(
    `<capability[^>]*standardID=["']${standardID}["'][^>]*>([\\s\\S]*?)</capability>`,
    'i'
  )
  const capMatch = xml.match(capabilityPattern)
  if (!capMatch) return null

  const capabilityXml = capMatch[1]

  // Extract accessURL from the interface
  const urlPatterns = [
    /<accessURL[^>]*>([^<]+)<\/accessURL>/i,
    /<[^:]+:accessURL[^>]*>([^<]+)<\/[^:]+:accessURL>/i,
  ]

  for (const pattern of urlPatterns) {
    const match = capabilityXml.match(pattern)
    if (match) {
      // Take first URL if space-separated
      return match[1].trim().split(/\s+/)[0]
    }
  }
  return null
}

/**
 * Extract identifier from resource
 */
function extractIdentifier(xml) {
  const patterns = [
    /<identifier[^>]*>([^<]+)<\/identifier>/i,
    /<[^:]+:identifier[^>]*>([^<]+)<\/[^:]+:identifier>/i,
  ]

  for (const pattern of patterns) {
    const match = xml.match(pattern)
    if (match) return match[1].trim()
  }
  return null
}

/**
 * Parse nodes from registry response
 */
function parseNodes(xml) {
  const nodes = []

  // Split by Resource elements
  const resourcePattern = /<[^:]*:?Resource[^>]*>[\s\S]*?<\/[^:]*:?Resource>/gi
  const resources = xml.match(resourcePattern) || []

  for (const resource of resources) {
    const id = extractIdentifier(resource)
    const name = extractText(resource, 'title')
    const description = extractText(resource, 'description') || ''
    const url = extractAccessURL(resource, 'ivo://vamdc/std/VAMDC-TAP')

    if (id && name && url) {
      nodes.push({
        id,
        name,
        description: description.slice(0, 100), // Truncate long descriptions
        url,
      })
    }
  }

  return nodes
}

/**
 * Parse consumers from registry response (basic info, URL will be fetched from capabilities)
 */
function parseConsumers(xml) {
  const consumers = []

  const resourcePattern = /<[^:]*:?Resource[^>]*>[\s\S]*?<\/[^:]*:?Resource>/gi
  const resources = xml.match(resourcePattern) || []

  for (const resource of resources) {
    const id = extractIdentifier(resource)
    const name = extractText(resource, 'title')
    const description = extractText(resource, 'description') || ''
    const baseUrl = extractAccessURL(resource, 'ivo://vamdc/std/XSAMS-consumer')

    if (id && name && baseUrl) {
      consumers.push({
        id: id.split('/').pop(), // Use last part of IVO ID as short id
        name,
        description: description.slice(0, 100),
        baseUrl, // This is the capabilities URL base
        outputType: 'text/html',
        dataTypes: ['atoms', 'molecules', 'radiative', 'collisions'],
      })
    }
  }

  return consumers
}

/**
 * Fetch the service URL from a consumer's capabilities endpoint
 */
async function fetchServiceUrl(baseUrl) {
  // Normalize the base URL
  const capabilitiesUrl = baseUrl.endsWith('/')
    ? `${baseUrl}capabilities`
    : `${baseUrl}/capabilities`

  try {
    const response = await fetch(capabilitiesUrl, { timeout: 10000 })
    if (!response.ok) {
      if (DEBUG) console.log(`    Failed to fetch ${capabilitiesUrl}: ${response.status}`)
      return null
    }

    const xml = await response.text()

    if (DEBUG) {
      console.log(`    Capabilities from ${capabilitiesUrl}:`)
      console.log(`    ${xml.slice(0, 500)}...`)
    }

    // Look for service URL inside <interface xsi:type="vs:ParamHTTP">
    // Pattern: <interface xsi:type="vs:ParamHTTP">...<accessURL>URL</accessURL>...</interface>
    const interfacePattern = /<interface[^>]*xsi:type=["']vs:ParamHTTP["'][^>]*>([\s\S]*?)<\/interface>/i
    const interfaceMatch = xml.match(interfacePattern)

    let serviceUrl = null

    if (interfaceMatch) {
      const interfaceXml = interfaceMatch[1]
      // Extract accessURL from the interface block
      const urlPattern = /<accessURL[^>]*>([^<]+)<\/accessURL>/i
      const urlMatch = interfaceXml.match(urlPattern)
      if (urlMatch) {
        serviceUrl = urlMatch[1].trim()
      }
    }

    // Fallback: try any accessURL if interface pattern didn't match
    if (!serviceUrl) {
      const fallbackPattern = /<accessURL[^>]*>([^<]+)<\/accessURL>/i
      const fallbackMatch = xml.match(fallbackPattern)
      if (fallbackMatch) {
        serviceUrl = fallbackMatch[1].trim()
      }
    }

    // If we got a localhost URL, construct from base URL instead
    if (serviceUrl && (serviceUrl.includes('127.0.0.1') || serviceUrl.includes('localhost'))) {
      if (DEBUG) console.log(`    Got localhost URL: ${serviceUrl}, using base URL instead`)
      // Extract the path from the localhost URL and apply to base URL
      try {
        const localUrl = new URL(serviceUrl)
        const base = new URL(baseUrl)
        serviceUrl = `${base.origin}${localUrl.pathname}`
        if (DEBUG) console.log(`    Constructed URL: ${serviceUrl}`)
      } catch {
        // If URL parsing fails, just append /service to base
        serviceUrl = baseUrl.endsWith('/') ? `${baseUrl}service` : `${baseUrl}/service`
      }
    }

    if (serviceUrl) {
      if (DEBUG) console.log(`    Found service URL: ${serviceUrl}`)
    }

    return serviceUrl
  } catch (error) {
    if (DEBUG) console.log(`    Error fetching ${capabilitiesUrl}: ${error.message}`)
    return null
  }
}

/**
 * Fetch data from registry
 */
async function fetchFromRegistry(xquery) {
  const response = await fetch(REGISTRY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '""',
    },
    body: buildSoapRequest(xquery),
  })

  if (!response.ok) {
    throw new Error(`Registry request failed: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

/**
 * Main update function
 */
async function updateRegistry() {
  const dataDir = join(__dirname, '..', 'src', 'data')

  // Update nodes
  console.log('Fetching nodes from VAMDC registry...')

  try {
    const nodesXml = await fetchFromRegistry(NODES_XQUERY)

    if (DEBUG) {
      const debugPath = join(dataDir, '..', '..', 'debug-nodes-response.xml')
      writeFileSync(debugPath, nodesXml)
      console.log(`  Debug: Saved raw response to ${debugPath}`)
      console.log(`  Debug: Response length: ${nodesXml.length} chars`)
    }

    const nodes = parseNodes(nodesXml)

    if (nodes.length === 0) {
      console.warn('Warning: No nodes found in registry response')
      console.log('  Keeping existing nodes.json')
    } else {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      const nodesPath = join(dataDir, 'nodes.json')
      writeFileSync(nodesPath, JSON.stringify(nodes, null, 2) + '\n')
      console.log(`  Updated nodes.json with ${nodes.length} nodes`)
    }
  } catch (error) {
    console.error('  Error:', error.message)
    if (error.cause) console.error('  Cause:', error.cause.message)
    console.log('  Keeping existing nodes.json')
  }

  // Update consumers
  console.log('Fetching consumers from VAMDC registry...')

  try {
    const consumersXml = await fetchFromRegistry(CONSUMERS_XQUERY)

    if (DEBUG) {
      const debugPath = join(dataDir, '..', '..', 'debug-consumers-response.xml')
      writeFileSync(debugPath, consumersXml)
      console.log(`  Debug: Saved raw response to ${debugPath}`)
    }

    const rawConsumers = parseConsumers(consumersXml)

    if (rawConsumers.length === 0) {
      console.warn('Warning: No consumers found in registry response')
      console.log('  Keeping existing consumers.json')
    } else {
      console.log(`  Found ${rawConsumers.length} consumers, fetching service URLs...`)

      // Fetch service URL from capabilities for each consumer
      const consumers = []
      for (const consumer of rawConsumers) {
        console.log(`  Checking ${consumer.name}...`)
        const serviceUrl = await fetchServiceUrl(consumer.baseUrl)

        if (serviceUrl) {
          consumers.push({
            id: consumer.id,
            name: consumer.name,
            description: consumer.description,
            url: serviceUrl,
            outputType: consumer.outputType,
            dataTypes: consumer.dataTypes,
          })
        } else {
          console.log(`    Skipping (no service URL found)`)
        }
      }

      if (consumers.length > 0) {
        consumers.sort((a, b) => a.name.localeCompare(b.name))
        const consumersPath = join(dataDir, 'consumers.json')
        writeFileSync(consumersPath, JSON.stringify(consumers, null, 2) + '\n')
        console.log(`  Updated consumers.json with ${consumers.length} consumers`)
      } else {
        console.log('  No consumers with valid service URLs found')
        console.log('  Keeping existing consumers.json')
      }
    }
  } catch (error) {
    console.error('  Error:', error.message)
    if (error.cause) console.error('  Cause:', error.cause.message)
    console.log('  Keeping existing consumers.json')
  }

  console.log('Done!')
}

// Run if called directly
updateRegistry().catch(error => {
  console.error('Update failed:', error)
  process.exit(1)
})
