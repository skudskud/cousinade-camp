import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_PASSWORD } from '@/lib/constants';

const PasswordGate = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const hasAuth = localStorage.getItem('cousinade_auth');
    const hasIdentity = localStorage.getItem('cousinade_person_id');
    if (hasAuth) {
      navigate(hasIdentity ? '/map' : '/who', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase().trim() === APP_PASSWORD) {
      localStorage.setItem('cousinade_auth', 'true');
      navigate('/who');
    } else {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
    }
  }, [password, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className={`retro-panel max-w-xl w-full text-center ${shaking ? 'pixel-shake' : ''}`}>
        <div className="mb-10">
          <h1 className="retro-title text-xl mb-3">🏕️ Cousinade 2026 Ardèche</h1>
          <h2 className="retro-title text-base">— Retro Hub —</h2>
        </div>

        <div className="mb-8 text-sm text-muted-foreground leading-loose">
          Bienvenue cousin(e) ! Entre le mot de passe pour accéder au hub.
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Mot de passe..."
            className="pixel-input text-center text-sm"
            autoFocus
          />

          {error && (
            <div className="text-destructive text-sm">
              ❌ Bzzzzt ! Mauvais mot de passe !
            </div>
          )}

          <button type="submit" className="pixel-btn w-full text-sm">
            Entrer
          </button>
        </form>

        <div className="mt-8 text-xs text-muted-foreground">
          ▶ Appuie sur Entrée pour valider <span className="pixel-blink">_</span>
        </div>
      </div>
    </div>
  );
};

export default PasswordGate;
