<script setup>
import { ref, computed } from 'vue'
import { useQueryStore } from '../stores/query.js'
import consumers from '../data/consumers.json'

const queryStore = useQueryStore()

// Selected node (synced with store) and consumer
const selectedNode = computed({
  get: () => queryStore.selectedNodeId,
  set: (value) => queryStore.selectNode(value)
})
const selectedConsumer = ref(null)

// Get nodes with available data
const availableNodes = computed(() =>
  queryStore.previewResults.filter(r => r.available)
)

// Get form types from current query (to filter relevant consumers)
const queryFormTypes = computed(() => {
  const types = new Set()
  for (const form of queryStore.forms) {
    types.add(form.type)
  }
  return types
})

// Filter consumers to those relevant to the current query
const relevantConsumers = computed(() => {
  if (queryFormTypes.value.size === 0) return consumers

  return consumers.filter(consumer => {
    // If consumer supports any of the query form types, include it
    return consumer.dataTypes.some(dt =>
      queryFormTypes.value.has(dt) ||
      // Also include if query has radiative and consumer supports it
      (dt === 'radiative' && queryFormTypes.value.has('radiative'))
    )
  })
})

// Form ref for submission
const formRef = ref(null)

// Handle consumer submission
function processData() {
  if (!selectedNode.value || !selectedConsumer.value) return

  // Find the node's query URL
  const node = availableNodes.value.find(n => n.nodeId === selectedNode.value)
  if (!node) return

  // Find consumer
  const consumer = consumers.find(c => c.id === selectedConsumer.value)
  if (!consumer) return

  // Submit the form to open in new tab
  // The form will POST to the consumer service with the XSAMS URL
  formRef.value.action = consumer.url
  formRef.value.submit()
}
</script>

<template>
  <div class="consumer-select panel">
    <div class="panel-header">
      <span>Process Data</span>
    </div>

    <div class="panel-body">
      <div v-if="availableNodes.length === 0" class="empty">
        <p>No data available to process. Run a query preview first.</p>
      </div>

      <template v-else>
        <div class="form-group">
          <label for="node-select">Select Node</label>
          <select id="node-select" v-model="selectedNode">
            <option :value="null" disabled>Choose a database...</option>
            <option v-for="node in availableNodes" :key="node.nodeId" :value="node.nodeId">
              {{ node.nodeName }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="consumer-select">Select Processor</label>
          <select id="consumer-select" v-model="selectedConsumer">
            <option :value="null" disabled>Choose a processor...</option>
            <option v-for="consumer in relevantConsumers" :key="consumer.id" :value="consumer.id">
              {{ consumer.name }}
            </option>
          </select>
          <p v-if="selectedConsumer" class="hint">
            {{ consumers.find(c => c.id === selectedConsumer)?.description }}
          </p>
        </div>

        <button
          class="primary"
          :disabled="!selectedNode || !selectedConsumer"
          @click="processData"
        >
          Process Data
        </button>

        <!-- Hidden form for POST submission -->
        <form
          ref="formRef"
          method="POST"
          target="_blank"
          style="display: none"
        >
          <input
            type="hidden"
            name="url"
            :value="availableNodes.find(n => n.nodeId === selectedNode)?.queryUrl || ''"
          />
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.empty {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-light);
}

.empty p {
  margin: 0;
  font-size: 0.875rem;
}

button.primary {
  width: 100%;
  margin-top: 0.5rem;
}
</style>
