<script setup>
import { ref, onMounted } from 'vue'; // Importa ref y onMounted de Vue
import { useRouter } from 'vue-router'; // Importa useRouter de vue-router para navegación
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Importa funciones de autenticación de Firebase
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'; // Importa funciones de Firestore de Firebase
import ProfileDialog from '@/dialogs/ProfileDialog.vue'; // Importa el componente de diálogo de perfil
import { logout } from '@/services/authService'; // Importa la función de cierre de sesión

const router = useRouter(); // Inicializa el router para navegar entre rutas
const profileDialogOpen = ref(false);  // Estado reactivo para controlar la visibilidad del diálogo de perfil
const loggedInUser = ref(null); // Estado reactivo para almacenar los datos del usuario autenticado

onMounted(() => {
  const auth = getAuth(); // Obtiene la instancia de autenticación de Firebase
  onAuthStateChanged(auth, (user) => { // Escucha los cambios en el estado de autenticación
    if (user) {
      // Si el usuario está autenticado, obtiene la referencia al documento del usuario en Firestore
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      onSnapshot(userRef, (doc) => { // Escucha los cambios en el documento del usuario
        if (doc.exists()) {
          loggedInUser.value = doc.data(); // Actualiza el estado del usuario autenticado con los datos del documento
        }
      });
    } else {
      loggedInUser.value = null; // Si no hay usuario autenticado, establece el estado del usuario en null
    }
  });
});

const handleLogout = async () => {
  try {
    await logout(); // Llama a la función de cierre de sesión
    router.push('/login'); // Redirige al usuario a la página de inicio de sesión
  } catch (error) {
    console.error('Error al cerrar sesin:', error); // Manejo de errores en el cierre de sesión
  }
};

const openProfileDialog = () => {
  profileDialogOpen.value = true; // Abre el diálogo de perfil estableciendo su estado en true
};

const closeProfileDialog = () => {
  profileDialogOpen.value = false; // Cierra el diálogo de perfil estableciendo su estado en false
};
</script>

<template>
  <div class="relative">
    <img
        src="@/assets/img/programador.png"
        alt="Perfil"
        class="w-10 h-10 rounded-full cursor-pointer"
        @click="openProfileDialog"
    />
    <ProfileDialog
        v-if="profileDialogOpen && loggedInUser"  
        :username="loggedInUser.name"
        @close="closeProfileDialog"
        @logout="handleLogout"
    />
  </div>
</template>

<style scoped>
</style>
