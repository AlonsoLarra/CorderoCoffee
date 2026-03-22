export const COPY = {
  brand: {
    tagline: "Café de especialidad. Sin esperar.",
    intro:
      "Ordená en línea, elegí tu hora de recogida y seguí tu pedido en tiempo real. Tu café, listo al llegar.",
  },
  actions: {
    startOrder: "Hacer pedido",
    openAdmin: "Ir a administración",
    backToHome: "Volver al inicio",
    accessAccount: "Entrar o crear cuenta",
    continueAsGuest: "Continuar como invitado",
    signOut: "Cerrar sesión",
  },
  auth: {
    title: "Acceso a Cordero",
    subtitle: "Iniciá sesión o creá una cuenta para guardar tu historial y favoritos.",
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    loginButton: "Iniciar sesión",
    registerButton: "Crear cuenta",
    successRegister: "Cuenta creada. Revisá tu correo para confirmar el acceso.",
    errorInvalidCredentials: "No pudimos iniciar sesión con esos datos.",
    errorGeneric: "Ocurrió un error. Intentá de nuevo.",
    errorMissingFields: "Completá correo y contraseña para continuar.",
    loggedInPrefix: "Sesión activa como",
  },
  ordering: {
    title: "Tu pedido",
    description: "Aquí construiremos el flujo completo de menú, carrito y checkout para cliente y guest.",
    placeholder: "Pendiente: menú dinámico con categorías, modificadores y persistencia de carrito.",
  },
  admin: {
    title: "Panel de administración",
    description: "Aquí construiremos la cola de pedidos en vivo y la gestión de menú.",
    placeholder: "Pendiente: autenticación por rol, cola en tiempo real y acciones de estado.",
    queueTitle: "Cola de pedidos",
    queueDescription: "Visualizá prioridad y mové pedidos por estado con acciones rápidas.",
    emptyQueue: "No hay pedidos en cola por ahora.",
  },
} as const;
