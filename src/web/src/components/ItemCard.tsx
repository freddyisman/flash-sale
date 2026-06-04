import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCountdown } from '../hooks/useCountdown';
import { PurchaseModal } from './PurchaseModal';

interface ItemCardProps {
  item: {
    id?: string;
    name: string;
    quantity: number;
    price: number;
    discount: number;
    start_flash_at: string;
    end_flash_at?: string;
    isFlashSale?: boolean;
  };
}

export const ItemCard = ({ item }: ItemCardProps) => {
  const timeUntilStart = useCountdown(item.start_flash_at);
  const timeUntilEnd = useCountdown(item.end_flash_at);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const discountedPrice = item.price - (item.price * (item.discount / 100));

  const activeCountdown = timeUntilStart.isEnded ? timeUntilEnd : timeUntilStart;
  const countdownLabel = timeUntilEnd.isEnded 
    ? 'Flash Sale Ended' 
    : timeUntilStart.isEnded 
      ? 'Flash Sale Ends In' 
      : 'Flash Sale Starts In';

  const handleBuyClick = async () => {
    if (!item.id) return;
    
    setIsLoadingStatus(true);
    try {
      const response = await fetch(`/api/item/status/${item.id}`);
      const data = await response.json();

      if (data.status === 'active') {
        setIsModalOpen(true);
      } else {
        toast(data.message || `Flash sale is ${data.status}`);
      }
    } catch (error) {
      toast.error('Failed to check item status');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  return (
    <>
      <div className="item-card">
        <div className="image-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </div>
        
        <h3 className="item-name">{item.name}</h3>
        <p className="item-quantity">Remaining: {item.quantity}</p>
        
        <div className="price-container">
          <div className="price-details">
            {item.discount > 0 && (
              <span className="original-price">${item.price.toFixed(2)}</span>
            )}
            <span className="price">${discountedPrice.toFixed(2)}</span>
          </div>
          {item.discount > 0 && (
            <span className="discount">{item.discount}% OFF</span>
          )}
        </div>

        <div className="countdown-container">
          <span className="countdown-label">{countdownLabel}</span>
          <div className="countdown-timer">
            <div className="countdown-part">
              <span>{activeCountdown.days}</span>
              <small>Days</small>
            </div>
            <span className="colon">:</span>
            <div className="countdown-part">
              <span>{activeCountdown.hours}</span>
              <small>Hrs</small>
            </div>
            <span className="colon">:</span>
            <div className="countdown-part">
              <span>{activeCountdown.minutes}</span>
              <small>Min</small>
            </div>
            <span className="colon">:</span>
            <div className="countdown-part">
              <span>{activeCountdown.seconds}</span>
              <small>Sec</small>
            </div>
          </div>
        </div>

        <button 
          className="buy-button" 
          onClick={handleBuyClick}
          disabled={isLoadingStatus}
        >
          {isLoadingStatus ? 'Checking...' : 'Buy'}
        </button>
      </div>

      <PurchaseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        item={item as any} 
      />
    </>
  );
};
