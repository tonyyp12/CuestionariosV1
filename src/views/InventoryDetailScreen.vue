<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Edit, Trash2, PlusCircle, Home, ChevronLeft, Loader } from 'lucide-vue-next';
import ProfileIcon from '@/components/ProfileIcon.vue';
import AlertCard from '@/components/AlertCard.vue';
import QuestionDialog from '@/dialogs/QuestionDialog.vue';
import SearchInput from '@/components/SearchInput.vue';

// Obtener la ruta y el enrutador
const route = useRoute();
const router = useRouter();
// Obtener el parámetro 'id' de la ruta
const codigoInventario = route.params.id;

// Definición de variables reactivas
const preguntas = ref([]);
const showAlert = ref(false);
const deletingPregunta = ref(null);
const isDeleting = ref(false);
const dialogVisible = ref(false);
const selectedPreguntaId = ref(null);
const searchTerm = ref(''); // Nuevo estado para el término de búsqueda

// Función para obtener las preguntas del inventario desde Firestore
const obtenerPreguntas = async () => {
  try {
    // Referencia al documento de inventario en Firestore
    const inventarioRef = doc(db, 'inventarios', codigoInventario);
    // Referencia a la colección de preguntas dentro del inventario
    const questionsRef = collection(inventarioRef, 'questions');
    // Obtener los documentos de la colección
    const querySnapshot = await getDocs(questionsRef);

    const preguntasData = [];
    // Recorrer cada documento y agregarlo al array preguntasData
    querySnapshot.forEach((doc) => {
      preguntasData.push({ id: doc.id, ...doc.data() });
    });

    // Asignar los datos obtenidos a la variable reactiva preguntas
    preguntas.value = preguntasData;
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    alert('Ocurrió un error al cargar las preguntas. Por favor, inténtalo de nuevo.');
  }
};

// Llamar a obtenerPreguntas cuando el componente se monte
onMounted(() => {
  obtenerPreguntas();
});

// Función para editar una pregunta
const editarPregunta = (pregunta) => {
  selectedPreguntaId.value = pregunta.id;
  dialogVisible.value = true;
};

// Función para agregar una nueva pregunta
const agregarPregunta = () => {
  selectedPreguntaId.value = null;
  dialogVisible.value = true;
};

// Función para eliminar una pregunta
const eliminarPregunta = async (pregunta) => {
  deletingPregunta.value = pregunta;
  showAlert.value = true;
};

// Confirmar la eliminación de una pregunta
const confirmDelete = async () => {
  isDeleting.value = true;
  try {
    const preguntaRef = doc(db, `inventarios/${codigoInventario}/questions`, deletingPregunta.value.id);
    await deleteDoc(preguntaRef);
    console.log('Pregunta eliminada:', deletingPregunta.value);

    // Actualizar la lista de preguntas después de la eliminación
    preguntas.value = preguntas.value.filter(p => p.id !== deletingPregunta.value.id);
  } catch (error) {
    console.error('Error al eliminar pregunta:', error);
  } finally {
    isDeleting.value = false;
    deletingPregunta.value = null;
    showAlert.value = false;
  }
};

// Manejar el evento de guardar una pregunta
const handleGuardar = () => {
  obtenerPreguntas();
  dialogVisible.value = false;
};

// Manejar el evento de actualizar una pregunta
const handleActualizar = () => {
  obtenerPreguntas();
  dialogVisible.value = false;
};

// Navegar al dashboard
const irAlDashboard = () => {
  router.push('/dashboard');
};

// Navegar a la página anterior
const irAtras = () => {
  router.back();
};

// Filtrar las preguntas basándose en el término de búsqueda
const filteredPreguntas = computed(() => {
  return preguntas.value.filter(pregunta =>
      pregunta.question.toLowerCase().includes(searchTerm.value.toLowerCase())
  );
});
</script>

<template>
  <div class="relative flex flex-col min-h-screen bg-gray-900 text-white">
    <main class="flex-grow p-4">
      <div class="bg-gray-800 rounded-lg p-4">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center space-x-4">
            <button @click="irAtras" class="text-white">
              <ChevronLeft class="inline-block w-8 h-8 text-purple-600"/>
            </button>
            <button @click="irAlDashboard" class="text-white">
              <Home class="inline-block w-8 h-8 text-purple-600"/>
            </button>
            <!-- Título del inventario -->
            <h1 class="text-3xl font-bold">Inventario: {{ codigoInventario }}</h1>
            <SearchInput v-model="searchTerm" />
            <!-- Botón para agregar una nueva pregunta -->
            <button @click="agregarPregunta" class="p-1 bg-gray-600 rounded-full">
              <PlusCircle class="inline-block w-8 h-8 text-green-600"/>
            </button>
          </div>
          <ProfileIcon />
        </div>
        <!-- Contenedor para la tabla de preguntas -->
        <div class="overflow-x-auto">
          <table class="min-w-full bg-gray-700 rounded-lg">
            <thead>
            <!-- Encabezados de la tabla -->
              <tr class="text-left">
              <th class="px-4 py-2">ID</th>
              <th class="px-4 py-2 w-1/3">Pregunta</th>
              <th class="px-4 py-2 w-1/3">Respuestas</th>
              <th class="px-4 py-2">Categoría</th>
              <th class="px-4 py-2">Subcategoría</th>
              <th class="px-4 py-2">Scorekey</th>
              <th class="px-4 py-2">Tipo</th>
              <th class="px-4 py-2 w-32 text-center">Acciones</th>
            </tr>
            </thead>
            <tbody>
            <!-- Filas de la tabla, generadas dinámicamente para cada pregunta filtrada -->
            <tr v-for="pregunta in filteredPreguntas" :key="pregunta.id" class="hover:bg-gray-600">
              <td class="px-4 py-2">{{ pregunta.id }}</td>
              <td class="px-4 py-2" v-text="pregunta.question"></td>
              <td class="px-4 py-2">{{ pregunta.responses.join(', ') }}</td>
              <td class="px-4 py-2">{{ pregunta.category }}</td>
              <td class="px-4 py-2">{{ pregunta.subcategory }}</td>
              <td class="px-4 py-2">{{ pregunta.scorekey.join(',') }}</td>
              <td class="px-4 py-2">{{ pregunta.type }}</td>
              <!-- Columna de acciones con botones para editar y eliminar -->
              <td class="px-4 py-2 flex justify-center space-x-2">
                <button @click="editarPregunta(pregunta)" class="p-1 bg-gray-600 rounded-md">
                  <Edit class="inline-block w-5 h-5 text-blue-600"/>
                </button>
                <button @click="eliminarPregunta(pregunta)" class="p-1 bg-gray-600 rounded-md">
                  <Trash2 class="inline-block w-5 h-5 text-red-600"/>
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
    <!-- Diálogo para agregar o editar preguntas -->
    <QuestionDialog
        :dialogVisible="dialogVisible"
        :preguntaId="selectedPreguntaId"
        :codigoInventario="codigoInventario"
        @update:dialogVisible="dialogVisible = $event"
        @guardar="handleGuardar"
        @actualizar="handleActualizar"
    />
    <!-- Tarjeta de alerta para confirmar eliminación -->
    <div v-if="showAlert" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <AlertCard :deleting="isDeleting" @update:show="showAlert = false" class="max-w-sm mx-auto">
        <template #icon>
          <Trash2 class="w-16 h-16" />
        </template>
        ¿Estás seguro de que deseas eliminar esta pregunta? Esta acción no se puede deshacer.
        <template #actions>
          <button @click="confirmDelete" class="bg-red-600 text-white px-4 py-2 rounded flex items-center justify-center" :disabled="isDeleting" style="width: 120px;">
            <span v-if="!isDeleting">Eliminar</span>
            <span v-else>
              <Loader class="animate-spin h-5 w-5 text-white"/>
            </span>
          </button>
        </template>
      </AlertCard>
    </div>
  </div>
</template>

<style scoped>
</style>
