<script setup>
import { computed, ref, watch } from 'vue'
import { useQueryStore } from '../../stores/query.js'
import { convertRadiative, formatValue } from '../../composables/useUnits.js'

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

// Input mode: which physical quantity the user is entering
const inputMode = ref('wavelength')
const inputUnit = ref('angstrom')

// Available units for each mode
const unitOptions = {
  wavelength: [
    { value: 'angstrom', label: 'Å (Angstroms)' },
    { value: 'nm', label: 'nm (nanometers)' },
    { value: 'um', label: 'µm (micrometers)' },
  ],
  frequency: [
    { value: 'MHz', label: 'MHz' },
    { value: 'GHz', label: 'GHz' },
    { value: 'THz', label: 'THz' },
  ],
  wavenumber: [
    { value: 'cm-1', label: 'cm⁻¹ (kayser)' },
  ],
  energy: [
    { value: 'eV', label: 'eV' },
  ],
}

// Local input values (in the selected unit)
const minValue = ref('')
const maxValue = ref('')

// Watch for mode changes to update default unit
watch(inputMode, (newMode) => {
  inputUnit.value = unitOptions[newMode][0].value
  // Clear values when mode changes
  minValue.value = ''
  maxValue.value = ''
  // Clear store fields
  clearStoreFields()
})

// Computed conversions for display
const minConversions = computed(() => {
  if (!minValue.value) return null
  return convertRadiative(parseFloat(minValue.value), inputMode.value, inputUnit.value)
})

const maxConversions = computed(() => {
  if (!maxValue.value) return null
  return convertRadiative(parseFloat(maxValue.value), inputMode.value, inputUnit.value)
})

// Clear all radiative fields in store
function clearStoreFields() {
  const fields = ['wavelengthMin', 'wavelengthMax', 'frequencyMin', 'frequencyMax',
                  'wavenumberMin', 'wavenumberMax', 'energyMin', 'energyMax']
  for (const field of fields) {
    queryStore.updateFormField(props.formId, field, null)
  }
}

// Update store with converted values (in VAMDC standard units)
function updateStore() {
  // Clear all fields first
  clearStoreFields()

  // Set values based on input mode (convert to VAMDC standard units)
  if (minValue.value) {
    const conv = convertRadiative(parseFloat(minValue.value), inputMode.value, inputUnit.value)
    if (conv) {
      // Store wavelength in Angstroms (VAMDC standard)
      queryStore.updateFormField(props.formId, 'wavelengthMin', conv.wavelength.angstrom)
    }
  }

  if (maxValue.value) {
    const conv = convertRadiative(parseFloat(maxValue.value), inputMode.value, inputUnit.value)
    if (conv) {
      // Store wavelength in Angstroms (VAMDC standard)
      queryStore.updateFormField(props.formId, 'wavelengthMax', conv.wavelength.angstrom)
    }
  }
}

// Watch for input changes and update store
watch([minValue, maxValue, inputUnit], () => {
  updateStore()
})

// Load from props.fields on mount (for URL state restoration)
watch(() => props.fields, (fields) => {
  if (fields.wavelengthMin && !minValue.value) {
    // Restore from stored wavelength (Angstroms)
    inputMode.value = 'wavelength'
    inputUnit.value = 'angstrom'
    minValue.value = fields.wavelengthMin
  }
  if (fields.wavelengthMax && !maxValue.value) {
    maxValue.value = fields.wavelengthMax
  }
}, { immediate: true })

// Format a value for display in the conversion hint
function formatConversion(conversions, path) {
  if (!conversions) return '-'
  const parts = path.split('.')
  let value = conversions
  for (const part of parts) {
    value = value?.[part]
  }
  if (value === undefined || value === null) return '-'
  return formatValue(value)
}
</script>

<template>
  <div class="radiative-form">
    <div class="form-header">
      <h4>Radiative Transitions</h4>
      <button class="secondary small" @click="emit('remove')">Remove</button>
    </div>

    <div class="form-group">
      <label>Input Mode</label>
      <div class="mode-buttons">
        <button
          v-for="mode in ['wavelength', 'frequency', 'wavenumber', 'energy']"
          :key="mode"
          :class="['mode-btn', { active: inputMode === mode }]"
          @click="inputMode = mode"
        >
          {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
        </button>
      </div>
    </div>

    <div class="form-group">
      <label>Unit</label>
      <select v-model="inputUnit">
        <option v-for="opt in unitOptions[inputMode]" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div class="form-group">
      <label>Range</label>
      <div class="range-inputs">
        <input
          v-model="minValue"
          type="number"
          step="any"
          placeholder="min"
        />
        <span>to</span>
        <input
          v-model="maxValue"
          type="number"
          step="any"
          placeholder="max"
        />
      </div>
    </div>

    <div v-if="minConversions || maxConversions" class="conversions">
      <h5>Equivalent Values</h5>
      <table class="conversion-table">
        <thead>
          <tr>
            <th>Quantity</th>
            <th>Min</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="inputMode !== 'wavelength'">
            <td>Wavelength</td>
            <td>{{ formatConversion(minConversions, 'wavelength.angstrom') }} Å</td>
            <td>{{ formatConversion(maxConversions, 'wavelength.angstrom') }} Å</td>
          </tr>
          <tr v-if="inputMode !== 'frequency'">
            <td>Frequency</td>
            <td>{{ formatConversion(minConversions, 'frequency.GHz') }} GHz</td>
            <td>{{ formatConversion(maxConversions, 'frequency.GHz') }} GHz</td>
          </tr>
          <tr v-if="inputMode !== 'wavenumber'">
            <td>Wavenumber</td>
            <td>{{ formatConversion(minConversions, 'wavenumber.cm-1') }} cm⁻¹</td>
            <td>{{ formatConversion(maxConversions, 'wavenumber.cm-1') }} cm⁻¹</td>
          </tr>
          <tr v-if="inputMode !== 'energy'">
            <td>Energy</td>
            <td>{{ formatConversion(minConversions, 'energy.eV') }} eV</td>
            <td>{{ formatConversion(maxConversions, 'energy.eV') }} eV</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="hint">
      VAMDC stores wavelength in Angstroms. Your input will be converted automatically.
    </p>
  </div>
</template>

<style scoped>
.radiative-form {
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

.mode-buttons {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.mode-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  background: var(--color-bg-hover);
}

.mode-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.conversions {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.conversions h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.conversion-table {
  width: 100%;
  font-size: 0.8rem;
  border-collapse: collapse;
}

.conversion-table th,
.conversion-table td {
  padding: 0.25rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.conversion-table th {
  font-weight: 600;
  color: var(--color-text-light);
}

.conversion-table tr:last-child td {
  border-bottom: none;
}
</style>
