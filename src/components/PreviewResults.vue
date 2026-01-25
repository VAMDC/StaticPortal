<script setup>
import { computed } from 'vue'
import { useQueryStore } from '../stores/query.js'

const queryStore = useQueryStore()

const results = computed(() => queryStore.previewResults)
const isLoading = computed(() => queryStore.isPreviewLoading)

const availableCount = computed(() =>
  results.value.filter(r => r.available).length
)

function formatCount(result) {
  const counts = []
  if (result.atomCount) counts.push(`${result.atomCount} atoms`)
  if (result.moleculeCount) counts.push(`${result.moleculeCount} molecules`)
  if (result.stateCount) counts.push(`${result.stateCount} states`)
  if (result.processCount) counts.push(`${result.processCount} transitions`)
  return counts.length > 0 ? counts.join(', ') : 'Data available'
}
</script>

<template>
  <div class="preview-results panel">
    <div class="panel-header">
      <span>Query Results</span>
      <span v-if="results.length > 0" class="count">
        {{ availableCount }}/{{ results.length }} nodes
      </span>
    </div>

    <div class="panel-body">
      <div v-if="isLoading && results.length === 0" class="loading">
        Checking nodes...
      </div>

      <div v-else-if="!isLoading && results.length === 0" class="empty">
        <p>Click "Preview Availability" to check which databases have matching data.</p>
      </div>

      <ul v-else class="results-list">
        <li
          v-for="result in results"
          :key="result.nodeId"
          class="result-item"
          :class="{ available: result.available, unavailable: !result.available }"
        >
          <span
            class="node-status"
            :class="{ available: result.available, unavailable: !result.available }"
          ></span>

          <div class="result-info">
            <span class="node-name">{{ result.nodeName }}</span>

            <span v-if="result.available" class="result-counts">
              {{ formatCount(result) }}
            </span>
            <span v-else-if="result.error" class="result-error">
              {{ result.error }}
            </span>
            <span v-else class="result-empty">
              No matching data
            </span>
          </div>

          <a
            v-if="result.available"
            :href="result.queryUrl"
            target="_blank"
            class="download-link"
            title="Download XSAMS data"
          >
            Download
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.count {
  font-size: 0.75rem;
  background: var(--color-bg);
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
}

.loading,
.empty {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-light);
}

.results-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
}

.result-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.unavailable {
  opacity: 0.6;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.node-name {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
}

.result-counts {
  display: block;
  font-size: 0.75rem;
  color: var(--color-success);
}

.result-error,
.result-empty {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.result-error {
  color: var(--color-error);
}

.download-link {
  font-size: 0.75rem;
  color: var(--color-primary);
  text-decoration: none;
  white-space: nowrap;
}

.download-link:hover {
  text-decoration: underline;
}
</style>
