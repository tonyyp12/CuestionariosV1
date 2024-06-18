// services/authService.js
// Importaciones de Firebase y funciones necesarias
import { auth, db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// Función para obtener el UID del usuario actual
export const getCurrentUserUID = () => {
    const user = auth.currentUser; 
    return user ? user.uid : null;
};
// Función para obtener los datos del usuario a partir de su UID
export const getUserData = async (uid) => { 
    const userDoc = doc(db, 'users', uid); // Crea una referencia al documento del usuario en la colección 'users'
    const userSnapshot = await getDoc(userDoc); // Obtiene el documento del usuario desde Firestore

    if (userSnapshot.exists()) { // Verifica si el documento del usuario existe
        return userSnapshot.data(); // Devuelve los datos del usuario
    } else {
        throw new Error('No such document!'); // Lanza un error si el documento del usuario no existe
    }
};
// Función para cerrar sesión del usuario
export const logout = async () => {
    try {
        await signOut(auth); // Cierra sesión del usuario utilizando la función signOut de Firebase Auth
    } catch (error) {
        console.error('Error al cerrar sesión:', error); // Registra un mensaje de error en la consola si ocurre un error al cerrar sesión
        throw error;
    }
};
