import { useState, useCallback } from 'react';
import { APP_PASSWORD } from '@/lib/constants';

const PasswordGate = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase().trim() === APP_PASSWORD) {
      localStorage.setItem('cousinade_auth', 'true');
      window.location.href = '/who';
    } else {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
    }
  }, [password]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className={`retro-panel max-w-lg w-full text-center ${shaking ? 'pixel-shake' : ''}`}>
        <div className="mb-8">
          <h1 className="retro-title text-sm mb-2">🏕️ Cousinade 2026</h1>
          <h2 className="retro-title text-[10px]">— Retro Hub —</h2>
        </div>

        <div className="mb-6 text-[8px] text-muted-foreground leading-loose">
          Bienvenue cousin(e) ! Entre le mot de passe pour accéder au hub.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Mot de passe..."
            className="pixel-input text-center"
            autoFocus
          />

          {error && (
            <div className="text-destructive text-[8px]">
              ❌ Bzzzzt ! Mauvais mot de passe !
            </div>
          )}

          <button type="submit" className="pixel-btn w-full">
            Entrer
          </button>
        </form>

        <div className="mt-6 text-[6px] text-muted-foreground">
          ▶ Appuie sur Entrée pour valider <span className="pixel-blink">_</span>
        </div>
      </div>
    </div>
  );
};

export default PasswordGate;
