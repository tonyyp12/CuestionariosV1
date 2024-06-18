<script setup>
import {ref, onMounted} from 'vue';
import {X, Download, Loader, Trash2} from 'lucide-vue-next';
import {collection, query, where, onSnapshot, deleteDoc, doc} from 'firebase/firestore'; // Importación de funciones de Firestore
import {db} from '@/services/firebase';
import {getUserData} from '@/services/authService';
import * as XLSX from 'xlsx'; // Importación de la librería XLSX para manejar archivos Excel
import AlertCard from '@/components/AlertCard.vue'; // Importación del componente AlertCard

const props = defineProps({
  responseCount: {
    type: Number,
    required: true,
  },
  questionnaireId: {
    type: String,
    required: true,
  },
});
// Variables reactivas
const isOpen = ref(false);
const responses = ref([]);
const isDownloading = ref(false);
const userIngresos = ref({});
const showAlert = ref(false);
const deletingResponse = ref(null);
const isDeleting = ref(false);

const openDialog = () => {
  isOpen.value = true;
};

const closeDialog = () => {
  isOpen.value = false;
};
// Función para obtener las respuestas desde Firestore
const getResponses = () => {
  const responsesQuery = query(collection(db, 'respuestas'), where('questionnaireId', '==', props.questionnaireId));

  // Escucha en tiempo real de los cambios en las respuestas
  onSnapshot(responsesQuery, async (snapshot) => {
    const responsesData = await Promise.all(snapshot.docs.map(async (doc) => {
      const response = doc.data();
      const userData = await getUserData(response.userId);
      return {
        id: doc.id,
        ...response,
        user: userData,
      };
    }));

    responses.value = responsesData;

    // Calcular ingresos por usuario
    const ingresos = {};
    responsesData.forEach(response => {
      if (ingresos[response.userId]) {
        ingresos[response.userId]++;
      } else {
        ingresos[response.userId] = 1;
      }
    });
    userIngresos.value = ingresos;
  });
};
// Función para iniciar el proceso de eliminación de una respuesta
const eliminarRespuesta = (response) => {
  deletingResponse.value = response;
  showAlert.value = true;
};
// Función para confirmar y ejecutar la eliminación de la respuesta seleccionada
const confirmDelete = async () => {
  isDeleting.value = true;
  try {
    await deleteDoc(doc(db, 'respuestas', deletingResponse.value.id));
    console.log('Respuesta eliminada exitosamente');
  } catch (error) {
    console.error('Error al eliminar la respuesta:', error);
  } finally {
    isDeleting.value = false;
    deletingResponse.value = null;
    showAlert.value = false;
  }
};
// Función para descargar un archivo Excel con todas las respuestas
const downloadExcel = () => {
  isDownloading.value = true;

  const headers = ['Id', 'Nombre', 'Email', 'Fecha', 'Birthday', 'Age', 'Gender', 'Duration', 'Recurrencia'];
  const data = [];

  responses.value.forEach(response => {
    const row = [
      response.id,
      response.user.name,
      response.user.email,
      response.startTime.toDate().toLocaleDateString(),
      response.user.dob,
      new Date().getFullYear() - new Date(response.user.dob).getFullYear(),
      response.user.gender,
      response.duration,
      userIngresos.value[response.userId],
    ];

    if (response.user.role === 'Estudiante' && !headers.includes('Semestre Escolar')) {
      headers.splice(9, 0, 'Semestre Escolar');
      row.splice(9, 0, response.user.cycle);
    } else if (response.user.role === 'Estudiante') {
      row.splice(9, 0, response.user.cycle);
    }

    const responseKeys = Object.keys(response.responses);
    responseKeys.forEach(key => {
      if (!headers.includes(key)) {
        headers.push(key);
      }
      row.push(response.responses[key]);
    });

    data.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Respuestas");

  const dateString = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${props.questionnaireId}_${dateString}.xlsx`);

  isDownloading.value = false;
};
// Función para descargar un archivo Excel de una respuesta individual
const downloadSingleExcel = (response) => {
  const headers = ['Id', 'Nombre', 'Email', 'Fecha', 'Birthday', 'Age', 'Gender', 'Duration', 'Recurrencia'];
  const data = [
    response.id,
    response.user.name,
    response.user.email,
    response.startTime.toDate().toLocaleDateString(),
    response.user.dob,
    new Date().getFullYear() - new Date(response.user.dob).getFullYear(),
    response.user.gender,
    response.duration,
    userIngresos.value[response.userId],
  ];

  if (response.user.role === 'Estudiante') {
    headers.splice(9, 0, 'Semestre Escolar');
    data.splice(9, 0, response.user.cycle);
  }

  const responseKeys = Object.keys(response.responses);
  responseKeys.forEach(key => {
    if (!headers.includes(key)) {
      headers.push(key);
    }
    data.push(response.responses[key]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, data]); // Crear hoja de cálculo en formato de matriz
  const workbook = XLSX.utils.book_new(); // Crear nuevo libro de trabajo
  XLSX.utils.book_append_sheet(workbook, worksheet, "Respuesta"); // Añadir hoja de cálculo al libro

  const dateString = new Date().toISOString().slice(0, 10); // Obtener fecha actual en formato ISO
  XLSX.writeFile(workbook, `${response.id}_${dateString}.xlsx`); // Descargar archivo Excel
};
// Ejecutar función para obtener las respuestas al montar el componente
onMounted(() => {
  getResponses();
});
</script>
<template>
  <div>
    <button @click="openDialog"
            class="relative w-10 h-10 rounded-full bg-indigo-300 text-pink-600 font-bold flex items-center justify-center">
      {{ responseCount }}
    </button>
    <div v-if="isOpen" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div
            class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full"
            role="dialog" aria-modal="true" aria-labelledby="modal-headline">
          <div class="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 text-white">
            <div class="sm:flex sm:items-start sm:justify-between">
              <h3 class="text-lg leading-6 font-medium text-white" id="modal-headline">
                Respuestas del Cuestionario
              </h3>
              <button @click="closeDialog" class="text-white font-bold text-lg">
                <X/>
              </button>
            </div>
            <!-- Barra de búsqueda y botón de descarga -->
            <div class="mt-2">
              <div class="flex justify-between items-center mb-4 sticky top-0 bg-gray-800 py-4 z-10">
                <div class="relative w-1/3">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke-linecap="round" stroke-linejoin="round"
                         stroke-width="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <input type="text" placeholder="Buscar"
                         class="w-full pl-10 pr-3 py-2 rounded-md bg-gray-700 text-white border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"/>
                </div>
                 <!-- Botón para descargar todo el contenido -->
                <button @click="downloadExcel"
                        class="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
                        :disabled="isDownloading">
                  <Download v-if="!isDownloading" class="mr-2"/>
                  <Loader v-else class="animate-spin mr-2"/>
                  Descargar Todo
                </button>
              </div>
              <!-- Tabla de respuestas -->
              <div class="overflow-y-auto custom-scrollbar" style="max-height: 70vh;">
                <table class="min-w-full bg-gray-700 text-white">
                  <thead>
                  <tr>
                    <th class="py-3 px-6 text-center">Código</th>
                    <th class="py-3 px-6 text-center">Fecha</th>
                    <th class="py-3 px-6 text-center">Nombre</th>
                    <th class="py-3 px-6 text-center">Correo</th>
                    <th class="py-3 px-6 text-center">Rol</th>
                    <th class="py-3 px-6 text-center">Opciones</th>
                  </tr>
                  </thead>
                  <tbody>
                  <!-- Filas de la tabla generadas dinámicamente -->
                  <tr v-for="response in responses" :key="response.id" class="border-t border-gray-600">
                    <td class="py-4 px-6 text-center">{{ response.id }}</td>
                    <td class="py-4 px-6 text-center">
                      {{ new Date(response.startTime.toDate()).toLocaleDateString('es-ES') }}
                    </td>
                    <td class="py-4 px-6 text-center">{{ response.user.name }}</td>
                    <td class="py-4 px-6 text-center">{{ response.user.email }}</td>
                    <td class="py-4 px-6 text-center">{{ response.user.role }}</td>
                    <td class="py-4 px-6 text-center flex justify-center items-center space-x-2">
                      <!-- Botones de opciones (descargar y eliminar) -->
                      <button @click="downloadSingleExcel(response)"
                              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded flex items-center justify-center">
                        <Download class="icon-center"/> 
                      </button>
                      <!-- Botón para eliminar respuesta -->
                      <button @click="eliminarRespuesta(response)"
                              class="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded flex items-center justify-center">
                        <Trash2 class="icon-center"/>
                      </button>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Alerta para confirmar eliminación -->
    <div v-if="showAlert" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <AlertCard :deleting="isDeleting" @update:show="showAlert = false" class="max-w-sm mx-auto">
        <template #icon>
          <Trash2 class="w-16 h-16"/>
        </template>
        ¿Estás seguro de que deseas eliminar esta respuesta? Esta acción no se puede deshacer.
        <template #actions>
          <!-- Botón para confirmar eliminación -->
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
table {
  border-collapse: collapse;
}

table thead, table tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}

table thead {
  position: sticky;
  top: 0;
  background: #4a5568;
  z-index: 1;
}

/* custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #2d3748;
  border-radius: 5px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 5px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #718096;
}

/* firefox */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #4a5568 #2d3748;
}

/* Center the icon within the button */
.icon-center {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
</style>
