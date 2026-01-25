import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MoleculesForm from '../../../src/components/forms/MoleculesForm.vue'
import { useQueryStore } from '../../../src/stores/query.js'

describe('MoleculesForm', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountForm(fields = {}) {
    const store = useQueryStore()
    store.addForm('molecules')
    const form = store.forms[0]

    Object.entries(fields).forEach(([key, value]) => {
      store.updateFormField(form.id, key, value)
    })

    return mount(MoleculesForm, {
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
    expect(wrapper.find('h4').text()).toBe('Molecules Search')
    expect(wrapper.find('#formula').element.value).toBe('')
    expect(wrapper.find('#name').element.value).toBe('')
    expect(wrapper.find('#inchikey').element.value).toBe('')
  })

  it('displays stoichiometric formula from props', () => {
    const wrapper = mountForm({ stoichiometricFormula: 'H2O' })
    expect(wrapper.find('#formula').element.value).toBe('H2O')
  })

  it('updates store when formula changes', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#formula').setValue('CO2')

    expect(store.forms[0].fields.stoichiometricFormula).toBe('CO2')
  })

  it('displays chemical name from props', () => {
    const wrapper = mountForm({ chemicalName: 'water' })
    expect(wrapper.find('#name').element.value).toBe('water')
  })

  it('updates store when chemical name changes', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#name').setValue('methane')

    expect(store.forms[0].fields.chemicalName).toBe('methane')
  })

  it('displays InChIKey from props', () => {
    const wrapper = mountForm({ inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N' })
    expect(wrapper.find('#inchikey').element.value).toBe('XLYOFNOQVPJJNP-UHFFFAOYSA-N')
  })

  it('updates store when InChIKey changes', async () => {
    const wrapper = mountForm()
    const store = useQueryStore()

    await wrapper.find('#inchikey').setValue('VNWKTOKETHGBQD-UHFFFAOYSA-N')

    expect(store.forms[0].fields.inchikey).toBe('VNWKTOKETHGBQD-UHFFFAOYSA-N')
  })

  it('emits remove event when remove button clicked', async () => {
    const wrapper = mountForm()

    await wrapper.find('button.secondary').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
  })
})
