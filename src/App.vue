<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQueryStore } from './stores/query.js'
import QueryBuilder from './components/QueryBuilder.vue'
import QueryPanel from './components/QueryPanel.vue'
import PreviewResults from './components/PreviewResults.vue'
import XSAMSPreview from './components/XSAMSPreview.vue'
import ConsumerSelect from './components/ConsumerSelect.vue'

const queryStore = useQueryStore()

const hasQuery = computed(() => queryStore.hasValidQuery || queryStore.customQuery)

// Theme handling: 'light', 'dark', or 'system'
const theme = ref('system')

function applyTheme(t) {
  if (t === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', t)
  }
}

function cycleTheme() {
  const order = ['system', 'light', 'dark']
  const idx = order.indexOf(theme.value)
  theme.value = order[(idx + 1) % order.length]
  localStorage.setItem('theme', theme.value)
  applyTheme(theme.value)
}

const themeLabel = computed(() => {
  if (theme.value === 'system') return 'Auto'
  if (theme.value === 'light') return 'Light'
  return 'Dark'
})

// Load state from URL on mount
onMounted(() => {
  queryStore.loadFromURL()

  // Load saved theme
  const saved = localStorage.getItem('theme')
  if (saved && ['light', 'dark', 'system'].includes(saved)) {
    theme.value = saved
  }
  applyTheme(theme.value)
})

// Handle browser back/forward navigation
const handlePopState = () => {
  queryStore.loadFromURL()
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <h1>VAMDC Portal</h1>
        <p class="subtitle">Query atomic and molecular data across distributed databases</p>
      </div>
      <button class="theme-toggle" @click="cycleTheme" :title="`Theme: ${themeLabel}`">
        {{ themeLabel }}
      </button>
    </header>

    <main class="main">
      <div class="query-section">
        <QueryBuilder />
      </div>

      <aside class="sidebar">
        <QueryPanel />
        <PreviewResults v-if="hasQuery" />
        <XSAMSPreview v-if="hasQuery" />
        <ConsumerSelect v-if="hasQuery" />
      </aside>
    </main>

    <footer class="footer">
      <p>
        <a href="https://vamdc.org" target="_blank" rel="noopener">VAMDC Consortium</a>
        &middot;
        <a href="https://github.com/VAMDC/StaticPortal" target="_blank" rel="noopener">Source Code</a>
      </p>
    </footer>
  </div>
</template>
