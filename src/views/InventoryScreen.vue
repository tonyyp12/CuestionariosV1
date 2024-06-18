<script setup>
//Importaciones necesarias
import {ref, onMounted, computed} from 'vue';
import {collection, getDocs, query, where, onSnapshot, deleteDoc, doc} from 'firebase/firestore';
import {db} from '@/services/firebase';
import {getCurrentUserUID} from '@/services/authService';
import {useRouter} from 'vue-router';
import {Edit, Trash2, PlusCircle, Home, Loader} from 'lucide-vue-next';
import ProfileIcon from '@/components/ProfileIcon.vue';
import InventarioDialog from '@/dialogs/InventoryDialog.vue';
import AlertCard from '@/components/AlertCard.vue';
import SearchInput from '@/components/SearchInput.vue';
// Variables reactivas
const inventarios = ref([]);
const buscarFiltro = ref('');
const dialogVisible = ref(false);
const isEditing = ref(false);
const selectedInventario = ref(null);
const showAlert = ref(false);
const deletingInventory = ref(null);
const isDeleting = ref(false);
const router = useRouter();
// Función para obtener inventarios del usuario actual
const obtenerInventarios = async () => {
  try {
    const uid = getCurrentUserUID(); // Obtiene el UID del usuario actual
    if (!uid) {
      throw new Error("Usuario no autenticado"); // Lanza un error si no hay usuario autenticado
    }

    const inventariosRef = collection(db, 'inventarios'); // Referencia a la colección de inventarios
    const q = query(inventariosRef, where('uid', '==', uid)); // Consulta para obtener inventarios del usuario

    const unsubscribe = onSnapshot(q, (snapshot) => { // Suscripción en tiempo real a cambios en los inventarios
      const inventariosData = [];
      snapshot.forEach((doc) => {
        inventariosData.push({id: doc.id, ...doc.data()}); // Agrega cada inventario a la lista
      });
      inventarios.value = inventariosData; // Actualiza la lista de inventarios
    }, (error) => {
      console.error("Error al obtener inventarios en tiempo real:", error);
    });

    return unsubscribe; // Devuelve la función para cancelar la suscripción
  } catch (error) {
    console.error('Error al obtener inventarios:', error);
  }
};
// Llama a la función obtenerInventarios cuando el componente se monta
onMounted(() => {
  obtenerInventarios();
});
// Computed property para filtrar inventarios según el término de búsqueda
const inventariosFiltrados = computed(() => {
  return inventarios.value.filter(inventario =>
      inventario.descripcion.toLowerCase().includes(buscarFiltro.value.toLowerCase()) ||
      inventario.id.toLowerCase().includes(buscarFiltro.value.toLowerCase())
  );
});
// Computed property para ordenar los inventarios por fecha y hora de carga
const inventariosOrdenados = computed(() => {
  return inventariosFiltrados.value.sort((a, b) => {
    const fechaA = new Date(a.fecha_carga.split(', ')[0]);
    const fechaB = new Date(b.fecha_carga.split(', ')[0]);
    const horaA = new Date(`1970-01-01T${a.fecha_carga.split(', ')[1]}`);
    const horaB = new Date(`1970-01-01T${b.fecha_carga.split(', ')[1]}`);
    return fechaB - fechaA || horaB - horaA;
  });
});
// Formatea la fecha para mostrar solo la parte de la fecha
const formatDate = (date) => {
  const [dateStr, timeStr] = date.split(', ');
  return dateStr;
};
// Abre el diálogo para agregar un nuevo inventario
const agregarInventario = () => {
  isEditing.value = false;
  selectedInventario.value = null;
  dialogVisible.value = true;
};
// Guarda el inventario y cierra el diálogo
const guardarInventario = (inventario) => {
  console.log('Guardar inventario:', inventario);
  dialogVisible.value = false;
};
// Navega a la vista de detalles del inventario
const verInventario = (inventario) => {
  router.push({name: 'InventoryDetail', params: {id: inventario.id}});
};
// Abre el diálogo para editar un inventario existente
const editarInventario = (inventario) => {
  selectedInventario.value = inventario;
  isEditing.value = true;
  dialogVisible.value = true;
};
// Solicita confirmación para eliminar un inventario
const eliminarInventario = async (inventario) => {
  deletingInventory.value = inventario;
  showAlert.value = true;
};
// Confirma y elimina el inventario y sus preguntas
const confirmDelete = async () => {
  isDeleting.value = true; // Establece el estado de eliminación a verdadero
  try {
    const inventarioRef = doc(db, 'inventarios', deletingInventory.value.id); // Referencia al documento del inventario
    const questionsCollectionRef = collection(inventarioRef, 'questions'); // Referencia a la colección de preguntas del inventario

    const querySnapshot = await getDocs(questionsCollectionRef);
    const deleteQuestionPromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deleteQuestionPromises);

    await deleteDoc(inventarioRef); // Elimina el inventario

    console.log('Inventario y cuestionarios eliminados:', deletingInventory.value); // Muestra un mensaje de éxito
  } catch (error) {
    console.error('Error al eliminar inventario y cuestionarios:', error);
  } finally {
    isDeleting.value = false;
    deletingInventory.value = null;
    showAlert.value = false;
  }
};
// Navega hacia atrás en la historia del navegador
const goBack = () => {
  router.go(-1);
};
</script>

<template>
  <div class="relative flex flex-col min-h-screen bg-gray-900 text-white">
    <main class="flex-grow p-4">
      <div class="bg-gray-800 rounded-lg p-4">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center space-x-4">
            <button @click="goBack" class="p-1 rounded-full">
              <Home class="inline-block w-8 h-8 text-purple-600 mb-[-2px]"/>
            </button>
            <h1 class="text-3xl font-bold">Inventario</h1>
            <SearchInput v-model="buscarFiltro"/>
            <button @click="agregarInventario" class="p-1 bg-gray-600 rounded-full">
              <PlusCircle class="inline-block w-8 h-8 text-green-600"/>
            </button>
          </div>
          <ProfileIcon/>
        </div>
        <div class="overflow-x-auto mt-4">
          <table class="min-w-full bg-gray-700 rounded-lg">
            <thead>
            <tr class="text-left">
              <!-- Encabezado de la tabla -->
              <th class="px-4 py-2">Código</th>
              <th class="px-4 py-2">Nombre</th>
              <th class="px-4 py-2">Descripción</th>
              <th class="px-4 py-2">Fecha de creación</th>
              <th class="px-4 py-2 w-32 text-center">Acciones</th>
              <!-- Columnas de la tabla -->
            </tr>
            </thead>
            <tbody>
            <tr v-for="inventario in inventariosOrdenados" :key="inventario.id" class="hover:bg-gray-600"
                @click="verInventario(inventario)">
                <!-- Filas de inventarios ordenados -->
              <td class="px-4 py-2">{{ inventario.id }}</td>
              <td class="px-4 py-2">{{ inventario.nombre }}</td>
              <td class="px-4 py-2">{{ inventario.descripcion }}</td>
              <td class="px-4 py-2">{{ formatDate(inventario.fecha_carga) }}</td>
              <!-- Datos del inventario -->
              <td class="px-4 py-2 flex justify-center space-x-2">
                <!-- Columna de acciones -->
                <button @click.stop="editarInventario(inventario)" class="p-1 bg-gray-600 rounded-md">
                  <!-- Botón para editar inventario -->
                  <Edit class="inline-block w-5 h-5 text-blue-600"/>
                  <!-- Icono de editar -->
                </button>
                <button @click.stop="eliminarInventario(inventario)" class="p-1 bg-gray-600 rounded-md">
                  <Trash2 class="inline-block w-5 h-5 text-red-600"/>
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
    <InventarioDialog v-model:dialogVisible="dialogVisible" :inventario="selectedInventario" :isEditing="isEditing"
                      @guardar="guardarInventario"/>
    <!-- Diálogo para agregar o editar inventarios -->
    <div v-if="showAlert" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <!-- Contenedor para alerta de eliminación -->
      <AlertCard :deleting="isDeleting" @update:show="showAlert = false" class="max-w-sm mx-auto">
        <template #icon>
          <Trash2 class="w-16 h-16"/>
        </template>
        ¿Estás seguro de que deseas eliminar este inventario? Esta acción no se puede deshacer.
        <template #actions>
          <button @click="confirmDelete"
                  class="bg-red-600 text-white px-4 py-2 rounded flex items-center justify-center"
                  :disabled="isDeleting" style="width: 120px;">
            <!-- Botón de confirmación de eliminación -->
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
