import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FlashSaleGrid } from './components/FlashSaleGrid';
import { ConfirmationPage } from './pages/ConfirmationPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <h1>FLASH ⚡ SALE</h1>
          <p>🔥 Exclusive deals right now! 🔥</p>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<FlashSaleGrid />} />
            <Route path="/confirmation" element={<ConfirmationPage />} />
          </Routes>
        </main>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(31, 40, 51, 0.9)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }
          }}
        />
      </div>
    </Router>
  );
}

export default App;
