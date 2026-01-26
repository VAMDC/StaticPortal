<script setup>
import { ref, computed, watch } from 'vue'
import { useQueryStore } from '../stores/query.js'
import { parseXSAMS, formatFileSize } from '../composables/useXSAMS.js'
import consumers from '../data/consumers.json'

const queryStore = useQueryStore()

const MAX_SIZE = 50 * 1024 * 1024 // 50MB
const ROWS_PER_PAGE = 100

// State
const activeTab = ref('atoms')
const displayLimit = ref(ROWS_PER_PAGE)
const sizeWarningShown = ref(false)
const sizeWarningConfirmed = ref(false)

// Computed
const previewNodeId = computed(() => queryStore.previewNodeId)
const previewData = computed(() => queryStore.previewData)
const previewLoading = computed(() => queryStore.previewLoading)
const previewError = computed(() => queryStore.previewError)
const previewSize = computed(() => queryStore.previewSize)

const nodeName = computed(() => {
  const result = queryStore.previewResults.find(r => r.nodeId === previewNodeId.value)
  return result?.nodeName || 'Unknown'
})

const queryUrl = computed(() => {
  const result = queryStore.previewResults.find(r => r.nodeId === previewNodeId.value)
  return result?.queryUrl || ''
})

// Parse the XSAMS data
const parsedData = computed(() => {
  if (!previewData.value) return null
  try {
    return parseXSAMS(previewData.value)
  } catch (e) {
    console.error('Failed to parse XSAMS:', e)
    return null
  }
})

// Tab data with counts
const tabs = computed(() => {
  const data = parsedData.value
  return [
    { id: 'atoms', label: 'Atoms', count: data?.atoms?.length || 0 },
    { id: 'molecules', label: 'Molecules', count: data?.molecules?.length || 0 },
    { id: 'transitions', label: 'Transitions', count: data?.transitions?.length || 0 },
    { id: 'collisions', label: 'Collisions', count: data?.collisions?.length || 0 },
  ]
})

// Current tab data
const currentData = computed(() => {
  if (!parsedData.value) return []
  return parsedData.value[activeTab.value] || []
})

const displayedData = computed(() => {
  return currentData.value.slice(0, displayLimit.value)
})

const hasMoreData = computed(() => {
  return currentData.value.length > displayLimit.value
})

// Reset display limit when tab changes
watch(activeTab, () => {
  displayLimit.value = ROWS_PER_PAGE
})

// Reset state when preview node changes
watch(previewNodeId, () => {
  displayLimit.value = ROWS_PER_PAGE
  sizeWarningShown.value = false
  sizeWarningConfirmed.value = false
  // Auto-select first tab with data
  if (parsedData.value) {
    const firstWithData = tabs.value.find(t => t.count > 0)
    if (firstWithData) activeTab.value = firstWithData.id
  }
})

// Auto-select first tab with data after parsing
watch(parsedData, (data) => {
  if (data) {
    const firstWithData = tabs.value.find(t => t.count > 0)
    if (firstWithData) activeTab.value = firstWithData.id
  }
})

// Handle size warning
const needsSizeWarning = computed(() => {
  return previewSize.value && previewSize.value > MAX_SIZE && !sizeWarningConfirmed.value
})

function confirmLargeLoad() {
  sizeWarningConfirmed.value = true
  queryStore.loadPreviewData()
}

function loadMore() {
  displayLimit.value += ROWS_PER_PAGE
}

function close() {
  queryStore.closePreview()
}

// Export to processor
const selectedConsumer = ref(null)
const formRef = ref(null)

const relevantConsumers = computed(() => {
  const queryFormTypes = new Set(queryStore.forms.map(f => f.type))
  if (queryFormTypes.size === 0) return consumers

  return consumers.filter(consumer => {
    return consumer.dataTypes.some(dt =>
      queryFormTypes.has(dt) ||
      (dt === 'radiative' && queryFormTypes.has('radiative'))
    )
  })
})

function exportToProcessor() {
  if (!selectedConsumer.value || !queryUrl.value) return

  const consumer = consumers.find(c => c.id === selectedConsumer.value)
  if (!consumer) return

  formRef.value.action = consumer.url
  formRef.value.submit()
}

// Format ion charge for display
function formatIonCharge(charge) {
  if (charge === 0) return 'neutral'
  if (charge > 0) return `+${charge}`
  return String(charge)
}
</script>

<template>
  <div v-if="previewNodeId" class="xsams-preview panel">
    <div class="panel-header">
      <span>{{ nodeName }} Preview</span>
      <button class="close-btn" @click="close" title="Close preview">&times;</button>
    </div>

    <div class="panel-body">
      <!-- Size Warning -->
      <div v-if="needsSizeWarning" class="size-warning">
        <p>
          <strong>Large file warning:</strong>
          This result is {{ formatFileSize(previewSize) }}.
          Loading may take a while and use significant memory.
        </p>
        <div class="warning-actions">
          <button class="secondary" @click="close">Cancel</button>
          <button class="primary" @click="confirmLargeLoad">Load Anyway</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="previewLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading XSAMS data...</p>
        <p v-if="previewSize" class="size-info">{{ formatFileSize(previewSize) }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="previewError" class="error">
        <p>{{ previewError }}</p>
        <button class="secondary" @click="close">Close</button>
      </div>

      <!-- Data Display -->
      <template v-else-if="parsedData">
        <!-- Tabs -->
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTab === tab.id }"
            :disabled="tab.count === 0"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span class="tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <!-- Empty tab message -->
        <div v-if="currentData.length === 0" class="empty-tab">
          No {{ activeTab }} data in this result.
        </div>

        <!-- Atoms table -->
        <div v-else-if="activeTab === 'atoms'" class="table-container">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Z</th>
                <th>Mass</th>
                <th>Ion</th>
                <th>States</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(atom, i) in displayedData" :key="i">
                <td class="symbol">{{ atom.symbol }}</td>
                <td>{{ atom.atomicNumber || '-' }}</td>
                <td>{{ atom.massNumber || '-' }}</td>
                <td>{{ formatIonCharge(atom.ionCharge) }}</td>
                <td>{{ atom.stateCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Molecules table -->
        <div v-else-if="activeTab === 'molecules'" class="table-container">
          <table>
            <thead>
              <tr>
                <th>Formula</th>
                <th>Name</th>
                <th>States</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(mol, i) in displayedData" :key="i">
                <td class="formula">{{ mol.ordinaryStructuralFormula }}</td>
                <td>{{ mol.chemicalName || '-' }}</td>
                <td>{{ mol.stateCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Transitions table -->
        <div v-else-if="activeTab === 'transitions'" class="table-container">
          <table>
            <thead>
              <tr>
                <th>Wavelength</th>
                <th>Wavenumber</th>
                <th>A (s<sup>-1</sup>)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(trans, i) in displayedData" :key="i">
                <td>
                  <template v-if="trans.wavelength">
                    {{ trans.wavelength.toExponential(4) }} {{ trans.wavelengthUnit }}
                  </template>
                  <template v-else>-</template>
                </td>
                <td>
                  <template v-if="trans.wavenumber">
                    {{ trans.wavenumber.toFixed(4) }} {{ trans.wavenumberUnit }}
                  </template>
                  <template v-else>-</template>
                </td>
                <td>
                  <template v-if="trans.probability">
                    {{ trans.probability.toExponential(3) }}
                  </template>
                  <template v-else>-</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Collisions table -->
        <div v-else-if="activeTab === 'collisions'" class="table-container">
          <table>
            <thead>
              <tr>
                <th>Reactants</th>
                <th>Products</th>
                <th>Data Sets</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(coll, i) in displayedData" :key="i">
                <td>{{ coll.reactants.join(' + ') || '-' }}</td>
                <td>{{ coll.products.join(' + ') || '-' }}</td>
                <td>{{ coll.dataSetCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Load more button -->
        <button v-if="hasMoreData" class="load-more" @click="loadMore">
          Load more ({{ currentData.length - displayLimit }} remaining)
        </button>

        <!-- Actions -->
        <div class="preview-actions">
          <a :href="queryUrl" class="download-btn" download>
            Download XSAMS
          </a>

          <div class="export-group">
            <select v-model="selectedConsumer" class="export-select">
              <option :value="null" disabled>Export to...</option>
              <option v-for="consumer in relevantConsumers" :key="consumer.id" :value="consumer.id">
                {{ consumer.name }}
              </option>
            </select>
            <button
              class="export-btn"
              :disabled="!selectedConsumer"
              @click="exportToProcessor"
            >
              Go
            </button>
          </div>
        </div>

        <!-- Hidden form for POST submission -->
        <form
          ref="formRef"
          method="POST"
          target="_blank"
          style="display: none"
        >
          <input type="hidden" name="url" :value="queryUrl" />
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.xsams-preview {
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.25rem;
  color: var(--color-text-light);
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-text);
}

.panel-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.size-warning {
  padding: 1rem;
  background: var(--color-warning-light, #fff3cd);
  border-radius: var(--radius);
}

.size-warning p {
  margin: 0 0 1rem 0;
}

.warning-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-light);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.size-info {
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.error {
  padding: 1rem;
  color: var(--color-error);
  text-align: center;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.tab {
  padding: 0.25rem 0.5rem;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius) var(--radius) 0 0;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.tab:hover:not(:disabled) {
  background: var(--color-bg);
}

.tab.active {
  background: var(--color-bg);
  border-color: var(--color-border);
  border-bottom-color: var(--color-bg);
  color: var(--color-text);
}

.tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-count {
  font-size: 0.65rem;
  background: var(--color-border);
  padding: 0.1rem 0.3rem;
  border-radius: 8px;
  margin-left: 0.25rem;
}

.tab.active .tab-count {
  background: var(--color-primary);
  color: white;
}

.empty-tab {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-light);
  font-size: 0.875rem;
}

.table-container {
  flex: 1;
  overflow: auto;
  max-height: 250px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

th, td {
  padding: 0.25rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th {
  background: var(--color-bg);
  font-weight: 500;
  position: sticky;
  top: 0;
}

td.symbol, td.formula {
  font-weight: 500;
}

.load-more {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.75rem;
}

.load-more:hover {
  background: var(--color-border);
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  align-items: center;
}

.download-btn {
  padding: 0.375rem 0.75rem;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius);
  text-decoration: none;
  font-size: 0.75rem;
}

.download-btn:hover {
  background: var(--color-primary-dark, #0056b3);
}

.export-group {
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
}

.export-select {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  min-width: 120px;
}

.export-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
