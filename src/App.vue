<script setup>
import { computed } from 'vue'
import { useQueryStore } from './stores/query.js'
import QueryBuilder from './components/QueryBuilder.vue'
import NodeList from './components/NodeList.vue'
import PreviewResults from './components/PreviewResults.vue'

const queryStore = useQueryStore()

const vss2Query = computed(() => queryStore.vss2Query)
const hasQuery = computed(() => queryStore.hasValidQuery)
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>VAMDC Portal</h1>
      <p class="subtitle">Query atomic and molecular data across distributed databases</p>
    </header>

    <main class="main">
      <div class="query-section">
        <QueryBuilder />

        <div v-if="hasQuery" class="query-preview">
          <h3>Generated Query (VSS2)</h3>
          <code class="query-code">{{ vss2Query }}</code>
        </div>
      </div>

      <aside class="sidebar">
        <NodeList />
        <PreviewResults v-if="hasQuery" />
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
