<script setup>
import { computed } from 'vue';
import { FileText, CheckCircle } from 'lucide-vue-next'; // Importa íconos de 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    required: true // El título es requerido
  },
  questionnaires: {
    type: Array,
    default: () => [] // Lista de cuestionarios, por defecto un array vacío
  },
  responses: {
    type: Array,
    default: () => [] // Lista de respuestas, por defecto un array vacío
  },
  status: {
    type: String,
    default: 'pending', // Estado del componente, por defecto 'pending'
    validator: value => ['pending', 'completed'].includes(value) // Valida que el estado sea 'pending' o 'completed'
  }
});
// Computed property para seleccionar el ícono basado en el estado
const iconComponent = computed(() => props.status === 'pending' ? FileText : CheckCircle);
// Computed property para aplicar clases CSS basadas en el estado
const iconClass = computed(() => ({
  'text-yellow-500': props.status === 'pending',
  'text-green-500': props.status === 'completed'
}));
// Definición de los eventos que el componente puede emitir
const emit = defineEmits(['select-questionnaire']);
// Función para manejar la selección de un cuestionario
const selectQuestionnaire = (questionnaireId) => {
  if (props.status === 'pending') {
    emit('select-questionnaire', questionnaireId);
  }
};
// Función para formatear fechas
const formatDate = (timestamp) => {
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};
// Función para formatear la duración
const formatDuration = (duration) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return minutes > 0 ? `${minutes} minutos ${Math.floor(seconds)} segundos` : `${Math.floor(seconds)} segundos`;
};
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold mb-8 text-center">{{ title }}</h1>
    <!-- Grid de cuestionarios o respuestas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Renderiza cada cuestionario o respuesta según el estado -->
      <div v-for="item in status === 'pending' ? questionnaires : responses" :key="item.id"
           class="bg-gray-700 p-6 rounded-lg text-center cursor-pointer"
           :class="{ 'hover:bg-gray-600': status === 'pending' }"
           @click="selectQuestionnaire(item.id)">
        <div class="flex justify-center mb-4">
          <component :is="iconComponent" :class="iconClass" class="w-16 h-16"/>
        </div>
        <p v-if="status === 'pending'" class="text-xl font-semibold">{{ item.nombre }}</p>
        <template v-else>
          <p class="text-xl font-semibold mb-2 text-center">{{ item.questionnaireName }}</p>
          <div class="text-gray-400 text-left">
            <p class="mb-2">Fecha de finalización: {{ formatDate(item.endTime) }}</p>
            <p>Duración: {{ formatDuration(item.duration) }}</p>
          </div>
        </template>
      </div>
    </div>
    <!-- Mensaje si no hay cuestionarios ni respuestas -->
    <p v-if="questionnaires.length === 0 && responses.length === 0" class="text-gray-400">
      No hay cuestionarios disponibles.
    </p>
  </div>
</template>

<style scoped>
</style>
