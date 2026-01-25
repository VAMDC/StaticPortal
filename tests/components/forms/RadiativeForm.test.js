import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RadiativeForm from '../../../src/components/forms/RadiativeForm.vue'
import { useQueryStore } from '../../../src/stores/query.js'

describe('RadiativeForm', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountForm(fields = {}) {
    const store = useQueryStore()
    store.addForm('radiative')
    const form = store.forms[0]

    Object.entries(fields).forEach(([key, value]) => {
      store.updateFormField(form.id, key, value)
    })

    return mount(RadiativeForm, {
      props: {
        formId: form.id,
        fields: store.forms[0].fields,
      },
      global: {
        plugins: [pinia],
      },
    })
  }

  it('renders with title', () => {
    const wrapper = mountForm()
    expect(wrapper.find('h4').text()).toBe('Radiative Transitions')
  })

  it('shows mode buttons for wavelength, frequency, wavenumber, energy', () => {
    const wrapper = mountForm()
    const buttons = wrapper.findAll('.mode-btn')

    expect(buttons.length).toBe(4)
    expect(buttons[0].text()).toBe('Wavelength')
    expect(buttons[1].text()).toBe('Frequency')
    expect(buttons[2].text()).toBe('Wavenumber')
    expect(buttons[3].text()).toBe('Energy')
  })

  it('starts with wavelength mode active', () => {
    const wrapper = mountForm()
    const activeBtn = wrapper.find('.mode-btn.active')

    expect(activeBtn.text()).toBe('Wavelength')
  })

  it('shows Angstrom unit option in wavelength mode', () => {
    const wrapper = mountForm()
    const select = wrapper.find('select')
    const options = select.findAll('option')

    expect(options.some(o => o.text().includes('Angstroms'))).toBe(true)
  })

  it('changes unit options when mode changes', async () => {
    const wrapper = mountForm()

    // Click frequency mode
    await wrapper.findAll('.mode-btn')[1].trigger('click')

    const options = wrapper.find('select').findAll('option')
    expect(options.some(o => o.text().includes('MHz'))).toBe(true)
    expect(options.some(o => o.text().includes('GHz'))).toBe(true)
  })

  it('updates store with wavelength in Angstroms', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()
    const inputs = wrapper.findAll('.range-inputs input')

    await inputs[0].setValue('5000')
    await inputs[1].setValue('7000')

    expect(store.forms[0].fields.wavelengthMin).toBeCloseTo(5000)
    expect(store.forms[0].fields.wavelengthMax).toBeCloseTo(7000)
  })

  it('converts frequency to wavelength in store', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    // Switch to frequency mode
    await wrapper.findAll('.mode-btn')[1].trigger('click')
    // Select GHz
    await wrapper.find('select').setValue('GHz')

    const inputs = wrapper.findAll('.range-inputs input')
    await inputs[0].setValue('100')

    // 100 GHz = 2997924.58 mm wavelength = 29,979,245,800 Angstroms
    // c / f = (299792458 m/s) / (100e9 Hz) = 0.00299792458 m = 29979245.8 Angstroms
    const wavelength = store.forms[0].fields.wavelengthMin
    expect(wavelength).toBeGreaterThan(29000000)
    expect(wavelength).toBeLessThan(31000000)
  })

  it('shows conversion table when values are entered', async () => {
    const wrapper = mountForm()
    const inputs = wrapper.findAll('.range-inputs input')

    // No table initially
    expect(wrapper.find('.conversions').exists()).toBe(false)

    await inputs[0].setValue('5000')

    // Table should appear
    expect(wrapper.find('.conversions').exists()).toBe(true)
    expect(wrapper.find('.conversion-table').exists()).toBe(true)
  })

  it('emits remove event when remove button clicked', async () => {
    const wrapper = mountForm()

    await wrapper.find('button.secondary').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
  })

  it('restores wavelength values from props', () => {
    const wrapper = mountForm({ wavelengthMin: 4000, wavelengthMax: 7000 })
    const inputs = wrapper.findAll('.range-inputs input')

    expect(inputs[0].element.value).toBe('4000')
    expect(inputs[1].element.value).toBe('7000')
  })

  it('clears store fields when mode changes', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()
    const inputs = wrapper.findAll('.range-inputs input')

    // Enter wavelength values
    await inputs[0].setValue('5000')
    expect(store.forms[0].fields.wavelengthMin).toBe(5000)

    // Switch to frequency mode
    await wrapper.findAll('.mode-btn')[1].trigger('click')

    // Values should be cleared
    expect(store.forms[0].fields.wavelengthMin).toBeNull()
  })
})
