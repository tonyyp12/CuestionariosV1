// Importaciones de las funciones necesarias de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Configuración de Firebase
const firebaseConfig = {
    // Configuración específica del proyecto Firebase
    apiKey: "AIzaSyCZhzK7HASL8Lh6T3p3meB6GZUMcioRHEo",
    authDomain: "cuestionariositm-c1084.firebaseapp.com",
    projectId: "cuestionariositm-c1084",
    storageBucket: "cuestionariositm-c1084.appspot.com",
    messagingSenderId: "955513172382",
    appId: "1:955513172382:web:6ca6dea639e868f5a9e68f",
    measurementId: "G-ECS2EW370C"
};
// Inicialización de la aplicación Firebase con la configuración proporcionada
const app = initializeApp(firebaseConfig);
// Configuración y obtención de Analytics para la aplicación
const analytics = getAnalytics(app);
// Configuración y obtención de la instancia de Firestore para la base de datos
const db = getFirestore(app);
// Configuración y obtención de la instancia de Auth para la autenticación de usuarios
const auth = getAuth(app);
// Exporta las instancias de Firestore y Auth para ser utilizadas en otras partes de la aplicación
export { db, auth };
