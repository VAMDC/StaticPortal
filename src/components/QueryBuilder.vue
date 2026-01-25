<script setup>
import { useQueryStore } from '../stores/query.js'
import AtomsForm from './forms/AtomsForm.vue'

const queryStore = useQueryStore()

function addAtomsForm() {
  queryStore.addForm('atoms')
}

function removeForm(formId) {
  queryStore.removeForm(formId)
}

function runPreview() {
  queryStore.runPreview()
  queryStore.syncToURL()
}
</script>

<template>
  <div class="query-builder panel">
    <div class="panel-header">
      <span>Query Builder</span>
    </div>

    <div class="panel-body">
      <div class="form-type-buttons">
        <button class="secondary" @click="addAtomsForm">
          + Atoms
        </button>
        <!-- Future: Molecules, Radiative buttons -->
      </div>

      <div v-if="queryStore.forms.length === 0" class="empty-state">
        <p>Click a button above to add a search form.</p>
      </div>

      <div class="forms-container">
        <div
          v-for="form in queryStore.forms"
          :key="form.id"
          class="form-wrapper"
        >
          <AtomsForm
            v-if="form.type === 'atoms'"
            :form-id="form.id"
            :fields="form.fields"
            @remove="removeForm(form.id)"
          />
        </div>
      </div>

      <div v-if="queryStore.forms.length > 0" class="actions">
        <button
          class="primary"
          :disabled="!queryStore.hasValidQuery || queryStore.isPreviewLoading"
          @click="runPreview"
        >
          {{ queryStore.isPreviewLoading ? 'Checking...' : 'Preview Availability' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-light);
  background: var(--color-bg);
  border-radius: var(--radius);
}

.forms-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-wrapper {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem;
  background: var(--color-bg);
}

.actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}
</style>
