import Airtable from 'airtable';

// Кэш для защиты от дублирования операций (5 минут)
const operationCache = new Map<string, number>();

const base = new Airtable({
  apiKey: import.meta.env.VITE_AIRTABLE_KEY
}).base(import.meta.env.VITE_AIRTABLE_BASE);

const getFormattedDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${(today.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
};

export const api = {
  async getProduct(id: string) {
    try {
      const record = await base('Товары').find(id);
      return {
        id: record.id,
        name: String(record.get('Название') || ''),
        stock: Number(record.get('Текущий остаток') || 0)
      };
    } catch (error) {
      console.error('Ошибка получения товара:', error);
      return null;
    }
  },

  async createOperation(type: 'writeoff' | 'supply', productId: string, qty: number) {
    try {
      const cacheKey = `${type}-${productId}-${qty}`;
      const now = Date.now();

      // Проверка дублирования в кэше
      if (operationCache.has(cacheKey)) {
        const lastOperationTime = operationCache.get(cacheKey)!;
        if (now - lastOperationTime < 300000) { // 5 минут
          throw new Error('Повторная операция заблокирована. Подождите 5 минут.');
        }
      }

      const tableName = type === 'writeoff' ? 'Списания' : 'Поставки';
      
      await base(tableName).create([{
        fields: {
          'Товар': [productId],
          'Количество': qty,
          'Дата': getFormattedDate()
        }
      }]);

      // Обновление кэша
      operationCache.set(cacheKey, now);
      setTimeout(() => operationCache.delete(cacheKey), 300000);

      return true;
    } catch (error) {
      console.error('Ошибка создания операции:', {
        error,
        details: {
          type,
          productId,
          qty,
          time: new Date().toISOString()
        }
      });
      throw error;
    }
  }
};