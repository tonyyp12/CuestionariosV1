// Importaciones necesarias para Vue Router y Firebase
import { createRouter, createWebHistory } from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import LoginScreen from '@/views/LoginScreen.vue';
import RegisterScreen from '@/views/RegisterScreen.vue';
import DashboardScreen from '@/views/DashboardScreen.vue';
import SurveysScreen from '@/views/SurveysScreen.vue';
import InventoryScreen from '@/views/InventoryScreen.vue';
import InventoryDetailScreen from '@/views/InventoryDetailScreen.vue';
import QuestionnaireDetailScreen from "@/views/QuestionnaireDetailScreen.vue";
// Definición de las rutas de la aplicación
const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'Dashboard', component: DashboardScreen, meta: { requiresAuth: true, role: 'admin' } },
    { path: '/login', name: 'Login', component: LoginScreen },
    { path: '/register', name: 'Register', component: RegisterScreen },
    { path: '/surveys', name: 'Surveys', component: SurveysScreen, meta: { requiresAuth: true, roles: ['Estudiante', 'Docente', 'Psicólogo'] } },
    { path: '/inventory', name: 'Inventory', component: InventoryScreen, meta: { requiresAuth: true, role: 'admin' } },
    { path: '/inventory/:id', name: 'InventoryDetail', component: InventoryDetailScreen, meta: { requiresAuth: true, role: 'admin' }, props: true },
    { path: '/questionnaire/:id', name: 'QuestionnaireDetail', component: QuestionnaireDetailScreen, meta: { requiresAuth: true, role: 'admin' }, props: true },
];
// Creación del enrutador
const router = createRouter({
    history: createWebHistory(), // Utiliza el modo de historial basado en el historial del navegador
    routes, // Establece las rutas definidas anteriormente
});
// Guardia de navegación que se ejecuta antes de cada cambio de ruta
router.beforeEach(async (to, from, next) => { 
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth); // Verifica si la ruta requiere autenticación
    const auth = getAuth(); // Obtiene la instancia de autenticación de Firebase

    try {
        await new Promise((resolve, reject) => {
            onAuthStateChanged(auth, resolve, reject); // Espera hasta que el estado de autenticación cambie
        });

        const user = auth.currentUser; // Obtiene el usuario actual autenticado

        if (requiresAuth) {
            if (!user) {
                next('/login');
            } else {
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userRole = userData.role;

                    if (to.meta.role === userRole) {
                        next();
                    } else if (to.meta.roles && to.meta.roles.includes(userRole)) {
                        next();
                    } else if (userRole === 'admin') {
                        next('/dashboard');
                    } else {
                        next('/surveys');
                    }
                } else {
                    next('/login');
                }
            }
        } else if ((to.path === '/login' || to.path === '/register') && user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userRole = userDoc.data().role;

            if (userRole === 'admin') {
                next('/dashboard');
            } else {
                next('/surveys');
            }
        } else {
            next();
        }
    } catch (error) {
        console.error('Error en el guardia de navegación:', error);
        next('/login');
    }
});
// Guardia que se ejecuta después de cada cambio de ruta
router.afterEach((to) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user && (to.path === '/login' || to.path === '/register')) {
        window.history.forward();
    }
});

export default router; // Exporta el enrutador para ser utilizado en la aplicación Vue.js
