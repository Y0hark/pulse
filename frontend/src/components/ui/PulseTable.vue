<script setup lang="ts">
withDefaults(
  defineProps<{
    columns: Array<{ key: string; label: string; align?: 'left' | 'right' | 'center' }>;
    rows: Array<Record<string, unknown>>;
    rowKey?: string;
  }>(),
  {
    rowKey: 'id',
  },
);
</script>

<template>
  <div class="pulse-table-wrap">
    <table class="pulse-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="{ textAlign: column.align ?? 'left' }"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="(row[rowKey] as string) ?? index">
          <td v-for="column in columns" :key="column.key" :style="{ textAlign: column.align ?? 'left' }">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="pulse-table__empty">
            <slot name="empty">No data.</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.pulse-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.pulse-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.pulse-table th {
  background: var(--color-surface-alt);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.pulse-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  transition: background var(--transition-fast);
}

.pulse-table tbody tr:last-child td {
  border-bottom: none;
}

.pulse-table tbody tr:hover td {
  background: var(--color-surface-hover);
}

.pulse-table__empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: var(--space-8);
}
</style>
