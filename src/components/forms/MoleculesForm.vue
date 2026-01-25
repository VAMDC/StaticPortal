<script setup>
import { computed } from 'vue'
import { useQueryStore } from '../../stores/query.js'

const props = defineProps({
  formId: {
    type: Number,
    required: true,
  },
  fields: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['remove'])

const queryStore = useQueryStore()

// Local computed properties that sync with store
const stoichiometricFormula = computed({
  get: () => props.fields.stoichiometricFormula || '',
  set: (value) => queryStore.updateFormField(props.formId, 'stoichiometricFormula', value),
})

const chemicalName = computed({
  get: () => props.fields.chemicalName || '',
  set: (value) => queryStore.updateFormField(props.formId, 'chemicalName', value),
})

const inchikey = computed({
  get: () => props.fields.inchikey || '',
  set: (value) => queryStore.updateFormField(props.formId, 'inchikey', value),
})
</script>

<template>
  <div class="molecules-form">
    <div class="form-header">
      <h4>Molecules Search</h4>
      <button class="secondary small" @click="emit('remove')">Remove</button>
    </div>

    <div class="form-group">
      <label for="formula">Stoichiometric Formula</label>
      <input
        id="formula"
        v-model="stoichiometricFormula"
        type="text"
        placeholder="e.g., H2O, CO2, CH4"
      />
      <p class="hint">Chemical formula with element counts</p>
    </div>

    <div class="form-group">
      <label for="name">Chemical Name</label>
      <input
        id="name"
        v-model="chemicalName"
        type="text"
        placeholder="e.g., water, methane, ethanol"
      />
      <p class="hint">Common or IUPAC name</p>
    </div>

    <div class="form-group">
      <label for="inchikey">InChIKey (optional)</label>
      <input
        id="inchikey"
        v-model="inchikey"
        type="text"
        placeholder="e.g., XLYOFNOQVPJJNP-UHFFFAOYSA-N"
      />
      <p class="hint">Standard chemical identifier (27 characters)</p>
    </div>
  </div>
</template>

<style scoped>
.molecules-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.form-header h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-primary);
}

button.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
</style>
