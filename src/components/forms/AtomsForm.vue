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

// Local computed properties that sync with store
const symbol = computed({
  get: () => props.fields.symbol || '',
  set: (value) => queryStore.updateFormField(props.formId, 'symbol', value),
})

const ionChargeMin = computed({
  get: () => props.fields.ionChargeMin ?? '',
  set: (value) => queryStore.updateFormField(props.formId, 'ionChargeMin', value === '' ? null : Number(value)),
})

const ionChargeMax = computed({
  get: () => props.fields.ionChargeMax ?? '',
  set: (value) => queryStore.updateFormField(props.formId, 'ionChargeMax', value === '' ? null : Number(value)),
})

const massNumber = computed({
  get: () => props.fields.massNumber ?? '',
  set: (value) => queryStore.updateFormField(props.formId, 'massNumber', value === '' ? null : Number(value)),
})

// Find matching elements for display
const matchedElement = computed(() => {
  if (!symbol.value) return null
  return elements.find(el => el.symbol.toLowerCase() === symbol.value.toLowerCase())
})
</script>

<template>
  <div class="atoms-form">
    <div class="form-header">
      <h4>Atoms Search</h4>
      <button class="secondary small" @click="emit('remove')">Remove</button>
    </div>

    <div class="form-group">
      <label for="symbol">Element Symbol</label>
      <input
        id="symbol"
        v-model="symbol"
        type="text"
        list="elements-list"
        placeholder="e.g., Fe, H, O"
      />
      <datalist id="elements-list">
        <option v-for="el in elements" :key="el.symbol" :value="el.symbol">
          {{ el.name }} ({{ el.number }})
        </option>
      </datalist>
      <p v-if="matchedElement" class="hint">
        {{ matchedElement.name }} (Z = {{ matchedElement.number }})
      </p>
    </div>

    <div class="form-group">
      <label>Ion Charge</label>
      <div class="range-inputs">
        <input
          v-model="ionChargeMin"
          type="number"
          min="0"
          placeholder="min"
        />
        <span>to</span>
        <input
          v-model="ionChargeMax"
          type="number"
          min="0"
          placeholder="max"
        />
      </div>
      <p class="hint">0 = neutral, 1 = singly ionized, etc.</p>
    </div>

    <div class="form-group">
      <label for="mass">Mass Number (optional)</label>
      <input
        id="mass"
        v-model="massNumber"
        type="number"
        min="1"
        placeholder="e.g., 56 for Fe-56"
      />
      <p class="hint">For specific isotopes</p>
    </div>
  </div>
</template>

<style scoped>
.atoms-form {
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
