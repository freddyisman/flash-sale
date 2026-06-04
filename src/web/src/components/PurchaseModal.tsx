import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
}

export const PurchaseModal = ({ isOpen, onClose, item }: PurchaseModalProps) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      toast.error('Please enter an email or username');
      return;
    }

    setIsSubmitting(true);

    try {
      const isEmail = input.includes('@');
      const payload = {
        itemId: item.id,
        ...(isEmail ? { email: input } : { username: input }),
      };

      const response = await fetch('/api/user/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 'success') {
        onClose();
        navigate('/confirmation', { state: { message: data.message } });
      } else {
        onClose();
        toast.error(data.message || 'An error occurred while purchasing.');
      }
    } catch (error: any) {
      onClose();
      toast.error(error.message || 'Failed to process purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content item-card">
        <button className="modal-close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2>Complete Purchase</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          You're about to buy <strong>{item.name}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user-input">Email or Username</label>
            <input
              id="user-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. user@example.com or cooluser99"
              className="premium-input"
              autoFocus
            />
          </div>
          
          <button 
            type="submit" 
            className="buy-button" 
            disabled={isSubmitting}
            style={{ marginTop: '1rem' }}
          >
            {isSubmitting ? 'Processing...' : 'Buy Now'}
          </button>
        </form>
      </div>
    </div>
  );
};
