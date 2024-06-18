<script setup>
import { ref } from 'vue';
import { XCircle, Trash2 } from 'lucide-vue-next';
// Definición de las propiedades (props) que el componente acepta
const props = defineProps({
  iconColor: {
    type: String,
    default: '#ff9800',
  },
  deleting: {
    type: Boolean,
    default: false, // Indica si está en estado de eliminación
  },
});
// Definición de los eventos que el componente puede emitir
const emit = defineEmits(['update:show']);
// Estado reactivo que controla la visibilidad de la alerta
const show = ref(true);
// Método para cerrar la alerta, emitiendo el evento 'update:show'
const closeAlert = () => {
  emit('update:show', false);
};
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <!-- Condicional de visibilidad basado en el estado 'show' -->
    <div v-if="show" class="flex flex-col items-center p-6 rounded-lg shadow-lg bg-white max-w-xs mx-auto my-8">
      <!-- Botón de cierre -->
      <div class="flex justify-end w-full mb-2">
        <button class="text-gray-600 hover:text-gray-800" @click="closeAlert">
          <XCircle class="w-8 h-8" />
        </button>
      </div>
      <div class="flex items-center justify-center mb-4" :style="{ color: iconColor }">
        <!-- Slot para el ícono personalizado, con 'Trash2' como predeterminado -->
        <slot name="icon">
          <Trash2 class="w-20 h-20" />
        </slot>
      </div>
      <!-- Contenido principal de la alerta -->
      <div class="text-center text-lg text-gray-800 mb-6 flex-grow">
        <slot></slot>
      </div>
      <!-- Área para acciones adicionales, definidas en un slot -->
      <div class="mt-4 text-sm">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
