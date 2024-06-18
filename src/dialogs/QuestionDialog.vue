<script setup>
import { ref, watch, onMounted } from 'vue';
import { X, Save } from 'lucide-vue-next';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

// Definición de propiedades recibidas del componente padre
const props = defineProps({
  dialogVisible: Boolean,
  preguntaId: String,
  codigoInventario: String,
});

const emit = defineEmits(['update:dialogVisible', 'guardar', 'actualizar']);
// Definición del objeto de pregunta con sus campos iniciales
const pregunta = ref({
  id: '',
  question: '',
  responses: [],
  category: '',
  subcategory: '',
  scorekey: [],
  type: ''
});

const isLoading = ref(false); // Estado de carga
const isEditMode = ref(false); // Modo de edición

// Función para obtener la pregunta de Firestore
const obtenerPregunta = async (codigoInventario, preguntaId) => {
  try {
    const preguntaRef = doc(db, `inventarios/${codigoInventario}/questions`, preguntaId);
    const preguntaSnap = await getDoc(preguntaRef);
    if (preguntaSnap.exists()) {
      const data = preguntaSnap.data();
      if (typeof data.responses === 'string') {
        data.responses = data.responses.split(',').map(response => response.trim());
      }
      if (typeof data.scorekey === 'string') {
        data.scorekey = data.scorekey.split(',').map(score => Number(score.trim()));
      }
      pregunta.value = data; // Asignar los datos obtenidos a la pregunta
    } else {
      console.error('No se encontró la pregunta');
    }
  } catch (error) {
    console.error('Error al obtener la pregunta:', error);
  }
};

// Observador para dialogVisible
watch(() => props.dialogVisible, async (newValue) => {
  if (newValue) {
    isEditMode.value = !!props.preguntaId;
    if (props.preguntaId && props.codigoInventario) {
      await obtenerPregunta(props.codigoInventario, props.preguntaId);
    } else {
      // Resetear los campos si es un nuevo registro
      pregunta.value = {
        id: '',
        question: '',
        responses: [],
        category: '',
        subcategory: '',
        scorekey: [],
        type: ''
      };
    }
  }
});

// Función para guardar cambios en Firestore
const guardarCambios = async () => {
  isLoading.value = true;
  try {
    // Asegúrate de que responses es un array de cadenas antes de guardar
    if (typeof pregunta.value.responses === 'string') {
      pregunta.value.responses = pregunta.value.responses.split(',').map(response => response.trim());
    }
    // Asegúrate de que scorekey es un array de números antes de guardar
    if (typeof pregunta.value.scorekey === 'string') {
      pregunta.value.scorekey = pregunta.value.scorekey.split(',').map(score => Number(score.trim()));
    }

    const preguntaRef = doc(db, `inventarios/${props.codigoInventario}/questions`, props.preguntaId || pregunta.value.id);
    if (isEditMode.value) {
      await updateDoc(preguntaRef, pregunta.value);
      emit('actualizar');
    } else {
      await setDoc(preguntaRef, pregunta.value);
      emit('guardar');
    }
    cerrarDialogo();
  } catch (error) {
    console.error('Error al guardar la pregunta:', error);
    alert('Ocurrió un error al guardar la pregunta. Por favor, inténtalo de nuevo.');
  } finally {
    isLoading.value = false;
  }
};

const cerrarDialogo = () => {
  if (!isLoading.value) {
    emit('update:dialogVisible', false);
  }
};
// Función para convertir a mayúsculas un campo específico
const convertirMayusculas = (campo) => {
  pregunta.value[campo] = pregunta.value[campo].toUpperCase();
};
</script>

<template>
  <div v-if="dialogVisible" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-3xl w-full mx-4 md:mx-auto relative">
      <div class="flex items-center justify-between mb-6">
        <!-- Encabezado del modal con título dinámico según el modo de edición -->
        <h1 class="text-white text-3xl font-bold">{{ isEditMode ? 'Editar Pregunta' : 'Agregar Pregunta' }}</h1>
        <button @click="cerrarDialogo" class="text-gray-400 hover:text-white transition duration-200" :disabled="isLoading">
          <X class="w-6 h-6"/>
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
         <!-- Campo para ingresar el ID de la pregunta, visible solo en modo de agregado -->
        <div v-if="!isEditMode">
          <label for="id" class="block text-gray-300 text-lg mb-2">ID</label>
          <input id="id" v-model="pregunta.id" @input="convertirMayusculas('id')" type="text" class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label for="question" class="block text-gray-300 text-lg mb-2">Pregunta</label>
          <input id="question" v-model="pregunta.question" type="text" class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <!-- Campo para ingresar las respuestas separadas por comas -->
          <label for="responses" class="block text-gray-300 text-lg mb-2">Respuestas (separadas por comas y entre comillas)</label>
          <input id="responses" v-model="pregunta.responses" type="text" class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label for="category" class="block text-gray-300 text-lg mb-2">Categoría</label>
          <input id="category" v-model="pregunta.category" @input="convertirMayusculas('category')" type="text" class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label for="subcategory" class="block text-gray-300 text-lg mb-2">Subcategoría</label>
          <input id="subcategory" v-model="pregunta.subcategory" @input="convertirMayusculas('subcategory')" type="text" class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <!-- Campo para ingresar el scorekey separado por comas -->
          <label for="scorekey" class="block text-gray-300 text-lg mb-2">Scorekey (separados por comas)</label>
          <input id="scorekey" v-model="pregunta.scorekey" type="text" class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label for="type" class="block text-gray-300 text-lg mb-2">Tipo</label>
          <input id="type" v-model="pregunta.type" type="text" class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div class="flex justify-center mt-6">
        <button @click="guardarCambios" class="btn-guardar" :disabled="isLoading">
          <span v-if="!isLoading">{{ isEditMode ? 'Guardar Cambios' : 'Agregar Pregunta' }}</span>
          <div v-else class="loader"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-guardar {
  @apply bg-blue-500 text-white text-lg py-2 px-6 rounded-lg hover:bg-blue-600 transition duration-200 relative;
  min-width: 120px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader {
  width: 24px;
  height: 24px;
  border: 4px solid white;
  border-top: 4px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
