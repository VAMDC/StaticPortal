import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AtomsForm from '../../../src/components/forms/AtomsForm.vue'
import { useQueryStore } from '../../../src/stores/query.js'

describe('AtomsForm', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountForm(fields = {}) {
    const store = useQueryStore()
    store.addForm('atoms')
    const form = store.forms[0]

    // Set initial fields
    Object.entries(fields).forEach(([key, value]) => {
      store.updateFormField(form.id, key, value)
    })

    return mount(AtomsForm, {
      props: {
        formId: form.id,
        fields: store.forms[0].fields,
      },
      global: {
        plugins: [pinia],
      },
    })
  }

  it('renders with empty fields', () => {
    const wrapper = mountForm()
    expect(wrapper.find('h4').text()).toBe('Atoms Search')
    expect(wrapper.find('#symbol').element.value).toBe('')
  })

  it('displays element symbol from props', () => {
    const wrapper = mountForm({ symbol: 'Fe' })
    expect(wrapper.find('#symbol').element.value).toBe('Fe')
  })

  it('shows element name when symbol is recognized', async () => {
    const wrapper = mountForm({ symbol: 'Fe' })
    expect(wrapper.find('.hint').text()).toContain('Iron')
    expect(wrapper.find('.hint').text()).toContain('Z = 26')
  })

  it('updates store when symbol changes', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#symbol').setValue('H')

    expect(store.forms[0].fields.symbol).toBe('H')
  })

  it('displays ion charge range inputs', () => {
    const wrapper = mountForm({ ionChargeMin: 1, ionChargeMax: 3 })
    const inputs = wrapper.findAll('.range-inputs input')

    expect(inputs[0].element.value).toBe('1')
    expect(inputs[1].element.value).toBe('3')
  })

  it('updates store when ion charge min changes', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()
    const inputs = wrapper.findAll('.range-inputs input')

    await inputs[0].setValue('2')

    expect(store.forms[0].fields.ionChargeMin).toBe(2)
  })

  it('updates store when ion charge max changes', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()
    const inputs = wrapper.findAll('.range-inputs input')

    await inputs[1].setValue('5')

    expect(store.forms[0].fields.ionChargeMax).toBe(5)
  })

  it('displays mass number input', () => {
    const wrapper = mountForm({ massNumber: 56 })
    expect(wrapper.find('#mass').element.value).toBe('56')
  })

  it('updates store when mass number changes', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#mass').setValue('12')

    expect(store.forms[0].fields.massNumber).toBe(12)
  })

  it('emits remove event when remove button clicked', async () => {
    const wrapper = mountForm()

    await wrapper.find('button.secondary').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove').length).toBe(1)
  })

  it('clears numeric fields when set to empty', async () => {
    const wrapper = mountForm({ ionChargeMin: 1, massNumber: 56 })
    const store = useQueryStore()

    const inputs = wrapper.findAll('.range-inputs input')
    await inputs[0].setValue('')
    await wrapper.find('#mass').setValue('')

    expect(store.forms[0].fields.ionChargeMin).toBeNull()
    expect(store.forms[0].fields.massNumber).toBeNull()
  })

  it('provides element autocomplete via datalist', () => {
    const wrapper = mountForm()
    const datalist = wrapper.find('#elements-list')
    const options = datalist.findAll('option')

    // Should have all elements
    expect(options.length).toBeGreaterThan(100)
    // Check a few known elements
    expect(options.map(o => o.attributes('value'))).toContain('H')
    expect(options.map(o => o.attributes('value'))).toContain('Fe')
    expect(options.map(o => o.attributes('value'))).toContain('U')
  })
})
