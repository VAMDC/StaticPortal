import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CollisionsForm from '../../../src/components/forms/CollisionsForm.vue'
import { useQueryStore } from '../../../src/stores/query.js'

describe('CollisionsForm', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountForm(fields = {}) {
    const store = useQueryStore()
    store.addForm('collisions')
    const form = store.forms[0]

    Object.entries(fields).forEach(([key, value]) => {
      store.updateFormField(form.id, key, value)
    })

    return mount(CollisionsForm, {
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
    expect(wrapper.find('h4').text()).toBe('Collisions Search')
  })

  it('has target atom and molecule inputs', () => {
    const wrapper = mountForm()
    expect(wrapper.find('#target-symbol').exists()).toBe(true)
    expect(wrapper.find('#target-formula').exists()).toBe(true)
  })

  it('has collider atom and molecule inputs', () => {
    const wrapper = mountForm()
    expect(wrapper.find('#collider-symbol').exists()).toBe(true)
    expect(wrapper.find('#collider-formula').exists()).toBe(true)
  })

  it('updates target symbol in store', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#target-symbol').setValue('H')

    expect(store.forms[0].fields.targetSymbol).toBe('H')
  })

  it('updates target formula in store', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#target-formula').setValue('H2O')

    expect(store.forms[0].fields.targetFormula).toBe('H2O')
  })

  it('updates collider symbol in store', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#collider-symbol').setValue('e')

    expect(store.forms[0].fields.colliderSymbol).toBe('e')
  })

  it('shows element name for recognized target', async () => {
    const wrapper = mountForm({ targetSymbol: 'He' })
    expect(wrapper.text()).toContain('Helium')
  })

  it('shows electron hint for collider e', async () => {
    const wrapper = mountForm({ colliderSymbol: 'e' })
    expect(wrapper.text()).toContain('electron')
  })

  it('has process type dropdown', () => {
    const wrapper = mountForm()
    const select = wrapper.find('#process')
    expect(select.exists()).toBe(true)

    const options = select.findAll('option')
    expect(options.length).toBeGreaterThan(5)
  })

  it('updates process type in store', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#process').setValue('exci')

    expect(store.forms[0].fields.processType).toBe('exci')
  })

  it('has temperature range inputs', () => {
    const wrapper = mountForm()
    const inputs = wrapper.findAll('.range-inputs input')

    expect(inputs.length).toBe(2)
  })

  it('updates temperature range in store', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()
    const inputs = wrapper.findAll('.range-inputs input')

    await inputs[0].setValue('100')
    await inputs[1].setValue('1000')

    expect(store.forms[0].fields.temperatureMin).toBe(100)
    expect(store.forms[0].fields.temperatureMax).toBe(1000)
  })

  it('emits remove event when remove button clicked', async () => {
    const wrapper = mountForm()

    await wrapper.find('button.secondary').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
  })

  it('displays values from props', () => {
    const wrapper = mountForm({
      targetSymbol: 'O',
      colliderSymbol: 'e',
      processType: 'ionz',
      temperatureMin: 300,
      temperatureMax: 5000,
    })

    expect(wrapper.find('#target-symbol').element.value).toBe('O')
    expect(wrapper.find('#collider-symbol').element.value).toBe('e')
    expect(wrapper.find('#process').element.value).toBe('ionz')
  })
})
