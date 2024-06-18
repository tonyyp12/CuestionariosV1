<script setup>
import { ref, watch } from 'vue';
import { auth, db } from '@/services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { useRouter } from 'vue-router';
import { Eye, EyeOff } from 'lucide-vue-next';

// Declaración de variables reactivas para almacenar los datos del formulario y estados
const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const audience = ref(''); // Cambiado a Audiencia (rol)
const dob = ref('');
const gender = ref('');
const cycle = ref(''); // Nuevo campo ciclo escolar
const showPassword = ref(false); // Estado para mostrar/ocultar contraseña
const showConfirmPassword = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);
const isStudent = ref(false); // Estado para verificar si el rol es Estudiante
 
const router = useRouter();

// Función para capitalizar cada palabra del nombre
const capitalizeName = (value) => {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
};

watch(name, (newValue) => {
  name.value = capitalizeName(newValue);
});

// Actualizar la variable isStudent cuando cambia audience
watch(audience, (newAudience) => {
  isStudent.value = newAudience === 'Estudiante';
});
// Función asincrónica para registrar un nuevo usuario
const register = async () => {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Las contraseñas no coinciden.";
    return;
  }
  // Validación de campos obligatorios
  if (!name.value || !email.value || !password.value || !confirmPassword.value || !audience.value || !dob.value || !gender.value || (isStudent.value && !cycle.value)) {
    errorMessage.value = "Todos los campos son obligatorios.";
    return;
  }

  let role = audience.value;

  try {
    isLoading.value = true;
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const user = userCredential.user;
    // Datos del usuario para guardar en Firestore
    const userData = {
      name: name.value,
      email: email.value,
      role: role,
      dob: dob.value,
      gender: gender.value,
    };

    if (isStudent.value) {
      userData.cycle = cycle.value;
    }

    await setDoc(doc(db, 'users', user.uid), userData); // Guardar datos del usuario en Firestore

    router.push('/surveys');
  } catch (error) {
    // Manejo de errores de autenticación
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage.value = 'El correo electrónico ya está en uso.';
        break;
      case 'auth/invalid-email':
        errorMessage.value = 'Correo electrónico inválido.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage.value = 'Operación no permitida.';
        break;
      case 'auth/weak-password':
        errorMessage.value = 'La contraseña es demasiado débil.';
        break;
      default:
        errorMessage.value = 'Error al registrar. Inténtalo de nuevo.';
        break;
    }
  } finally {
    isLoading.value = false;
  }
};
// Función para alternar la visibilidad de la contraseña
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value;
};
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-900">
    <div class="w-full max-w-2xl p-8 bg-gray-800 rounded-lg shadow-lg card">
      <h1 class="mb-8 text-3xl font-bold text-center text-white">Registro</h1>
      <form @submit.prevent="register" class="grid grid-cols-2 gap-8">
        <div>
          <label for="name" class="block mb-2 text-sm font-medium text-gray-300">Nombre completo</label>
          <input
              id="name"
              v-model="name"
              type="text"
              class="w-full px-4 py-3 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 input-field"
              required
          />
        </div>
        <div>
          <label for="email" class="block mb-2 text-sm font-medium text-gray-300">Correo electrónico</label>
          <input
              id="email"
              v-model="email"
              type="email"
              class="w-full px-4 py-3 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 input-field"
              required
          />
        </div>
        <!-- Campo de contraseña con opción de mostrar/ocultar -->
        <div class="relative">
          <label for="password" class="block mb-2 text-sm font-medium text-gray-300">Contraseña</label>
          <div class="relative">
            <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="w-full px-4 py-3 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 input-field"
                required
            />
            <span @click="togglePasswordVisibility" class="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer">
              <component :is="showPassword ? EyeOff : Eye" class="w-5 h-5 text-gray-500 hover:text-gray-300" />
            </span>
          </div>
        </div>
        <div class="relative">
          <label for="confirmPassword" class="block mb-2 text-sm font-medium text-gray-300">Confirmar contraseña</label>
          <div class="relative">
            <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="w-full px-4 py-3 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 input-field"
                required
            />
            <span @click="toggleConfirmPasswordVisibility" class="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer">
              <component :is="showConfirmPassword ? EyeOff : Eye" class="w-5 h-5 text-gray-500 hover:text-gray-300" />
            </span>
          </div>
        </div>
         <!-- Campo de fecha de nacimiento -->
        <div class="relative">
          <label for="dob" class="block mb-2 text-sm font-medium text-gray-300">Fecha de nacimiento</label>
          <input
              id="dob"
              v-model="dob"
              type="date"
              class="w-full px-4 py-3 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 input-field"
              required
          />
        </div>
        <div>
          <!-- Campo de selección de audiencia (rol) -->
          <label for="audience" class="block mb-2 text-sm font-medium text-gray-300">Audiencia</label>
          <select
              id="audience"
              v-model="audience"
              class="w-full px-4 py-3 text-gray-900 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 input-field"
              required
          >
            <option value="" disabled>Seleccionar Rol</option>
            <option value="Estudiante">Estudiante</option>
            <option value="Docente">Docente</option>
            <option value="Psicólogo">Psicólogo</option>
          </select>
        </div>
        <!-- Campo de selección de ciclo escolar, visible solo si es estudiante -->
        <div v-if="isStudent" class="relative">
          <label for="cycle" class="block mb-2 text-sm font-medium text-gray-300">Ciclo Escolar</label>
          <select
              id="cycle"
              v-model="cycle"
              class="w-full px-4 py-3 text-gray-900 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 input-field"
              required
          >
            <option value="" disabled>Seleccionar Semestre</option>
            <option v-for="i in 12" :key="i" :value="i">{{ i }}</option>
          </select>
        </div>
        <div>
          <!-- Campo de selección de género -->
          <label for="gender" class="block mb-2 text-sm font-medium text-gray-300">Sexo</label>
          <select
              id="gender"
              v-model="gender"
              class="w-full px-4 py-3 text-gray-900 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 input-field"
              required
          >
            <option value="" disabled>Seleccionar sexo</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <!-- Botón para enviar el formulario -->
        <div class="col-span-2">
          <button
              type="submit"
              class="w-full py-3 text-white transition-colors duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              :disabled="isLoading"
          >
            <span v-if="isLoading" class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.963 7.963 0 014 12H0c0 3.042 1.135 5.824 3 7.937l3-2.646z"></path>
              </svg>
              Cargando...
            </span>
            <span v-else>Guardar</span>
          </button>
        </div>
      </form>
      <div v-if="errorMessage" class="mt-4 text-red-500 text-center">{{ errorMessage }}</div>
      <!-- Enlace para redirigir a la página de inicio de sesión si ya tiene cuenta -->
      <div class="mt-8 text-center">
        <p class="text-gray-400">
          ¿Ya tienes cuenta?
          <router-link to="/login" class="text-blue-500 transition-colors duration-200 hover:text-blue-400 hover:underline">Inicia sesión aquí</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  min-height: 600px;
}

.input-field {
  height: 48px;
}
</style>
