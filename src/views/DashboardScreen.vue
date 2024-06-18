<script setup>
// Importaciones necesarias
import { ref, onMounted, watch } from 'vue'; // Importa las funciones ref, onMounted y watch desde Vue
import { useRouter } from 'vue-router';
import {Edit, Trash2, EyeOff, Eye, PlusCircle, FileText, Loader} from 'lucide-vue-next';
import AddCuestionario from '@/dialogs/AddCuestionario.vue'; // Importa el componente AddCuestionario
import ProfileIcon from '@/components/ProfileIcon.vue';
import SearchInput from '@/components/SearchInput.vue';
import { db } from '@/services/firebase'; // Importa la instancia de Firestore desde firebase.js
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getCurrentUserUID } from '@/services/authService'; // Importa la función getCurrentUserUID desde authService.js
import AlertCard from '@/components/AlertCard.vue';

// Declaración de variables reactivas
const router = useRouter();
const dialogOpen = ref(false); // Estado del diálogo para agregar/editar cuestionarios
const cuestionarios = ref([]); // Lista de cuestionarios del usuario
const showAlert = ref(false); // Estado de alerta de eliminación
const deletingCuestionario = ref(null);
const isDeleting = ref(false); // Estado de eliminación
const searchTerm = ref(''); // Término de búsqueda
const selectedCuestionario = ref(null); // Cuestionario seleccionado para editar

// Función para cargar los cuestionarios del usuario actual
const cargarCuestionarios = async () => {
  const uid = getCurrentUserUID(); // Obtiene el UID del usuario actual
  if (uid) {
    const q = query(collection(db, "cuestionarios"), where("uid", "==", uid)); // Crea una consulta para obtener los cuestionarios del usuario
    onSnapshot(q, (snapshot) => {
      const userCuestionarios = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        userCuestionarios.push({
          id: doc.id,
          estado: data.estado,
          nombre: data.nombre,
          audiencia: data.audiencia,
          descripcion: data.descripcion,
          frecuencia: data.frecuencia,
          respuestas: 0, // Inicialmente se establece en 0
          visible: true
        });
      });
      cuestionarios.value = userCuestionarios;

      // Escuchar los cambios en la colección de respuestas para cada cuestionario
      userCuestionarios.forEach((cuestionario) => {
        const responsesQuery = query(collection(db, "respuestas"), where("questionnaireId", "==", cuestionario.id));
        onSnapshot(responsesQuery, (responsesSnapshot) => {
          const index = cuestionarios.value.findIndex((c) => c.id === cuestionario.id);
          if (index !== -1) {
            cuestionarios.value[index].respuestas = responsesSnapshot.size; // Actualiza el número de respuestas del cuestionario
          }
        });
      });
    });
  }
};

// Llamar a la función cargarCuestionarios al montar el componente
onMounted(() => {
  cargarCuestionarios();
});

const totalCuestionarios = ref(0); // Total de cuestionarios

// Función para abrir el diálogo de agregar/editar cuestionario
const openDialog = () => {
  selectedCuestionario.value = null;
  dialogOpen.value = true;
};

// Función para cerrar el diálogo de agregar/editar cuestionario
const closeDialog = () => {
  dialogOpen.value = false;
  cargarCuestionarios();
};

// Función para navegar al inventario
const goToInventory = () => {
  router.push('/inventory');
};

// Función para alternar el estado de un cuestionario (activo/inactivo)
const toggleEstado = async (item) => {
  try {
    const cuestionarioRef = doc(db, 'cuestionarios', item.id);
    await updateDoc(cuestionarioRef, {
      estado: !item.estado // Cambia el estado del cuestionario
    });
  } catch (error) {
    console.error('Error updating estado:', error);
  }
};

// Función para eliminar un cuestionario (muestra la alerta de confirmación)
const eliminarCuestionario = (cuestionario) => {
  deletingCuestionario.value = cuestionario;
  showAlert.value = true;
};

// Función para confirmar la eliminación de un cuestionario
const confirmDelete = async () => {
  isDeleting.value = true;
  try {
    const cuestionarioRef = doc(db, 'cuestionarios', deletingCuestionario.value.id);
    await deleteDoc(cuestionarioRef); // Elimina el cuestionario de Firestore
    console.log('Cuestionario eliminado:', deletingCuestionario.value);
  } catch (error) {
    console.error('Error al eliminar cuestionario:', error);
  } finally {
    isDeleting.value = false;
    deletingCuestionario.value = null;
    showAlert.value = false;
  }
};

// Función para navegar al detalle del cuestionario
const goToQuestionnaireDetail = (item) => {
  router.push({ name: 'QuestionnaireDetail', params: { id: item.id } });
};

// Función para editar un cuestionario (abre el diálogo con los datos del cuestionario seleccionado)
const editarCuestionario = (cuestionario) => {
  selectedCuestionario.value = cuestionario;
  dialogOpen.value = true;
};

// Observador para filtrar la lista de cuestionarios según el término de búsqueda
watch(searchTerm, (newValue) => {
  cuestionarios.value = cuestionarios.value.map(item => ({
    ...item,
    visible: item.nombre.toLowerCase().includes(newValue.toLowerCase())
  }));
});
</script>

<template>
  <div class="relative flex flex-col min-h-screen bg-gray-900 text-white">
    <main class="flex-grow p-4">
      <div class="bg-gray-800 rounded-lg p-4">
        <!-- Barra superior con controles -->
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center space-x-4">
            <!-- Muestra el número de cuestionarios -->
            <span class="px-4 py-2 bg-blue-600 rounded-lg">{{ cuestionarios.length }} Cuestionarios</span>
            <SearchInput v-model="searchTerm" />
            <!-- Botón para abrir el diálogo de agregar cuestionario -->
            <button @click="openDialog" class="p-1 bg-gray-600 rounded-full">
              <PlusCircle class="inline-block w-8 h-8 text-green-600"/>
            </button>
            <!-- Botón para ir al inventario -->
            <button @click="goToInventory"
                    class="w-10 h-10 bg-cyan-600 rounded-full hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-600 flex items-center justify-center">
              <FileText class="inline-block w-6 h-6 text-white"/>
            </button>
          </div>
          <ProfileIcon/>
        </div>
        <!-- Tabla de cuestionarios -->
        <div class="overflow-x-auto">
          <table class="min-w-full bg-gray-700 rounded-lg">
            <thead>
            <tr>
              <!-- Encabezados de la tabla -->
              <th class="px-4 py-2 w-20">ID</th>
              <th class="px-4 py-2">Estado</th>
              <th class="px-4 py-2">Nombre</th>
              <th class="px-4 py-2">Audiencia</th>
              <th class="px-4 py-2">Descripción</th>
              <th class="px-4 py-2">Frecuencia</th>
              <th class="px-4 py-2">Respuestas</th>
              <th class="px-4 py-2 w-32">Acciones</th>
            </tr>
            </thead>
            <tbody>
            <!-- Filas de la tabla con los datos de los cuestionarios -->
            <tr v-for="item in cuestionarios" :key="item.id" class="text-center hover:bg-gray-600 rounded-md"
                @click="goToQuestionnaireDetail(item)" v-show="item.visible">
              <td class="px-4 py-2 rounded-l-md">{{ item.id }}</td>
              <td class="px-4 py-2">
                <!-- Muestra el estado del cuestionario (ACTIVO/INACTIVO) -->
                <span :class="[item.estado ? 'bg-green-600' : 'bg-red-600', 'px-2 py-1 rounded-full text-white']">{{
                    item.estado ? 'ACTIVO' : 'INACTIVO'
                  }}</span>
              </td>
              <td class="px-4 py-2">{{ item.nombre }}</td>
              <td class="px-4 py-2">{{ item.audiencia }}</td>
              <td class="px-4 py-2">{{ item.descripcion }}</td>
              <td class="px-4 py-2">{{ item.frecuencia }}</td>
              <td class="px-4 py-2">{{ item.respuestas }}</td>
               <!-- Acciones disponibles para cada cuestionario -->
              <td class="px-4 py-2 flex justify-center space-x-1 rounded-r-md">
                <button @click.stop="editarCuestionario(item)" class="p-1 bg-gray-600 rounded-md">
                  <Edit class="inline-block w-5 h-5 text-blue-600"/>
                </button>
                <button @click.stop="toggleEstado(item)" class="p-1 bg-gray-600 rounded-md">
                  <component :is="item.estado ? Eye : EyeOff" class="inline-block w-5 h-5"
                             :class="[item.estado ? 'text-green-600' : 'text-yellow-600']"/>
                </button>
                <button @click.stop="eliminarCuestionario(item)" class="p-1 bg-gray-600 rounded-md">
                  <Trash2 class="inline-block w-5 h-5 text-red-600"/>
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
    <!-- Componente de diálogo para agregar/editar cuestionario -->
    <AddCuestionario v-if="dialogOpen" :cuestionario="selectedCuestionario" @close="closeDialog"/>
    <div v-if="showAlert" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <AlertCard :deleting="isDeleting" @update:show="showAlert = false" class="max-w-sm mx-auto">
        <template #icon>
          <Trash2 class="w-16 h-16"/>
        </template>
        ¿Estás seguro de que deseas eliminar este cuestionario? Esta acción no se puede deshacer.
        <template #actions>
          <button @click="confirmDelete"
                  class="bg-red-600 text-white px-4 py-2 rounded flex items-center justify-center"
                  :disabled="isDeleting" style="width: 120px;">
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
