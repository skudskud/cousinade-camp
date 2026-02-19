import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HAT_OPTIONS, TOP_OPTIONS, BOTTOM_OPTIONS, HAT_LABELS, TOP_LABELS, BOTTOM_LABELS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import PixelBear from '@/components/PixelBear';

const AvatarBuilder = () => {
  const navigate = useNavigate();
  const [hatIdx, setHatIdx] = useState(0);
  const [topIdx, setTopIdx] = useState(0);
  const [bottomIdx, setBottomIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const personId = localStorage.getItem('cousinade_person_id');
  const personName = localStorage.getItem('cousinade_person_name');

  useEffect(() => {
    if (!localStorage.getItem('cousinade_auth')) { navigate('/'); return; }
    if (!personId) { navigate('/who'); return; }

    // Load existing avatar
    supabase
      .from('avatars')
      .select('hat_color, top_color, bottom_color')
      .eq('person_id', personId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const hi = HAT_OPTIONS.indexOf(data.hat_color as any);
          const ti = TOP_OPTIONS.indexOf(data.top_color as any);
          const bi = BOTTOM_OPTIONS.indexOf(data.bottom_color as any);
          if (hi >= 0) setHatIdx(hi);
          if (ti >= 0) setTopIdx(ti);
          if (bi >= 0) setBottomIdx(bi);
        }
      });
  }, [navigate, personId]);

  const randomize = () => {
    setHatIdx(Math.floor(Math.random() * HAT_OPTIONS.length));
    setTopIdx(Math.floor(Math.random() * TOP_OPTIONS.length));
    setBottomIdx(Math.floor(Math.random() * BOTTOM_OPTIONS.length));
  };

  const save = async () => {
    if (!personId) return;
    setSaving(true);

    const avatar = {
      person_id: personId,
      hat_color: HAT_OPTIONS[hatIdx],
      top_color: TOP_OPTIONS[topIdx],
      bottom_color: BOTTOM_OPTIONS[bottomIdx],
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('avatars')
      .select('id')
      .eq('person_id', personId)
      .maybeSingle();

    if (existing) {
      await supabase.from('avatars').update(avatar).eq('person_id', personId);
    } else {
      await supabase.from('avatars').insert(avatar);
    }

    setSaving(false);
    navigate('/map');
  };

  const ColorPicker = ({
    label,
    options,
    labels,
    value,
    onChange,
  }: {
    label: string;
    options: readonly string[];
    labels: string[];
    value: number;
    onChange: (i: number) => void;
  }) => (
    <div className="mb-4">
      <div className="text-[8px] text-foreground mb-2">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {options.map((color, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`px-3 py-2 text-[7px] font-pixel transition-all ${
              value === i
                ? 'pixel-border-gold bg-secondary'
                : 'pixel-border bg-muted hover:bg-secondary'
            }`}
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            {color !== 'none' && (
              <span
                className="inline-block w-3 h-3 mr-1"
                style={{ backgroundColor: color, border: '1px solid #000' }}
              />
            )}
            {labels[i]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="retro-panel max-w-lg w-full">
        <h1 className="retro-title text-sm mb-2 text-center">Crée ton ourson 🐻</h1>
        <p className="text-[7px] text-muted-foreground text-center mb-6">
          {personName}
        </p>

        {/* Preview */}
        <div className="flex justify-center mb-6 p-4 bg-muted">
          <PixelBear
            hatColor={HAT_OPTIONS[hatIdx]}
            topColor={TOP_OPTIONS[topIdx]}
            bottomColor={BOTTOM_OPTIONS[bottomIdx]}
            size={128}
          />
        </div>

        <ColorPicker
          label="🎩 Chapeau"
          options={HAT_OPTIONS}
          labels={HAT_LABELS}
          value={hatIdx}
          onChange={setHatIdx}
        />
        <ColorPicker
          label="👕 Haut"
          options={TOP_OPTIONS}
          labels={TOP_LABELS}
          value={topIdx}
          onChange={setTopIdx}
        />
        <ColorPicker
          label="👖 Bas"
          options={BOTTOM_OPTIONS}
          labels={BOTTOM_LABELS}
          value={bottomIdx}
          onChange={setBottomIdx}
        />

        <div className="flex gap-3 mt-6">
          <button onClick={randomize} className="pixel-btn-secondary flex-1">
            🎲 Random
          </button>
          <button onClick={save} disabled={saving} className="pixel-btn flex-1 disabled:opacity-50">
            {saving ? '...' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarBuilder;
