export const adminTagsCopy = {
  title: 'Etiquetas globales',
  description: 'Las etiquetas globales están disponibles para todas las personas usuarias.',
  labels: {
    newTag: 'Nueva etiqueta global',
    name: 'Etiqueta',
    count: 'Notas',
    rename: 'Renombrar etiqueta',
  },
  placeholders: {
    newTag: 'Nombre de la etiqueta',
  },
  actions: {
    create: 'Agregar',
    rename: 'Renombrar',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    retry: 'Reintentar',
  },
  states: {
    loading: 'Cargando etiquetas',
    saving: 'Guardando',
  },
  empty: {
    title: 'No hay etiquetas globales',
    message: 'Crea la primera etiqueta global para compartirla.',
  },
  confirm: {
    deleteTitle: 'Eliminar etiqueta global',
    deleteMessage:
      'Las notas conservarán el nombre como etiqueta privada. ¿Quieres eliminar esta etiqueta global?',
  },
  errors: {
    load: 'No se pudieron cargar las etiquetas globales. Intenta nuevamente.',
    save: 'No se pudo guardar la etiqueta. Intenta nuevamente.',
    delete: 'No se pudo eliminar la etiqueta. Intenta nuevamente.',
    duplicate: 'Ya existe una etiqueta global con ese nombre.',
    invalid: 'El nombre de la etiqueta no es válido.',
    generic: 'Ocurrió un error. Intenta nuevamente.',
  },
} as const
