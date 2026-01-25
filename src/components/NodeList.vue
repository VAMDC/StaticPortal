<script setup>
import nodes from '../data/nodes.json'
</script>

<template>
  <div class="node-list-panel panel">
    <div class="panel-header">
      <span>VAMDC Databases</span>
      <span class="count">{{ nodes.length }}</span>
    </div>

    <div class="panel-body">
      <ul class="node-list">
        <li
          v-for="node in nodes"
          :key="node.id"
          class="node-item"
          :title="node.description"
        >
          <span class="node-name">{{ node.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.count {
  font-size: 0.75rem;
  background: var(--color-bg);
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
}

.node-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>
