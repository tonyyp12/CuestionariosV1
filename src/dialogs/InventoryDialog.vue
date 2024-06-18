<script setup>
import {ref, onMounted, watch} from 'vue';
import {X, UploadCloud} from 'lucide-vue-next';
import {collection, doc, setDoc, getDoc} from "firebase/firestore"; // Importación de funciones de Firestore
import {db} from "@/services/firebase"; // Importación de la configuración de Firestore
import {read, utils} from 'xlsx'; // Importación de funciones para leer archivos XLSX
import {getCurrentUserUID} from '@/services/authService'; // Importación de función para obtener el UID del usuario

// Definición de las propiedades del componente
const props = defineProps({
  dialogVisible: Boolean,
  inventario: {
    type: Object,
    default: () => ({}),
  },
  isEditing: {
    type: Boolean,
    default: false,
  }
});

// Definición de los eventos emitidos por el componente
const emit = defineEmits(['update:dialogVisible', 'guardar']);
// Declaración de variables reactivas
const codigo = ref('');
const nombre = ref('');
const descripcion = ref('');
const file = ref(null);
const fileName = ref('');
const isLoading = ref(false);
const fechaCarga = new Date().toLocaleString('en-GB');

// Función para generar ID aleatorio a cada inventario
const generarCodigo = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigoGenerado = '';
  for (let i = 0; i < 6; i++) {
    codigoGenerado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  codigo.value = codigoGenerado;
};

// Función para cargar los datos del inventario en caso de edición
const cargarDatosInventario = () => {
  if (props.isEditing) {
    codigo.value = props.inventario.id;
    nombre.value = props.inventario.nombre || '';
    descripcion.value = props.inventario.descripcion || '';
    file.value = null;
    fileName.value = '';
  } else {
    generarCodigo();
    nombre.value = '';
    descripcion.value = '';
    file.value = null;
    fileName.value = '';
  }
};

onMounted(() => {
  cargarDatosInventario();
});

// Observador para recargar los datos del inventario cuando el diálogo se muestra
watch(() => props.dialogVisible, (newVal) => {
  if (newVal) {
    cargarDatosInventario();
  }
});

// Maneja la carga de archivos y actualiza el nombre del archivo
const handleFileUpload = (event) => {
  file.value = event.target.files[0];
  fileName.value = file.value ? file.value.name : '';
};

// Lee archivos CSV y los convierte a JSON
const leerArchivoCsv = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target.result;
      const workbook = read(csvData, {type: 'string'});
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet, {header: 1});
      resolve(jsonData);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
};

// Lee archivos XLSX y los convierte a JSON
const leerArchivoXlsx = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = read(data, {type: 'array'});
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet, {header: 1});
      resolve(jsonData);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};

// Determina el tipo de archivo y llama a la función de lectura correspondiente
const leerArchivo = (file) => {
  if (file.name.endsWith('.csv')) {
    return leerArchivoCsv(file);
  } else if (file.name.endsWith('.xlsx')) {
    return leerArchivoXlsx(file);
  } else {
    throw new Error('Formato de archivo no válido. Se esperaba un archivo CSV o XLSX.');
  }
};
// Valida que los campos obligatorios estén completos
const validarCampos = () => {
  if (!codigo.value.trim() || !nombre.value.trim() || !descripcion.value.trim() || (!file.value && !props.isEditing)) {
    return false;
  }
  return true;
};
// Función para guardar el inventario en Firestore
const guardarInventario = async () => {
  if (!validarCampos()) {
    alert('Todos los campos son obligatorios, incluyendo la carga del archivo CSV o XLSX.');
    return;
  }

  isLoading.value = true; // Indica que la operación de guardado está en progreso
  try {
    const uid = getCurrentUserUID(); // Obtiene el UID del usuario autenticado

    if (!uid) {
      throw new Error("Usuario no autenticado");
    }

    const inventariosRef = collection(db, "inventarios"); // Referencia a la colección de inventarios
    const codigoInventario = codigo.value.trim();

    const inventarioDoc = doc(inventariosRef, codigoInventario);
    const inventarioSnapshot = await getDoc(inventarioDoc);

    if (!props.isEditing && inventarioSnapshot.exists()) {
      alert("El código de inventario ya existe. Por favor, genere un nuevo código.");
      generarCodigo(); // Genera un nuevo código si el actual ya existe
    } else {
      const datos = file.value ? await leerArchivo(file.value) : [];
      await setDoc(inventarioDoc, {
        nombre: nombre.value,
        descripcion: descripcion.value,
        fecha_carga: fechaCarga,
        uid: uid
      });

      // Filtra los datos válidos del archivo
      const datosValidos = datos.slice(1).filter(fila =>
          fila[0] && fila[1] && fila[2] && fila[3] && fila[4] && fila[5] && fila[6]
      );

      const nuevasPreguntas = [];

      // Itera sobre los datos válidos y los guarda en Firestore
      for (let i = 0; i < datosValidos.length; i++) {
        const fila = datosValidos[i];
        const numeroFila = i + 2;

        const questionsCollectionRef = collection(inventariosRef, codigoInventario, "questions");
        const questionDoc = doc(questionsCollectionRef, fila[0]);
        const pregunta = {
          question: fila[1],
          responses: fila[2] && typeof fila[2] === 'string' ? fila[2].split(", ") : [],
          category: fila[3],
          subcategory: fila[4],
          scorekey: fila[5] && typeof fila[5] === 'string' ? fila[5].split(",").map(score => parseInt(score.trim())) : [],
          type: fila[6]
        };
        await setDoc(questionDoc, pregunta);
        nuevasPreguntas.push(pregunta);
      }

      // Emite el evento 'guardar' con los datos del inventario
      emit('guardar', {
        codigo: codigoInventario,
        nombre: nombre.value,
        descripcion: descripcion.value,
        fecha_carga: fechaCarga,
        preguntas: nuevasPreguntas
      });

      // Resetea los campos del formulario
      nombre.value = '';
      descripcion.value = '';
      file.value = null;
      fileName.value = '';
      generarCodigo();
      cerrarDialogo();
    }
  } catch (error) {
    console.error("Error al subir datos a Firestore:", error);
    alert("Ocurrió un error al guardar el inventario. Por favor, inténtalo de nuevo.");
  } finally {
    isLoading.value = false;
  }
};

// Función para cerrar el diálogo
const cerrarDialogo = () => {
  if (!isLoading.value) {
    emit('update:dialogVisible', false);
  }
};
// Función para capitalizar la primera letra de un texto
const capitalizarPrimeraLetra = (texto) => {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
</script>

<template>
  <!-- Contenedor del diálogo modal -->
  <div v-if="dialogVisible" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div class="bg-gray-800 p-8 rounded-lg shadow-lg max-w-xl w-full mx-4 md:mx-auto relative">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-white text-3xl font-bold">{{ isEditing ? 'Actualizar Inventario' : 'Crear Inventario' }}</h1>
        <!-- Botón para cerrar el diálogo, deshabilitado si `isLoading` es verdadero -->
        <button @click="cerrarDialogo" class="text-gray-400 hover:text-white transition duration-200"
                :disabled="isLoading">
          <X class="w-6 h-6"/>
        </button>
      </div>
      <!-- Campo de entrada para el código del inventario -->
      <div class="mb-4">
        <label for="codigo" class="block text-gray-300 text-lg mb-2">Código</label>
        <input id="codigo" v-model="codigo" type="text"
               class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
               readonly/>
      </div>
      <div class="mb-4">
        <label for="nombre" class="block text-gray-300 text-lg mb-2">Nombre</label>
        <input id="nombre" v-model="nombre" @input="nombre = nombre.toUpperCase()" type="text"
               class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>
      <div class="mb-4">
        <label for="descripcion" class="block text-gray-300 text-lg mb-2">Descripción</label>
        <textarea id="descripcion" v-model="descripcion" @input="descripcion = capitalizarPrimeraLetra(descripcion)"
                  placeholder="Descripción del inventario"
                  class="w-full p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"></textarea>
      </div>
      <!-- Sección para subir un archivo CSV o XLSX, visible solo si no se está editando -->
      <div v-if="!isEditing" class="mb-6">
        <label for="file" class="block text-gray-300 text-lg mb-2">Subir archivo CSV o XLSX</label>
        <div class="flex items-center">
          <input id="file" type="file" accept=".csv,.xlsx" @change="handleFileUpload" class="hidden"/>
          <label for="file"
                 class="w-full flex items-center justify-center p-3 rounded bg-gray-700 text-white cursor-pointer hover:bg-gray-600 transition duration-200">
            <UploadCloud class="w-6 h-6 mr-2"/>
            <span>Seleccionar archivo</span>
          </label>
        </div>
        <!-- Mostrar el nombre del archivo seleccionado, si existe -->
        <div v-if="fileName" class="mt-2 text-gray-300">
          Archivo seleccionado: {{ fileName }}
        </div>
      </div>
      <!-- Botón para guardar o actualizar el inventario -->
      <div class="flex justify-center">
        <button @click="guardarInventario" class="btn-guardar" :disabled="isLoading">
          <span v-if="!isLoading">{{ isEditing ? 'Actualizar' : 'Guardar' }}</span>
          <div v-else class="loader"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilo para el botón de guardar/actualizar */
.btn-guardar {
  @apply bg-blue-500 text-white text-lg py-2 px-6 rounded-lg hover:bg-blue-600 transition duration-200 relative;
  min-width: 120px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Estilo para el indicador de carga (spinner) */
.loader {
  width: 24px;
  height: 24px;
  border: 4px solid white;
  border-top: 4px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
