<script setup>
import { ref, onMounted } from 'vue';
import { signOut } from 'firebase/auth'; // Importar función para cerrar sesión de Firebase
import { useRouter } from 'vue-router';
import { User, LogOut, FileText, Send } from 'lucide-vue-next';
import QuestionnaireList from '@/components/QuestionnaireList.vue'; // Importar componente de lista de cuestionarios
import SurveyResponseDialog from '@/dialogs/SurveyResponseDialog.vue'; // Importar componente de diálogo de respuesta de cuestionario
import icon from '@/assets/img/programador.png';
import { getCurrentUserUID, getUserData } from '@/services/authService'; // Importar funciones del servicio de autenticación personalizado
import { auth, db } from '@/services/firebase'; // Importar instancias de autenticación y base de datos de Firebase
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

const router = useRouter();
// Variables reactivas para almacenar datos del usuario y cuestionarios
const userName = ref("");
const userRole = ref("");
const userCycle = ref(null);
const userData = ref({});
// Función para cerrar sesión
const logout = async () => {
  try {
    await signOut(auth);
    router.push('/login');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};
// Variables reactivas para almacenar cuestionarios y respuestas del usuario
const pendingQuestionnaires = ref([]);
const userResponses = ref([]);
// Estado de la pestaña activa y visibilidad del diálogo de encuesta
const activeTab = ref('pending');

const showSurveyDialog = ref(false);
const selectedQuestionnaireId = ref(null);
const selectedQuestionnaireName = ref("");
// Función para abrir el diálogo de encuesta y cargar datos del cuestionario
const openSurveyDialog = async (questionnaireId) => {
  console.log('ID del cuestionario seleccionado:', questionnaireId);
  selectedQuestionnaireId.value = questionnaireId;

  const cuestionarioDoc = await getDoc(doc(db, "cuestionarios", questionnaireId));
  if (cuestionarioDoc.exists()) {
    selectedQuestionnaireName.value = cuestionarioDoc.data().nombre;
  }

  showSurveyDialog.value = true;
};
// Función ejecutada al montar el componente
onMounted(async () => {
  const userUID = getCurrentUserUID();

  if (userUID) {
    try {
      const userDataResult = await getUserData(userUID); // Obtener datos del usuario de Firestore
      userName.value = userDataResult.name;
      userRole.value = userDataResult.role;
      userCycle.value = userDataResult.cycle;

      // Guardar datos adicionales del usuario
      userData.value = userDataResult;

      const questionnairesRef = collection(db, 'cuestionarios'); // Referencia a la colección de cuestionarios
      const pendingQuery = query(questionnairesRef, where('estado', '==', true));
       // Escuchar cambios en los cuestionarios pendientes
      onSnapshot(pendingQuery, (snapshot) => {
        pendingQuestionnaires.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(q => shouldShowQuestionnaire(q));
      });

      const responsesRef = collection(db, 'respuestas');
      const userResponsesQuery = query(responsesRef, where('userId', '==', userUID));
      // Escuchar cambios en las respuestas del usuario
      onSnapshot(userResponsesQuery, (snapshot) => {
        userResponses.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }
});
// Función para determinar si se debe mostrar un cuestionario
function shouldShowQuestionnaire(questionnaire) {
  const currentDate = new Date();
  const startDate = new Date(questionnaire.fechaInicio + 'T' + questionnaire.horaInicio);

  if (currentDate < startDate) {
    return false;
  }

  // Verificar rol
  if (userRole.value === 'Estudiante') {
    if (questionnaire.audiencia !== 'Estudiante') {
      return false;
    }
    // Verificar ciclo escolar solo si no está vacío o nulo
    if (questionnaire.cicloEscolar && questionnaire.cicloEscolar !== userCycle.value) {
      return false;
    }
    // Verificar edad solo si existe
    if (questionnaire.edad && userData.value.dob) {
      const userAge = calculateAge(userData.value.dob);
      if (questionnaire.edad !== userAge) {
        return false;
      }
    }
  } else if (userRole.value === 'Docente') {
    if (questionnaire.audiencia !== 'Docente') {
      return false;
    }
    // Verificar edad solo si existe
    if (questionnaire.edad && userData.value.dob) {
      const userAge = calculateAge(userData.value.dob);
      if (questionnaire.edad !== userAge) {
        return false;
      }
    }
  } else if (userRole.value === 'Psicólogo') {
    if (questionnaire.audiencia !== 'Psicólogo') {
      return false;
    }
    // Verificar edad solo si existe
    if (questionnaire.edad && userData.value.dob) {
      const userAge = calculateAge(userData.value.dob);
      if (questionnaire.edad !== userAge) {
        return false;
      }
    }
  }

  // Verificar género solo si existe
  if (questionnaire.genero && userData.value.gender && questionnaire.genero !== userData.value.gender) {
    return false;
  }

  // Verificar frecuencia
  switch (questionnaire.frecuencia) {
    case 'diaria':
      return true;
    case 'semanal':
      return currentDate.getDay() === startDate.getDay();
    case 'mensual':
      return currentDate.getDate() === startDate.getDate();
    case 'semestral':
      const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
          (currentDate.getMonth() - startDate.getMonth());
      return monthsDiff % 6 === 0 && currentDate.getDate() === startDate.getDate();
    default:
      return false;
  }
}
// Función para calcular la edad a partir de la fecha de nacimiento
function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
</script>

<template>
  <div class="flex min-h-screen bg-gray-800 text-white">
    <div class="w-64 bg-gray-900 p-4 flex flex-col overflow-y-auto fixed inset-y-0 left-0">
      <div class="flex flex-col items-center mb-8">
        <div class="w-24 h-24 bg-white rounded-full mb-4 overflow-hidden">
          <img :src="icon" alt="Programador" class="w-full h-full object-cover"/>
        </div>
        <div class="text-center">
          <h2 class="text-xl font-semibold">{{ userName }}</h2>
          <p class="text-sm text-gray-400">{{ userRole }}</p>
        </div>
      </div>
      <nav class="flex-1">
        <ul>
          <!--
          <li class="mb-4">
            <div class="w-full text-left px-4 py-2 rounded-lg text-gray-400 flex items-center cursor-default">
              <User class="w-5 h-5 mr-2"/>
              Editar Perfil
            </div>
          </li>
          -->
          <li class="mb-4">
            <button @click="activeTab = 'pending'"
                    class="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center transition duration-200"
                    :class="{ 'bg-gray-700': activeTab === 'pending' }">
              <FileText class="w-5 h-5 mr-2"/>
              Cuestionarios
            </button>
          </li>
          <li>
            <button @click="activeTab = 'completed'"
                    class="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center transition duration-200"
                    :class="{ 'bg-gray-700': activeTab === 'completed' }">
              <Send class="w-5 h-5 mr-2"/>
              Cuestionarios Enviados
            </button>
          </li>
        </ul>
      </nav>
      <button
          @click="logout"
          class="mt-8 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center transition duration-200"
      >
        <LogOut class="w-5 h-5 mr-2"/>
        Cerrar sesión
      </button>
    </div>
    <!-- Contenido principal: mostrar lista de cuestionarios según la pestaña activa -->
    <div class="flex-1 p-8 ml-64">
      <QuestionnaireList
          v-if="activeTab === 'pending'"
          title="Cuestionarios Pendientes"
          :questionnaires="pendingQuestionnaires"
          status="pending"
          @select-questionnaire="openSurveyDialog"
      />
      <QuestionnaireList
          v-if="activeTab === 'completed'"
          title="Cuestionarios Realizados"
          :responses="userResponses"
          status="completed"
      />
    </div>
  </div>
  <!-- Diálogo de cuestionario -->
  <div v-if="showSurveyDialog" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="absolute inset-0 bg-black opacity-50"></div>
    <div class="bg-white rounded-lg p-6 z-10">
      <SurveyResponseDialog
          :questionnaire-id="selectedQuestionnaireId"
          :questionnaire-name="selectedQuestionnaireName"
          @close="showSurveyDialog = false"
      />
    </div>
  </div>
</template>

<style scoped>
</style>
