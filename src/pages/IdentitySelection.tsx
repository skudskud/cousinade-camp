import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FAMILY_NAMES } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

const IdentitySelection = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('cousinade_auth')) {
      navigate('/');
    }
  }, [navigate]);

  const filtered = useMemo(() => {
    if (!search) return FAMILY_NAMES;
    return FAMILY_NAMES.filter(n =>
      n.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    setWarning('');

    try {
      // Check if person exists
      const { data: existing } = await supabase
        .from('people')
        .select('id')
        .eq('display_name', selected)
        .maybeSingle();

      let personId: string;

      if (existing) {
        personId = existing.id;

        // Check presence (warn if active elsewhere)
        const { data: pres } = await supabase
          .from('presence')
          .select('last_seen_at')
          .eq('person_id', personId)
          .maybeSingle();

        if (pres) {
          const lastSeen = new Date(pres.last_seen_at).getTime();
          const now = Date.now();
          if (now - lastSeen < 90000) {
            setWarning('Ce prénom est déjà actif ailleurs — ok si c\'est toi.');
          }
        }
      } else {
        const { data: newPerson, error } = await supabase
          .from('people')
          .insert({ display_name: selected })
          .select('id')
          .single();

        if (error) throw error;
        personId = newPerson.id;
      }

      localStorage.setItem('cousinade_person_id', personId);
      localStorage.setItem('cousinade_person_name', selected);

      // Check if avatar exists
      const { data: avatar } = await supabase
        .from('avatars')
        .select('id')
        .eq('person_id', personId)
        .maybeSingle();

      if (avatar) {
        navigate('/map');
      } else {
        navigate('/avatar');
      }
    } catch (err) {
      console.error(err);
      setWarning('Erreur de connexion. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="retro-panel max-w-md w-full">
        <h1 className="retro-title text-sm mb-6 text-center">Qui es-tu ? 👋</h1>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un nom..."
          className="pixel-input mb-4"
        />

        <div className="max-h-60 overflow-y-auto mb-4 space-y-1">
          {filtered.map(name => (
            <button
              key={name}
              onClick={() => setSelected(name)}
              className={`w-full text-left px-3 py-2 text-[8px] transition-colors ${
                selected === name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
              style={{ fontFamily: '"Press Start 2P", monospace' }}
            >
              {name}
            </button>
          ))}
        </div>

        {warning && (
          <div className="text-accent text-[7px] mb-3 p-2 bg-muted">
            ⚠️ {warning}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className="pixel-btn w-full disabled:opacity-50"
        >
          {loading ? 'Chargement...' : selected ? `C'est moi : ${selected}` : 'Choisis ton nom'}
        </button>
      </div>
    </div>
  );
};

export default IdentitySelection;
