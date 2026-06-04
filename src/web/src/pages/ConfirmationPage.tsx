import { useLocation, useNavigate } from 'react-router-dom';

export const ConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const message = location.state?.message || 'Your purchase was successful!';

  return (
    <div className="confirmation-page">
      <div className="item-card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem', color: 'var(--accent-primary)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '80px', height: '80px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'white' }}>Success!</h2>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
          {message}
        </p>
        <button 
          className="buy-button" 
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};
