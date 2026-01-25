<script setup>
import { useQueryStore } from '../stores/query.js'
import AtomsForm from './forms/AtomsForm.vue'
import MoleculesForm from './forms/MoleculesForm.vue'
import RadiativeForm from './forms/RadiativeForm.vue'
import CollisionsForm from './forms/CollisionsForm.vue'

const queryStore = useQueryStore()

function addForm(type) {
  queryStore.addForm(type)
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
        <button class="secondary" @click="addForm('atoms')">
          + Atoms
        </button>
        <button class="secondary" @click="addForm('molecules')">
          + Molecules
        </button>
        <button class="secondary" @click="addForm('radiative')">
          + Radiative
        </button>
        <button class="secondary" @click="addForm('collisions')">
          + Collisions
        </button>
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
          <MoleculesForm
            v-if="form.type === 'molecules'"
            :form-id="form.id"
            :fields="form.fields"
            @remove="removeForm(form.id)"
          />
          <RadiativeForm
            v-if="form.type === 'radiative'"
            :form-id="form.id"
            :fields="form.fields"
            @remove="removeForm(form.id)"
          />
          <CollisionsForm
            v-if="form.type === 'collisions'"
            :form-id="form.id"
            :fields="form.fields"
            @remove="removeForm(form.id)"
          />
        </div>
      </div>

      <div v-if="queryStore.forms.length > 0" class="actions">
        <button
          v-if="!queryStore.isPreviewLoading"
          class="primary"
          :disabled="!queryStore.hasValidQuery"
          @click="runPreview"
        >
          Preview Availability
        </button>
        <button
          v-else
          class="secondary"
          @click="queryStore.stopPreview()"
        >
          Stop ({{ queryStore.pendingNodeCount }} pending)
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
