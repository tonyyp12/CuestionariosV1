<script setup>
// Importaciones necesarias de Vue y otros módulos
import { ref, onMounted, watch } from 'vue';
import { defineEmits, defineProps } from 'vue';
import { LucideShuffle, LucideCheckCircle, LucideX, LucideTrash2 } from 'lucide-vue-next';
import { getCurrentUserUID } from '@/services/authService';
import { db } from '@/services/firebase';
import { collection, setDoc, doc, query, where, getDocs, getDoc, updateDoc } from 'firebase/firestore';
// Definición de las propiedades (props) que el componente acepta
const props = defineProps({
  cuestionario: {
    type: Object,
    default: null
  }
});
// Definición de los eventos que el componente puede emitir
const emit = defineEmits(['close']);
// Definición de los estados reactivos
const nombre = ref('');
const ordenAleatorio = ref(false);
const seAceptanRespuestas = ref(false);
const frecuencia = ref('semestral');
const audiencia = ref('');
const genero = ref('');
const edad = ref('');
const inventariosSeleccionados = ref([]);
const descripcion = ref('');
const inventarios = ref([]);
const fechaInicio = ref(null);
const horaInicio = ref(null);
const cicloEscolar = ref('');
const loading = ref(false);
const isStudent = ref(false);
const showInventarios = ref(false);
// Función para cargar inventarios desde Firestore
const cargarInventarios = async () => {
  const uid = getCurrentUserUID();
  if (uid) {
    const q = query(collection(db, "inventarios"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    const userInventories = [];
    querySnapshot.forEach((doc) => {
      userInventories.push({ id: doc.id, nombre: doc.data().nombre });
    });
    inventarios.value = userInventories;
  }
};
// Función para cargar los datos del cuestionario desde Firestore
const cargarCuestionario = async () => {
  if (props.cuestionario) {
    const cuestionarioRef = doc(db, "cuestionarios", props.cuestionario.id);
    const cuestionarioDoc = await getDoc(cuestionarioRef);
    if (cuestionarioDoc.exists()) {
      const data = cuestionarioDoc.data();
      nombre.value = data.nombre;
      ordenAleatorio.value = data.ordenAleatorio;
      seAceptanRespuestas.value = data.seAceptanRespuestas;
      frecuencia.value = data.frecuencia;
      audiencia.value = data.audiencia;
      genero.value = data.genero || '';
      edad.value = data.edad || '';
      inventariosSeleccionados.value = data.inventarios || [];
      descripcion.value = data.descripcion;
      fechaInicio.value = data.fechaInicio;
      horaInicio.value = data.horaInicio;
      cicloEscolar.value = data.cicloEscolar || '';
      isStudent.value = data.audiencia === 'Estudiante';
    }
  }
};
// Acción cuando el componente se monta
onMounted(() => {
  cargarInventarios();
  cargarCuestionario();

  document.addEventListener('click', handleClickOutside);
});
// Función para manejar el click fuera del menú de inventarios
const handleClickOutside = (event) => {
  const menu = document.getElementById('inventarios-menu');
  const button = document.getElementById('inventarios-button');

  if (menu && button && !menu.contains(event.target) && !button.contains(event.target)) {
    showInventarios.value = false;
  }
};
// Observador que actualiza el estado de isStudent según la audiencia
watch(audiencia, (newAudience) => {
  isStudent.value = newAudience === 'Estudiante';
});
// Función para generar un ID aleatorio
const generarID = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
// Función para guardar el cuestionario en Firestore
const guardarCuestionario = async () => {
  // Verifica que todos los campos obligatorios estén completos
  if (!nombre.value || !frecuencia.value || !audiencia.value || inventariosSeleccionados.value.length === 0 || !fechaInicio.value || !horaInicio.value) {
    alert('Por favor, complete todos los campos obligatorios.');
    return;
  }

  loading.value = true;
  const uid = getCurrentUserUID(); // Obtiene el UID del usuario actual
  if (uid) {
    try {
      // Prepara los datos del cuestionario
      const cuestionarioData = {
        nombre: nombre.value.toUpperCase(), // Guarda el nombre en mayúsculas
        ordenAleatorio: ordenAleatorio.value, // Indica si el orden es aleatorio
        seAceptanRespuestas: seAceptanRespuestas.value, // Indica si se aceptan respuestas
        frecuencia: frecuencia.value, // Frecuencia del cuestionario
        audiencia: audiencia.value, // Audiencia del cuestionario
        inventarios: inventariosSeleccionados.value, // Inventarios seleccionados
        descripcion: descripcion.value, // Descripción del cuestionario
        fechaInicio: fechaInicio.value, // Fecha de inicio del cuestionario
        horaInicio: horaInicio.value, // Hora de inicio del cuestionario
        uid: uid,
        estado: true, // Estado del cuestionario (activo)
      };

      //Filtros
      // Si la audiencia es "Estudiante" y se proporciona el ciclo escolar, agrégalo a los datos
      if (isStudent.value && cicloEscolar.value) {
        cuestionarioData.cicloEscolar = cicloEscolar.value;
      }

      // Si se proporciona el género, agrégalo a los datos
      if (genero.value) {
        cuestionarioData.genero = genero.value;
      }

      // Si se proporciona la edad, agrégalo a los datos
      if (edad.value) {
        cuestionarioData.edad = edad.value;
      }

      // Si el cuestionario ya existe, actualiza los datos en Firestore
      if (props.cuestionario) {
        const cuestionarioRef = doc(db, "cuestionarios", props.cuestionario.id);
        await updateDoc(cuestionarioRef, cuestionarioData);
        console.log("Cuestionario actualizado exitosamente");
      } else {
        // Si el cuestionario es nuevo, genera un ID y guarda los datos en Firestore
        const cuestionarioID = generarID();
        await setDoc(doc(db, "cuestionarios", cuestionarioID), cuestionarioData);
        console.log("Cuestionario guardado exitosamente con ID:", cuestionarioID);
      }
      closeDialog();
    } catch (error) {
      console.error("Error al guardar/actualizar el cuestionario: ", error);
    } finally {
      loading.value = false;
    }
  } else {
    console.error("No se encontró el UID del usuario");
    loading.value = false;
  }
};
// Función para cerrar el diálogo
const closeDialog = () => {
  emit('close');
};
// Función para limpiar campos no obligatorios
const limpiarCamposNoObligatorios = async () => {
  genero.value = '';
  edad.value = '';
  cicloEscolar.value = '';

  if (props.cuestionario) {
    const cuestionarioRef = doc(db, "cuestionarios", props.cuestionario.id);
    await updateDoc(cuestionarioRef, {
      genero: '',
      edad: '',
      cicloEscolar: ''
    });
  }
};

</script>

<template>
  <!-- Contenedor principal del diálogo, centrado en la pantalla y con fondo oscuro -->
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
    <!-- Fondo oscuro al hacer clic para cerrar el diálogo -->
    <div class="fixed inset-0 bg-black opacity-50" @click="closeDialog"></div>
    <!-- Contenedor del formulario -->
    <div class="bg-gray-800 rounded-lg p-6 w-auto inline-block shadow-md z-50 relative max-h-[94vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-1 sticky top-0 bg-gray-800 py-1">
        <!-- Título dinámico basado en si se está editando o creando un nuevo cuestionario -->
        <h1 class="text-xl font-bold text-blue-400 text-center flex-grow">
          {{ props.cuestionario ? 'Editar cuestionario' : 'Nuevo cuestionario' }}</h1>
        <button @click="closeDialog" class="text-gray-400 hover:text-gray-200">
          <LucideX class="h-5 w-5"/>
        </button>
      </div>
      <!-- Formulario para crear o editar un cuestionario -->
      <form @submit.prevent="guardarCuestionario">
        <div class="mb-4">
          <label for="nombre" class="block text-gray-300 mb-1">Nombre <span class="text-red-500">*</span></label>
          <input type="text" id="nombre" v-model="nombre"
                 class="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 uppercase bg-gray-900"
                 required/>
        </div>
        <!-- Opción para habilitar orden aleatorio -->
        <div class="mb-4 flex items-center">
          <input type="checkbox" id="ordenAleatorio" v-model="ordenAleatorio" class="mr-2 leading-tight"/>
          <label for="ordenAleatorio" class="text-gray-300 flex items-center">
            <LucideShuffle class="h-5 w-5 text-green-500 mr-1"/>
            Orden aleatorio
          </label>
        </div>
        <!-- Opción para aceptar respuestas -->
        <div class="mb-4 flex items-center">
          <input type="checkbox" id="seAceptanRespuestas" v-model="seAceptanRespuestas" class="mr-2 leading-tight"/>
          <label for="seAceptanRespuestas" class="text-gray-300 flex items-center">
            <LucideCheckCircle class="h-5 w-5 text-yellow-500 mr-1"/>
            Se aceptan respuestas
          </label>
        </div>
        <!-- Selección de frecuencia y audiencia -->
        <div class="mb-4 flex items-center space-x-4">
          <div class="flex-1">
            <label for="frecuencia" class="block text-gray-300 mb-1">Frecuencia <span
                class="text-red-500">*</span></label>
            <select id="frecuencia" v-model="frecuencia"
                    class="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900"
                    required>
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="semestral">Semestral</option>
            </select>
          </div>
          <div class="flex-1">
            <label for="audiencia" class="block text-gray-300 mb-1">Audiencia <span
                class="text-red-500">*</span></label>
            <select id="audiencia" v-model="audiencia"
                    class="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900"
                    required>
              <option value="" disabled>Seleccionar audiencia</option>
              <option value="Estudiante">Estudiante</option>
              <option value="Docente">Docente</option>
              <option value="Psicólogo">Psicólogo</option>
            </select>
          </div>
        </div>
        <!-- Filtros adicionales si la audiencia es "Estudiante" -->
        <div class="mb-4 flex items-center space-x-4">
          <div v-if="isStudent" class="flex-1">
            <select id="cicloEscolar" v-model="cicloEscolar"
                    class="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900">
              <option value="" disabled>Filtro 1</option>
              <option v-for="i in 12" :key="i" :value="i">{{ i }}</option>
            </select>
          </div>
          <!-- Selección de género -->
          <div class="flex-1">
            <select id="genero" v-model="genero"
                    class="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900">
              <option value="" disabled>Filtro 2</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <!-- Selección de edad -->
          <div class="flex-1">
            <select id="edad" v-model="edad"
                    class="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900">
              <option value="" disabled>Filtro 3</option>
              <option v-for="i in 83" :key="i + 17" :value="i + 17">{{ i + 17 }}</option>
            </select>
          </div>
          <button @click="limpiarCamposNoObligatorios" type="button" class="text-gray-400 hover:text-gray-200 ml-2">
            <LucideTrash2 class="h-5 w-5"/>
          </button>
        </div>
        <div class="mb-4 flex justify-center items-center space-x-4 relative">
          <!-- Selección de inventario, fecha y hora de inicio -->
          <div class="relative">
            <label for="inventario" class="block text-gray-300 mb-1">Inventario <span class="text-red-500">*</span></label>
            <button id="inventarios-button" type="button" @click="showInventarios = !showInventarios"
                    class="px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900">
              Seleccionar Inventario
            </button>
            <!-- Menú desplegable para seleccionar inventarios -->
            <div id="inventarios-menu" v-if="showInventarios" class="absolute left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
              <div class="max-h-48 overflow-y-auto">
                <div v-for="inv in inventarios" :key="inv.id" class="flex items-center space-x-2 p-2 hover:bg-gray-700">
                  <input type="checkbox" :id="`inventario_${inv.id}`" :value="inv.id" v-model="inventariosSeleccionados" class="form-checkbox h-4 w-4 text-blue-500 transition duration-150 ease-in-out">
                  <label :for="`inventario_${inv.id}`" class="text-gray-300">{{ inv.nombre }}</label>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label for="fechaInicio" class="block text-gray-300 mb-1">Fecha de inicio <span class="text-red-500">*</span></label>
            <input type="date" id="fechaInicio" v-model="fechaInicio"
                   class="px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900"
                   required/>
          </div>
          <div>
            <label for="horaInicio" class="block text-gray-300 mb-1">Hora de inicio <span class="text-red-500">*</span></label>
            <input type="time" id="horaInicio" v-model="horaInicio"
                   class="px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900"
                   required/>
          </div>
        </div>
        <div class="mb-4">
          <label for="descripcion" class="block text-gray-300 mb-1">Descripción</label>
          <textarea id="descripcion" v-model="descripcion"
                    class="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-300 bg-gray-900"
                    rows="2"></textarea>
        </div>
       <!-- Botón de envío del formulario con indicador de carga -->
        <div class="flex justify-center">
          <button type="submit" class="bg-red-600 text-white py-2 px-6 rounded-md flex items-center"
                  :disabled="loading">
            <span v-if="!loading">{{ props.cuestionario ? 'Actualizar' : 'Guardar' }}</span>
            <span v-else class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                   viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ props.cuestionario ? 'Actualizando...' : 'Guardando...' }}
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background-color: #4a4a4a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}

button:focus + .absolute,
button:hover + .absolute {
  display: block;
}
</style>
