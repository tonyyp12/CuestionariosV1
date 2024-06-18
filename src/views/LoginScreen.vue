<script setup>
import {ref} from 'vue';
import {Eye, EyeOff} from 'lucide-vue-next';
import {signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider} from 'firebase/auth';
import {useRouter} from 'vue-router';
import {auth, db} from '@/services/firebase'; // Importar instancias de autenticación y base de datos de Firebase
import {getDoc, doc} from 'firebase/firestore'; // Importar métodos para obtener documentos de Firestore
import PasswordRecoveryDialog from '@/dialogs/PasswordRecoveryDialog.vue'; // Importar componente de diálogo para recuperación de contraseña
// Variables reactivas
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);
const router = useRouter();
const showPasswordRecoveryDialog = ref(false);
// Función para alternar la visibilidad de la contraseña
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};
// Función para iniciar sesión con correo electrónico y contraseña
const login = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    const user = userCredential.user;
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().role === 'admin') {
      if (userDoc.data().enabled) {
        router.push('/dashboard'); // Redirigir al dashboard si es administrador y está habilitado
      } else {
        await auth.signOut();
        errorMessage.value = 'Usuario administrador deshabilitado. Contacta al soporte.';
      }
    } else {
      router.push('/surveys'); // Redirigir a surveys si no es administrador
    }
  } catch (error) {
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage.value = 'Correo electrónico inválido.';
        break;
      case 'auth/user-disabled':
        errorMessage.value = 'Usuario deshabilitado.';
        break;
      case 'auth/user-not-found':
        errorMessage.value = 'Usuario no encontrado.';
        break;
      case 'auth/wrong-password':
        errorMessage.value = 'Contraseña incorrecta.';
        break;
      default:
        errorMessage.value = 'Error al iniciar sesión. Inténtalo de nuevo.';
        break;
    }
  } finally {
    isLoading.value = false; // Restablecer la variable isLoading a false
  }
};
// Función para iniciar sesión con Google
const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await auth.signOut();
      errorMessage.value = 'Acceso denegado. Por favor, regístrate primero.';
    } else {
      router.push('/surveys'); // Redirigir a surveys si el usuario existe
    }
  } catch (error) {
    console.error('Error al iniciar sesión con Google:', error);
    errorMessage.value = 'Error al iniciar sesión con Google. Inténtalo de nuevo.';
  }
};
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-900">
    <div class="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-lg">
      <h1 class="mb-6 text-3xl font-bold text-center text-white">Iniciar sesión</h1>
      <form @submit.prevent="login">
        <div class="mb-4">
          <label class="block mb-2 text-sm font-medium text-gray-400">Correo electrónico</label>
          <!-- Formulario para iniciar sesión -->
          <input
              v-model="email"
              type="email"
              placeholder="Ingresa tu correo electrónico"
              class="w-full px-3 py-3 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
          />
          <!-- Entrada de correo electrónico -->
        </div>
        <div class="mb-2">
          <label class="block mb-2 text-sm font-medium text-gray-400">Contraseña</label>
          <div class="relative">
            <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Ingresa tu contraseña"
                class="w-full px-3 py-3 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
            />
            <span @click="togglePasswordVisibility"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer">
              <component :is="showPassword ? EyeOff : Eye" class="w-5 h-5 text-gray-500 hover:text-gray-300"/>
            </span>
          </div>
        </div>
        <!-- Enlace para recuperar contraseña -->
        <div class="mb-6 text-right">
          <span @click="showPasswordRecoveryDialog = true" class="text-sm text-pink-500 hover:underline cursor-pointer">¿Olvidaste tu contraseña?</span>
        </div>
        <div class="mb-4">
          <button
              type="submit"
              class="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              :disabled="isLoading"
          >
            <!-- Botón para iniciar sesión -->
            <span v-if="isLoading" class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.963 7.963 0 014 12H0c0 3.042 1.135 5.824 3 7.937l3-2.646z"></path>
              </svg>
              Cargando...
            </span>
            <span v-else>Iniciar sesión</span>
          </button>
        </div>
        <div v-if="errorMessage" class="mt-4 text-red-500 text-center">{{ errorMessage }}</div>
        <div class="flex items-center justify-between mt-4">
          <span class="flex-1 border-t border-gray-600"></span>
          <span class="mx-2 text-gray-400">o</span>
          <span class="flex-1 border-t border-gray-600"></span>
        </div>
        <div class="mt-4">
          <button
              type="button"
              class="w-full py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
              @click="loginWithGoogle"
          >
            Iniciar sesión con Google
          </button>
        </div>
      </form>
      <!-- Enlace para registrarse -->
      <div class="mt-4 text-center">
        <p class="text-gray-400">
          ¿No tienes cuenta?
          <router-link to="/register" class="text-blue-500 hover:underline">Regístrate aquí</router-link>
        </p>
      </div>
    </div>
  </div>
  <PasswordRecoveryDialog v-if="showPasswordRecoveryDialog" @close="showPasswordRecoveryDialog = false"/>
</template>

<style scoped>
</style>