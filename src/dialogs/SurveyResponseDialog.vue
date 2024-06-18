<script setup>
import { ref, onMounted, computed, defineEmits } from 'vue';
import { doc, getDoc, query, collection, getDocs, setDoc } from "firebase/firestore";
import { db } from '@/services/firebase';
import { getCurrentUserUID } from '@/services/authService';

const props = defineProps({
  questionnaireId: {
    type: String,
    required: true
  },
  questionnaireName: {
    type: String,
    required: true
  }
});
// Define el evento personalizado 'close' que se emite hacia el padre
const emit = defineEmits(['close']);
// Referencias reactivas para almacenar datos y estados
const cuestionario = ref(null);
const questions = ref([]);
const currentQuestionIndex = ref(0);
const errorMessage = ref('');
const userResponses = ref({});
const seAceptanRespuestas = ref(false);
const startTime = ref(null);
const isSubmitting = ref(false);
// Función para formatear el texto de la pregunta dividiendo en líneas
const formatQuestion = (questionText) => {
  const words = questionText.split(' ');
  return words.reduce((acc, word, index) => {
    if (index > 0 && index % 10 === 0) {
      acc += '\n';
    }
    acc += word + ' ';
    return acc;
  }, '');
};
// Función asíncrona para obtener los datos del cuestionario
const getCuestionarioData = async () => {
  try {
    if (props.questionnaireId) {
      console.log('ID del cuestionario recibido en el diálogo:', props.questionnaireId);
      const cuestionarioDoc = await getDoc(doc(db, "cuestionarios", props.questionnaireId));
      if (cuestionarioDoc.exists()) {
        cuestionario.value = cuestionarioDoc.data();
        seAceptanRespuestas.value = cuestionario.value.seAceptanRespuestas;

        // Obtener los IDs de los inventarios relacionados
        const inventarioIds = cuestionario.value.inventarios;

        // Obtener las preguntas de cada inventario
        const questionsPromises = inventarioIds.map(async (inventarioId) => {
          const questionsQuery = query(collection(db, `inventarios/${inventarioId}/questions`));
          const questionsSnapshot = await getDocs(questionsQuery);
          return questionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        });

        const questionsArrays = await Promise.all(questionsPromises);
        questions.value = questionsArrays.flat();

        // Ordenar aleatoriamente si es necesario
        if (cuestionario.value.ordenAleatorio) {
          questions.value = questions.value.sort(() => Math.random() - 0.5);
        }

        // Establecer la fecha y hora de inicio del cuestionario
        startTime.value = new Date();
      } else {
        errorMessage.value = 'Cuestionario no encontrado';
      }
    } else {
      errorMessage.value = 'ID del cuestionario no válido';
    }
  } catch (error) {
    errorMessage.value = 'Error al obtener los datos del cuestionario';
    console.error("Error al obtener los datos del cuestionario: ", error);
  }
};
// Función para avanzar a la siguiente pregunta
const nextQuestion = () => {
  if (seAceptanRespuestas.value && !userResponses.value[questions.value[currentQuestionIndex.value].id]) {
    errorMessage.value = 'Por favor, selecciona una respuesta antes de continuar.';
    return;
  }

  errorMessage.value = ''; // Clear error message when moving to next question

  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++;
  }
};
// Función para retroceder a la pregunta anterior
const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  }
};
// Función para manejar la selección de respuesta del usuario
const handleResponseSelection = (questionId, response) => {
  if (seAceptanRespuestas.value) {
    userResponses.value[questionId] = response;
    errorMessage.value = ''; // Clear error message when a response is selected
  }
};
// Función para generar un ID aleatorio para la respuesta
const generateResponseId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
// Función para enviar las respuestas del usuario
const submitResponses = async () => {
  isSubmitting.value = true;
  const responseId = generateResponseId();
  const userId = getCurrentUserUID();
  const endTime = new Date();
  const duration = (endTime - startTime.value) / 1000; // Duración en segundos

  const responseData = {
    userId,
    questionnaireId: props.questionnaireId,
    questionnaireName: props.questionnaireName,
    responses: {},
    startTime: startTime.value,
    endTime,
    duration,
  };

  // Iterar sobre todas las preguntas y guardar las respuestas seleccionadas
  questions.value.forEach(question => {
    const response = userResponses.value[question.id];
    if (question.type === 'Radio') {
      const scoreKey = question.scoreKey || '4,3,2,1';
      const scores = scoreKey.split(',').map(Number);
      const responseIndex = question.responses.indexOf(response);
      responseData.responses[question.id] = scores[responseIndex];
    } else if (question.type === 'Binary') {
      responseData.responses[question.id] = response === question.responses[0] ? 0 : 1;
    }
  });

  try {
    await setDoc(doc(db, 'respuestas', responseId), responseData);
    console.log('Respuestas enviadas correctamente');
    emit('close');
  } catch (error) {
    console.error('Error al enviar las respuestas:', error);
    // Manejo de errores
  } finally {
    isSubmitting.value = false;
  }
};

// Computed property que verifica si todas las preguntas han sido respondidas
const allQuestionsAnswered = computed(() => {
  return questions.value.every(q => userResponses.value[q.id]);
});
// Hook de montaje para cargar los datos del cuestionario al iniciar el componente
onMounted(async () => {
  await getCuestionarioData();
});
</script>

<template>
  <div class="bg-white rounded-3xl shadow-lg p-6 w-full mx-auto">
    <div class="w-full text-center">
      <h2 class="text-4xl font-bold mb-8 text-indigo-600">{{ questionnaireName }}</h2>
    </div>
    <div v-if="errorMessage" class="flex justify-center mb-6">
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-3xl text-center">
        <p>{{ errorMessage }}</p>
      </div>
    </div>

    <!-- Contenido de las preguntas -->
    <div v-if="questions.length > 0">
      <h3 class="text-2xl font-semibold mb-6 whitespace-pre-line">
        <span class="text-indigo-600 mr-2">{{ currentQuestionIndex + 1 }}.</span>
        {{ formatQuestion(questions[currentQuestionIndex].question) }}
      </h3>

      <!-- Opciones para preguntas de tipo 'Binary' -->
      <div v-if="questions[currentQuestionIndex].type === 'Binary'" class="mb-6">
        <div v-for="(response, index) in questions[currentQuestionIndex].responses" :key="index"
             class="flex items-center mb-4 p-4 border border-gray-300 rounded-3xl hover:bg-indigo-50 transition duration-300 cursor-pointer"
             :class="{'cursor-not-allowed': !seAceptanRespuestas}"
             @click="handleResponseSelection(questions[currentQuestionIndex].id, response)">
          <input type="radio" :id="`response-${index}`" :value="response"
                 v-model="userResponses[questions[currentQuestionIndex].id]"
                 class="mr-2 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                 :disabled="!seAceptanRespuestas">
          <label :for="`response-${index}`" class="text-lg">
            <span class="font-semibold mr-2">{{ String.fromCharCode(65 + index) }}.</span>
            {{ response }}
          </label>
        </div>
      </div>

      <!-- Opciones para preguntas de tipo 'Radio' -->
      <div v-if="questions[currentQuestionIndex].type === 'Radio'" class="mb-6">
        <div v-for="(response, index) in questions[currentQuestionIndex].responses" :key="index"
             class="flex items-center mb-4 p-4 border border-gray-300 rounded-3xl hover:bg-indigo-50 transition duration-300 cursor-pointer"
             :class="{'cursor-not-allowed': !seAceptanRespuestas}"
             @click="handleResponseSelection(questions[currentQuestionIndex].id, response)">
          <input type="radio" :id="`response-${index}`" :value="response"
                 v-model="userResponses[questions[currentQuestionIndex].id]"
                 class="mr-2 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                 :disabled="!seAceptanRespuestas">
          <label :for="`response-${index}`" class="text-lg">
            <span class="font-semibold mr-2">{{ String.fromCharCode(65 + index) }}.</span>
            {{ response }}
          </label>
        </div>
      </div>

      <!-- Navegación entre preguntas -->
      <div class="flex justify-between items-center mt-6 space-x-4">
        <button @click="previousQuestion" :disabled="currentQuestionIndex === 0"
                class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-full shadow-md transition duration-300">
          <i class="fas fa-arrow-left mr-2"></i>
          Anterior
        </button>

        <!-- Indicador de número de pregunta actual -->
        <div class="bg-pink-100 text-indigo-800 px-4 py-2 rounded-full font-semibold">
          Pregunta {{ currentQuestionIndex + 1 }} de {{ questions.length }}
        </div>

        <!-- Botón para ir a la siguiente pregunta -->
        <button v-if="currentQuestionIndex < questions.length - 1" @click="nextQuestion"
                class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-full shadow-md transition duration-300">
          Siguiente
          <i class="fas fa-arrow-right ml-2"></i>
        </button>

        <!-- Botón para enviar respuestas -->
        <button v-else
                :disabled="!allQuestionsAnswered || !seAceptanRespuestas || isSubmitting"
                @click="submitResponses"
                class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full shadow-md disabled:opacity-50 transition duration-300">
          <span v-if="isSubmitting" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                 viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Enviando...
          </span>
          <span v-else>Enviar</span>
        </button>
      </div>
    </div>

    <!-- Mensaje de carga mientras se obtienen las preguntas -->
    <div v-else class="text-center">
      <p class="text-gray-500 text-xl mb-4">Cargando preguntas disponibles...</p>
      <div class="flex justify-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.cursor-not-allowed {
  cursor: not-allowed;
}
</style>
