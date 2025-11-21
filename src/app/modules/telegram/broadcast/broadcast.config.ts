export const BROADCAST_CONFIG = {
  // Настройки очереди
  CONCURRENCY: 25, // Количество одновременных обработчиков
  BATCH_SIZE: 5000, // Размер батча для загрузки ID из БД
  
  // Retry настройки
  MAX_ATTEMPTS: 3,
  BACKOFF_DELAY: 2000, // 2 секунды базовая задержка
  
  // RETRY_AFTER настройки
  MAX_RETRY_ATTEMPTS: 3, // Максимальное количество попыток для RETRY_AFTER
  RETRY_BUFFER_SECONDS: 5, // Дополнительная задержка к retry_after для безопасности
  
  // Очистка очереди
  REMOVE_ON_COMPLETE: 100,
  REMOVE_ON_FAIL: 50,
  
  // Мониторинг
  STALLED_INTERVAL: 30 * 1000, // 30 секунд
  MAX_STALLED_COUNT: 1,
} as const; 