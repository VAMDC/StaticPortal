<script setup>
import { ref, computed, watch } from 'vue'
import { useQueryStore } from '../stores/query.js'

const queryStore = useQueryStore()

const isEditing = ref(false)
const editedQuery = ref('')
const validationError = ref('')

const generatedQuery = computed(() => queryStore.vss2Query)
const isLoading = computed(() => queryStore.isPreviewLoading)

// Sync edited query when generated query changes (and not editing)
watch(generatedQuery, (newQuery) => {
  if (!isEditing.value) {
    editedQuery.value = newQuery
  }
})

function startEditing() {
  editedQuery.value = generatedQuery.value
  isEditing.value = true
  validationError.value = ''
}

function cancelEditing() {
  isEditing.value = false
  editedQuery.value = generatedQuery.value
  validationError.value = ''
}

function validateQuery(query) {
  if (!query || !query.trim()) {
    return 'Query cannot be empty'
  }

  const trimmed = query.trim()

  // Must start with SELECT
  if (!trimmed.toUpperCase().startsWith('SELECT')) {
    return 'Query must start with SELECT'
  }

  // Must contain WHERE
  if (!trimmed.toUpperCase().includes('WHERE')) {
    return 'Query must contain a WHERE clause'
  }

  // Check for balanced quotes
  const singleQuotes = (trimmed.match(/'/g) || []).length
  if (singleQuotes % 2 !== 0) {
    return 'Unbalanced quotes in query'
  }

  return null
}

function runPreview() {
  const queryToRun = isEditing.value ? editedQuery.value : generatedQuery.value

  const error = validateQuery(queryToRun)
  if (error) {
    validationError.value = error
    return
  }

  validationError.value = ''

  if (isEditing.value && editedQuery.value !== generatedQuery.value) {
    queryStore.runPreviewWithQuery(editedQuery.value)
  } else {
    queryStore.runPreview()
  }
  queryStore.syncToURL()
}

function stopPreview() {
  queryStore.stopPreview()
}

const displayQuery = computed(() => {
  return isEditing.value ? editedQuery.value : generatedQuery.value
})

const hasQuery = computed(() => {
  return displayQuery.value && displayQuery.value.trim().length > 0
})
</script>

<template>
  <div class="query-panel panel">
    <div class="panel-header">
      <span>VSS2 Query</span>
      <button
        v-if="isEditing"
        class="cancel-btn"
        @click="cancelEditing"
        title="Cancel editing"
      >
        Cancel
      </button>
    </div>

    <div class="panel-body">
      <div v-if="!generatedQuery && !isEditing" class="empty-state">
        Use the Query Builder to create a query, or click here to write one directly.
        <button class="link-btn" @click="startEditing">Edit manually</button>
      </div>

      <template v-else>
        <textarea
          v-if="isEditing"
          v-model="editedQuery"
          class="query-input"
          rows="3"
          placeholder="SELECT * WHERE ..."
          @keydown.escape="cancelEditing"
        ></textarea>
        <code
          v-else
          class="query-code"
          @click="startEditing"
          title="Click to edit"
        >{{ generatedQuery }}</code>

        <p v-if="validationError" class="error-message">{{ validationError }}</p>

        <div class="actions">
          <button
            v-if="!isLoading"
            class="primary"
            :disabled="!hasQuery"
            @click="runPreview"
          >
            Preview Availability
          </button>
          <button
            v-else
            class="secondary"
            @click="stopPreview"
          >
            Stop ({{ queryStore.pendingNodeCount }} pending)
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  color: var(--color-text-light);
  font-size: 0.875rem;
  padding: 0.5rem;
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
}

.query-code {
  display: block;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  background: var(--color-bg);
  padding: 0.75rem;
  border-radius: var(--radius);
  word-break: break-all;
  cursor: pointer;
  border: 1px solid transparent;
}

.query-code:hover {
  border-color: var(--color-primary-light);
}

.query-input {
  width: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  padding: 0.75rem;
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius);
  background: var(--color-bg);
  resize: vertical;
  min-height: 60px;
}

.query-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
}

.error-message {
  color: var(--color-error);
  font-size: 0.75rem;
  margin: 0.5rem 0 0;
}

.actions {
  margin-top: 0.75rem;
}

.cancel-btn {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
}

.cancel-btn:hover {
  color: var(--color-text);
}
</style>
