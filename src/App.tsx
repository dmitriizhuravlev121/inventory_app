import { useState, useRef, useEffect } from 'react';
import { Scanner } from './components/scanner';
import { api } from './servises/api';

type ViewState = 'scan' | 'product';

interface Product {
  id: string;
  name: string;
  stock: number;
}

export default function App() {
  const [view, setView] = useState<ViewState>('scan');
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const lastOperationRef = useRef<{ type: string; hash: string } | null>(null);

  // Автосброс ошибки через 5 секунд
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleScan = async (rawData: string) => {
    try {
      const decodedData = JSON.parse(rawData);
      if (!decodedData.id) throw new Error('Неверный формат QR-кода');

      const product = await api.getProduct(decodedData.id);
      if (!product) throw new Error('Товар не найден');

      setProduct({
        ...product,
        name: decodedData.name || product.name
      });
      setView('product');
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка сканирования');
      setView('scan');
    }
  };

  const handleOperation = async (type: 'writeoff' | 'supply') => {
    if (!product || !qty || isProcessing) return;

    // Создаем уникальный хэш операции
    const operationHash = `${type}-${product.id}-${qty}-${Date.now()}`;
    
    // Проверка повторной операции
    if (lastOperationRef.current?.hash === operationHash) {
      setError('Повторная операция заблокирована');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      await api.createOperation(type, product.id, Number(qty));
      
      // Обновляем остатки
      setProduct({
        ...product,
        stock: type === 'supply' 
          ? product.stock + Number(qty)
          : product.stock - Number(qty)
      });

      // Фиксируем последнюю операцию
      lastOperationRef.current = { type, hash: operationHash };
      setQty('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка операции');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Учёт товаров</h1>

      {view === 'scan' ? (
        <div className="space-y-4">
          <Scanner onScan={handleScan} />
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 bg-white p-4 rounded-lg shadow-lg">
          <button
            onClick={() => setView('scan')}
            className="text-blue-600 hover:underline"
          >
            ← Назад к сканеру
          </button>

          <h2 className="text-xl font-semibold">{product?.name}</h2>
          <p className="text-gray-600">Текущий остаток: {product?.stock}</p>

          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Введите количество"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            min="1"
            disabled={isProcessing}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOperation('writeoff')}
              className={`p-2 text-white rounded ${
                isProcessing 
                  ? 'bg-red-300 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              disabled={
                isProcessing ||
                !qty ||
                (product ? product.stock < Number(qty) : true)
              }
            >
              {isProcessing ? 'Обработка...' : 'Списать'}
            </button>
            <button
              onClick={() => handleOperation('supply')}
              className={`p-2 text-white rounded ${
                isProcessing 
                  ? 'bg-green-300 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              disabled={isProcessing || !qty}
            >
              {isProcessing ? 'Обработка...' : 'Приход'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}