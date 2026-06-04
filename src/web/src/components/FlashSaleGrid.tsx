import { useEffect, useState } from 'react';
import { ItemCard } from './ItemCard';

interface Item {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  start_flash_at: string;
  end_flash_at?: string;
  isFlashSale?: boolean;
}

export const FlashSaleGrid: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/item?isFlashSale=true');
        if (!response.ok) {
          throw new Error('Failed to fetch flash sale items');
        }
        const data = await response.json();
        const itemsList = Array.isArray(data) ? data : (data.items || data.data || []);
        setItems(itemsList);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching items.');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (loading) {
    return <div className="loading">Loading incredible deals...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger)' }}>
        <h2>Oops!</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
        <h2>No items available right now.</h2>
        <p>Check back later for more flash sale items!</p>
      </div>
    );
  }

  return (
    <div className="flash-sale-grid">
      {items.map((item, index) => (
        <ItemCard key={item.id || index.toString()} item={item} />
      ))}
    </div>
  );
};
