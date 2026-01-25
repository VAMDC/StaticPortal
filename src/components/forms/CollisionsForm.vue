<script setup>
import { computed } from 'vue'
import { useQueryStore } from '../../stores/query.js'
import elements from '../../data/elements.json'

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

// Collision process types
const processTypes = [
  { value: '', label: 'Any process' },
  { value: 'elas', label: 'Elastic scattering' },
  { value: 'inel', label: 'Inelastic scattering' },
  { value: 'exci', label: 'Excitation' },
  { value: 'ionz', label: 'Ionization' },
  { value: 'reco', label: 'Recombination' },
  { value: 'atta', label: 'Attachment' },
  { value: 'diss', label: 'Dissociation' },
  { value: 'char', label: 'Charge transfer' },
]

// Local computed properties that sync with store
const targetSymbol = computed({
  get: () => props.fields.targetSymbol || '',
  set: (value) => queryStore.updateFormField(props.formId, 'targetSymbol', value),
})

const targetFormula = computed({
  get: () => props.fields.targetFormula || '',
  set: (value) => queryStore.updateFormField(props.formId, 'targetFormula', value),
})

const colliderSymbol = computed({
  get: () => props.fields.colliderSymbol || '',
  set: (value) => queryStore.updateFormField(props.formId, 'colliderSymbol', value),
})

const colliderFormula = computed({
  get: () => props.fields.colliderFormula || '',
  set: (value) => queryStore.updateFormField(props.formId, 'colliderFormula', value),
})

const processType = computed({
  get: () => props.fields.processType || '',
  set: (value) => queryStore.updateFormField(props.formId, 'processType', value),
})

const temperatureMin = computed({
  get: () => props.fields.temperatureMin ?? '',
  set: (value) => queryStore.updateFormField(props.formId, 'temperatureMin', value === '' ? null : Number(value)),
})

const temperatureMax = computed({
  get: () => props.fields.temperatureMax ?? '',
  set: (value) => queryStore.updateFormField(props.formId, 'temperatureMax', value === '' ? null : Number(value)),
})

// Find matching element for display
const matchedTarget = computed(() => {
  if (!targetSymbol.value) return null
  return elements.find(el => el.symbol.toLowerCase() === targetSymbol.value.toLowerCase())
})

const matchedCollider = computed(() => {
  if (!colliderSymbol.value) return null
  return elements.find(el => el.symbol.toLowerCase() === colliderSymbol.value.toLowerCase())
})
</script>

<template>
  <div class="collisions-form">
    <div class="form-header">
      <h4>Collisions Search</h4>
      <button class="secondary small" @click="emit('remove')">Remove</button>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="target-symbol">Target Atom</label>
        <input
          id="target-symbol"
          v-model="targetSymbol"
          type="text"
          list="target-elements"
          placeholder="e.g., H, He, O"
        />
        <datalist id="target-elements">
          <option v-for="el in elements" :key="'t-'+el.symbol" :value="el.symbol">
            {{ el.name }}
          </option>
        </datalist>
        <p v-if="matchedTarget" class="hint">{{ matchedTarget.name }}</p>
      </div>

      <div class="form-group">
        <label for="target-formula">or Target Molecule</label>
        <input
          id="target-formula"
          v-model="targetFormula"
          type="text"
          placeholder="e.g., H2O, CO2"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="collider-symbol">Collider Atom</label>
        <input
          id="collider-symbol"
          v-model="colliderSymbol"
          type="text"
          list="collider-elements"
          placeholder="e.g., e, H, He"
        />
        <datalist id="collider-elements">
          <option value="e">electron</option>
          <option v-for="el in elements" :key="'c-'+el.symbol" :value="el.symbol">
            {{ el.name }}
          </option>
        </datalist>
        <p v-if="matchedCollider" class="hint">{{ matchedCollider.name }}</p>
        <p v-else-if="colliderSymbol === 'e'" class="hint">electron</p>
      </div>

      <div class="form-group">
        <label for="collider-formula">or Collider Molecule</label>
        <input
          id="collider-formula"
          v-model="colliderFormula"
          type="text"
          placeholder="e.g., H2, N2"
        />
      </div>
    </div>

    <div class="form-group">
      <label for="process">Process Type</label>
      <select id="process" v-model="processType">
        <option v-for="pt in processTypes" :key="pt.value" :value="pt.value">
          {{ pt.label }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label>Temperature Range (K)</label>
      <div class="range-inputs">
        <input
          v-model="temperatureMin"
          type="number"
          min="0"
          step="any"
          placeholder="min"
        />
        <span>to</span>
        <input
          v-model="temperatureMax"
          type="number"
          min="0"
          step="any"
          placeholder="max"
        />
      </div>
      <p class="hint">Temperature range for rate coefficients</p>
    </div>
  </div>
</template>

<style scoped>
.collisions-form {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 500px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
