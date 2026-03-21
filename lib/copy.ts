export const COPY = {
  brand: {
    tagline: "Cafe artesanal con alma de barrio.",
    intro:
      "Pide en linea, agenda tu hora de recoleccion y sigue tu bebida en tiempo real con una experiencia calida y simple.",
  },
  actions: {
    startOrder: "Hacer pedido",
    openAdmin: "Ir a administracion",
    backToHome: "Volver al inicio",
    accessAccount: "Entrar o crear cuenta",
    continueAsGuest: "Continuar como invitado",
    signOut: "Cerrar sesion",
  },
  auth: {
    title: "Acceso a Cordero",
    subtitle: "Inicia sesion o crea una cuenta para guardar tu historial y favoritos.",
    emailLabel: "Correo electronico",
    passwordLabel: "Contrasena",
    loginButton: "Iniciar sesion",
    registerButton: "Crear cuenta",
    successRegister: "Cuenta creada. Revisa tu correo para confirmar tu acceso.",
    errorInvalidCredentials: "No pudimos iniciar sesion con esos datos.",
    errorGeneric: "Ocurrio un error. Intenta de nuevo.",
    errorMissingFields: "Completa correo y contrasena para continuar.",
    loggedInPrefix: "Sesion activa como",
  },
  ordering: {
    title: "Tu pedido",
    description: "Aqui construiremos el flujo completo de menu, carrito y checkout para cliente y guest.",
    placeholder: "Pendiente: menu dinamico con categorias, modificadores y persistencia de carrito.",
  },
  admin: {
    title: "Panel de administracion",
    description: "Aqui construiremos la cola de pedidos en vivo y la gestion de menu.",
    placeholder: "Pendiente: autenticacion por rol, cola en tiempo real y acciones de estado.",
    queueTitle: "Cola de pedidos",
    queueDescription: "Visualiza prioridad y mueve pedidos por estado con acciones rapidas.",
    emptyQueue: "No hay pedidos en cola por ahora.",
  },
} as const;
