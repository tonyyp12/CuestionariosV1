<script setup>
import {ref, onMounted, computed} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {doc, getDoc, collection, query, getDocs, onSnapshot, where} from 'firebase/firestore';
import ProfileIcon from '@/components/ProfileIcon.vue';
import ResponseCountDialog from '@/dialogs/ResponseCountDialog.vue';
import {db} from '@/services/firebase';
import {Home, Loader} from 'lucide-vue-next';

const route = useRoute(); // Obtener instancia de la ruta actual
const router = useRouter();
const cuestionarioId = ref(route.params.id); // Variable reactiva para almacenar el ID del cuestionario
const responseCount = ref(0); // Variable reactiva para almacenar el conteo de respuestas

const cuestionario = ref(null); // Variable reactiva para almacenar los datos del cuestionario
const questions = ref([]); // Variable reactiva para almacenar las preguntas
const errorMessage = ref(''); // Variable reactiva para almacenar mensajes de error

// Computed property para contar el número de preguntas
const questionCount = computed(() => {
  return questions.value.length;
});
// Función para obtener datos del cuestionario
const getCuestionarioData = async () => {
  try {
    const cuestionarioDoc = await getDoc(doc(db, "cuestionarios", cuestionarioId.value));
    if (cuestionarioDoc.exists()) {
      cuestionario.value = cuestionarioDoc.data(); // Asignar datos del cuestionario a la variable reactiva

      const inventarios = cuestionario.value.inventarios; // Obtener inventarios del cuestionario

      for (const inventarioId of inventarios) {
        const questionsQuery = query(collection(db, `inventarios/${inventarioId}/questions`)); // Crear consulta para obtener preguntas
        const questionsSnapshot = await getDocs(questionsQuery); // Obtener preguntas

        // Agregar preguntas obtenidas a la variable reactiva questions
        questionsSnapshot.forEach(doc => {
          questions.value.push({id: doc.id, ...doc.data()});
        });
      }
      
      fetchResponseCount(); 
    } else {
      console.error('Cuestionario no encontrado');
    }
  } catch (error) {
    console.error("Error al obtener los datos del cuestionario: ", error);
  }
};

// Función para obtener el conteo de respuestas en tiempo real
const fetchResponseCount = () => {
  const responsesQuery = query(collection(db, "respuestas"), where("questionnaireId", "==", cuestionarioId.value));
  onSnapshot(responsesQuery, (snapshot) => {
    responseCount.value = snapshot.size; // Actualizar el conteo de respuestas
  });
};

const goBack = () => {
  router.back();
};
// Hook de montaje para ejecutar la función getCuestionarioData cuando el componente se monta
onMounted(() => {
  getCuestionarioData();
});
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-900 text-white">
    <header class="bg-gray-800 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
      <div class="flex items-center">
        <Home @click="goBack" class="cursor-pointer text-purple-500 mr-4 w-8 h-8" />
        <h1 class="text-3xl font-bold mr-4">Cuestionario: {{ cuestionarioId }}</h1>
        <ResponseCountDialog :response-count="responseCount" :questionnaire-id="cuestionarioId"/>
      </div>
      <ProfileIcon/>
    </header>
    <main class="flex-grow p-8">
      <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
        <div v-if="questions.length > 0">
          <h2 class="text-2xl font-bold mb-4">Preguntas ({{ questionCount }})</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div v-for="(question, index) in questions" :key="question.id"
                 class="bg-gray-700 p-6 rounded-lg shadow">
              <h3 class="text-xl font-bold mb-4">
                <span class="bg-indigo-600 text-white rounded-full px-3 py-1 mr-2">{{ index + 1 }}</span>
                {{ question.question }}
              </h3>

               <!-- Mostrar respuestas si la pregunta es de tipo Binary -->
              <div v-if="question.type === 'Binary'" class="mt-4 pl-12">
                <div v-for="(response, rIndex) in question.responses" :key="rIndex"
                     class="flex items-center mb-2">
                  <input type="radio" :id="`${question.id}-${rIndex}`"
                         :name="question.id" :value="response"
                         class="form-radio h-5 w-5 text-indigo-600">
                  <label :for="`${question.id}-${rIndex}`" class="ml-3 text-lg">{{ response }}</label>
                </div>
              </div>

              <!-- Mostrar respuestas si la pregunta es de tipo Radio -->
              <div v-if="question.type === 'Radio'" class="mt-4 pl-12">
                <div v-for="(response, rIndex) in question.responses" :key="rIndex"
                     class="flex items-center mb-2">
                  <input type="radio" :id="`${question.id}-${rIndex}`"
                         :name="question.id" :value="response"
                         class="form-radio h-5 w-5 text-indigo-600">
                  <label :for="`${question.id}-${rIndex}`" class="ml-3 text-lg">{{ response }}</label>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Mostrar mensaje de carga si no hay preguntas -->
        <div v-else class="text-center">
          <p class="text-gray-400 text-lg">Cargando preguntas...</p>
          <Loader class="animate-spin h-5 w-5 text-white"/>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/*estilos adicionales aquí*/
</style>
