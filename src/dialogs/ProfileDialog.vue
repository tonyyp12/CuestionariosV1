<script setup>
import { ref, onMounted } from 'vue';
import { XIcon, LogOutIcon, Loader2Icon, KeyIcon, UserPlusIcon, EyeIcon, EyeOffIcon } from 'lucide-vue-next';
import { createUserWithEmailAndPassword, updatePassword, updateCurrentUser } from 'firebase/auth';
import { doc, setDoc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore'; // Importa funciones de Firestore
import { auth, db } from '@/services/firebase'; // Importa instancias de autenticación y base de datos de Firebase

const emit = defineEmits(['close', 'logout']);

const props = defineProps({
  username: {
    type: String,
    required: true
  }
});   // Define las propiedades del componente, en este caso el nombre de usuario

const handleClose = () => {
  emit('close');
};

// Función para emitir el evento 'logout' y cerrar la sesión del usuario
const handleLogout = () => {
  emit('logout');
};

// Estados reactivos para manejar el formulario de agregar usuario, cambiar contraseña y otros
const showAddUserForm = ref(false);
const showChangePasswordForm = ref(false);
const users = ref([]);
const newUser = ref({
  name: '',
  email: '',
  password: ''
}); // Almacena los datos del nuevo usuario
const currentPassword = ref('');
const newPassword = ref('');
const isLoading = ref(false);
// Estados para mostrar u ocultar las contraseñas
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showNewUserPassword = ref(false);
// Función para capitalizar las palabras de una cadena
const capitalizeWords = (str) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Función asincrónica para agregar un nuevo usuario
const addUser = async () => {
  try {
    isLoading.value = true;
    const currentUser = auth.currentUser;

    // Crea un nuevo usuario con correo y contraseña
    const { user } = await createUserWithEmailAndPassword(auth, newUser.value.email, newUser.value.password);
    const userId = user.uid;

    const capitalizedName = capitalizeWords(newUser.value.name);

    // Guarda los datos del nuevo usuario en Firestore
    await setDoc(doc(db, 'users', userId), {
      name: capitalizedName,
      email: newUser.value.email,
      role: 'admin',
      enabled: true
    });

    newUser.value = { name: '', email: '', password: '' };
    showAddUserForm.value = false;

    // Restaurar el usuario autenticado actual
    await updateCurrentUser(auth, currentUser);
  } catch (error) {
    console.error('Error adding user:', error);
  } finally {
    isLoading.value = false;
  }
};

// Función asincrónica para actualizar el estado de un usuario
const updateUserStatus = async (user) => {
  try {
    await updateDoc(doc(db, 'users', user.id), {
      enabled: user.enabled
    });
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

// Función para obtener la lista de usuarios
const fetchUsers = () => {
  // Consulta para obtener los usuarios con rol de administrador
  const adminUsersQuery = query(collection(db, 'users'), where('role', '==', 'admin'));

  onSnapshot(adminUsersQuery, (snapshot) => {
    users.value = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => user.id !== auth.currentUser.uid); // Filtra el usuario actual de la lista
  });
};

// Función asincrónica para cambiar la contraseña del usuario actual
const changePassword = async () => {
  try {
    isLoading.value = true;

    const user = auth.currentUser;
    if (user) {
      await updatePassword(user, newPassword.value);

      // Actualizar la contraseña en Firestore (opcional, dependiendo de si almacenas la contraseña en Firestore)
      await updateDoc(doc(db, 'users', user.uid), {
        password: newPassword.value
      });

      // Limpia los datos de las contraseñas y oculta el formulario
      showChangePasswordForm.value = false;
      currentPassword.value = '';
      newPassword.value = '';
    }
  } catch (error) {
    console.error('Error changing password:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <!-- Contenedor principal del modal -->
  <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" @click.self="handleClose">
    <div class="bg-gray-800 text-white p-6 rounded-lg shadow-lg relative w-[400px]">
      <button class="absolute top-2 right-2 text-gray-400 hover:text-gray-200 focus:outline-none" @click="handleClose">
        <XIcon class="w-5 h-5" />
      </button>
      <!-- Información del perfil del usuario -->
      <div class="flex flex-col items-center mb-6">
        <img src="@/assets/img/programador.png" alt="Perfil" class="w-24 h-24 rounded-full mb-2">
        <div class="flex items-center">
          <h1 class="text-xl font-bold mr-2">{{ username }}</h1>
          <button class="focus:outline-none" @click="handleLogout">
            <LogOutIcon class="w-5 h-5 text-gray-400 hover:text-gray-200" />
          </button>
        </div>
      </div>

      <!-- Botones para mostrar formularios de agregar usuario y cambiar contraseña -->
      <div class="flex justify-center mb-6">
        <button class="w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50 ml-4" @click="showAddUserForm = !showAddUserForm">
          <UserPlusIcon class="w-5 h-5" />
        </button>
        <button class="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 ml-4" @click="showChangePasswordForm = !showChangePasswordForm">
          <KeyIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Lista de usuarios administradores -->
      <div v-if="users.length > 0" class="mt-6">
        <h2 class="text-lg font-bold mb-2">Usuarios Administradores</h2>
        <div v-for="user in users" :key="user.id" class="flex items-center justify-between mb-2 p-3 bg-gray-700 rounded-lg">
          <span>{{ user.name }}</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="user.enabled" class="sr-only peer" @change="updateUserStatus(user)">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-unchecked:bg-gray-400 peer-unchecked:after:border-gray-400"></div>
          </label>
        </div>
      </div>

      <!-- Formulario para agregar nuevo usuario -->
      <div v-if="showAddUserForm" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" @click.self="showAddUserForm = false">
        <div class="bg-gray-700 p-6 rounded-xl w-80">
          <h2 class="text-xl font-bold mb-6 text-center">Agregar Nuevo Usuario</h2>
          <div class="mb-6 relative">
            <input type="text" v-model="newUser.name" @input="newUser.name = capitalizeWords(newUser.name)" class="w-full px-3 py-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Nombre">
          </div>
          <div class="mb-6 relative">
            <input type="email" v-model="newUser.email" class="w-full px-3 py-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Correo">
          </div>
          <div class="mb-6 relative">
            <input :type="showNewUserPassword ? 'text' : 'password'" v-model="newUser.password" class="w-full px-3 py-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Contraseña">
            <button @click="showNewUserPassword = !showNewUserPassword" type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 focus:outline-none">
              <component :is="showNewUserPassword ? EyeOffIcon : EyeIcon" class="w-5 h-5" />
            </button>
          </div>
          <div class="flex justify-center space-x-4">
            <button class="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50" @click="showAddUserForm = false">Cancelar</button>
            <button class="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 flex items-center" @click="addUser" :disabled="isLoading">
              <Loader2Icon v-if="isLoading" class="w-5 h-5 mr-2 animate-spin" />
              Agregar
            </button>
          </div>
        </div>
      </div>

      <!-- Formulario para cambiar la contraseña -->
      <div v-if="showChangePasswordForm" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" @click.self="showChangePasswordForm = false">
        <div class="bg-gray-700 p-6 rounded-xl w-80">
          <h2 class="text-xl font-bold mb-6 text-center">Cambiar Contraseña</h2>
          <div class="mb-6 relative">
            <input :type="showNewPassword ? 'text' : 'password'" v-model="newPassword" class="w-full px-3 py-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Nueva Contraseña">
            <button @click="showNewPassword = !showNewPassword" type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 focus:outline-none">
              <component :is="showNewPassword ? EyeOffIcon : EyeIcon" class="w-5 h-5" />
            </button>
          </div>
          <div class="flex justify-center space-x-4">
            <button class="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50" @click="showChangePasswordForm = false">Cancelar</button>
            <button class="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 flex items-center" @click="changePassword" :disabled="isLoading">
              <Loader2Icon v-if="isLoading" class="w-5 h-5 mr-2 animate-spin" />
              Cambiar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
