<script setup>
import { ref } from 'vue';
import { sendPasswordResetEmail } from 'firebase/auth'; // Importa la función para enviar un correo de restablecimiento de contraseña de Firebase
import { auth } from '@/services/firebase'; // Importa la instancia de autenticación de Firebase
import { getAuth } from 'firebase/auth'; // Importa la función para obtener la instancia de autenticación de Firebase

// Definir referencias reactivas para manejar el estado del componente
const email = ref(''); // Almacena el correo electrónico ingresado por el usuario
const isLoading = ref(false); // Indica si la solicitud de restablecimiento de contraseña está en proceso
const successMessage = ref(''); // Almacena el mensaje de éxito si se envía el correo de restablecimiento
const errorMessage = ref(''); // Almacena el mensaje de error si hay problemas al enviar el correo
const emit = defineEmits(['close']); // Define un evento personalizado 'close' para cerrar el diálogo

// Configurar el idioma de la instancia de autenticación a español
const authInstance = getAuth();
authInstance.languageCode = 'es';
// Función para emitir el evento 'close' y cerrar el diálogo
const handleClose = () => {
  emit('close');
};

// Función asincrónica para manejar el restablecimiento de la contraseña
const resetPassword = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await sendPasswordResetEmail(auth, email.value);
    successMessage.value = 'Se ha enviado un correo para restablecer tu contraseña.';
  } catch (error) {
    console.error(error);
    errorMessage.value = 'Error al enviar el correo de restablecimiento. Verifica que el correo sea válido.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
   <!-- Contenedor del diálogo modal -->
  <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" @click.self="handleClose">
    <div class="bg-gray-900 text-white p-8 rounded-lg shadow-lg relative w-[400px]">
      <button class="absolute top-2 right-2 text-gray-400 hover:text-gray-200 focus:outline-none" @click="handleClose">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <h2 class="text-2xl font-semibold mb-6 text-center">Recuperar Contraseña</h2>
      <div class="mb-6">
        <input type="email" v-model="email"
               class="w-full px-4 py-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
               placeholder="Correo electrónico">
      </div>
      <!-- Botón para enviar la solicitud de restablecimiento -->
      <div class="flex justify-center space-x-4">
        <button
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 flex items-center"
            @click="resetPassword" :disabled="isLoading">
          <svg v-if="isLoading" class="w-5 h-5 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
               viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Enviar
        </button>
      </div>
      <div v-if="successMessage" class="mt-4 text-green-500 text-center">{{ successMessage }}</div>
      <div v-if="errorMessage" class="mt-4 text-red-500 text-center">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<style scoped>
</style>
