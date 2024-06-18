<!-- src/components/SearchInput.vue -->
<script setup>
import { ref, watch } from 'vue';
import { Search } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});
// Definición de los eventos que el componente puede emitir
const emit = defineEmits(['update:modelValue']);
// Estado reactivo para el término de búsqueda
const searchTerm = ref(props.modelValue);
// Observador que emite el evento 'update:modelValue' cada vez que 'searchTerm' cambia
watch(searchTerm, (newValue) => {
  emit('update:modelValue', newValue);
});
</script>

<template>
  <div class="relative">
    <!-- Contenedor para el ícono de búsqueda -->
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search class="h-5 w-5 text-gray-400" />
    </div>
    <!-- Input de texto para el término de búsqueda -->
    <input
        type="text"
        v-model="searchTerm"
        placeholder="Buscar..."
        class="block w-full pl-10 pr-3 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-gray-600 text-gray-200 placeholder-gray-400 sm:text-sm"
    />
  </div>
</template>

<style scoped>
</style>
