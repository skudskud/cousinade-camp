import { useState, useEffect, useCallback } from 'react';
import { ROOMS, RoomId, Prompt } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import PixelBear from '@/components/PixelBear';

interface AnswerRow {
  id: string;
  person_id: string;
  room: string;
  prompt_key: string;
  value_text: string | null;
  value_number: number | null;
  created_at: string;
  people: { display_name: string } | null;
  avatars: { hat_color: string; top_color: string; bottom_color: string } | null;
  vote_count: number;
  voted_by_me: boolean;
}

interface RoomViewProps {
  roomId: RoomId;
  onClose: () => void;
  personId: string;
  personName: string;
  avatarConfig: { hat_color: string; top_color: string; bottom_color: string };
  presenceCount: number;
}

const RoomView = ({ roomId, onClose, personId, personName, avatarConfig, presenceCount }: RoomViewProps) => {
  const room = ROOMS[roomId];
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnswers = useCallback(async () => {
    const { data: answerData } = await supabase
      .from('answers')
      .select('*, people(display_name)')
      .eq('room', roomId)
      .order('created_at', { ascending: false });

    if (!answerData) return;

    // Fetch avatars and votes
    const personIds = [...new Set(answerData.map(a => a.person_id))];
    const answerIds = answerData.map(a => a.id);

    const [{ data: avatarData }, { data: voteData }] = await Promise.all([
      supabase.from('avatars').select('person_id, hat_color, top_color, bottom_color').in('person_id', personIds.length ? personIds : ['none']),
      supabase.from('votes').select('answer_id, person_id').in('answer_id', answerIds.length ? answerIds : ['none']),
    ]);

    const avatarMap = new Map((avatarData || []).map(a => [a.person_id, a]));
    const voteMap = new Map<string, { count: number; myVote: boolean }>();

    (voteData || []).forEach(v => {
      const entry = voteMap.get(v.answer_id) || { count: 0, myVote: false };
      entry.count++;
      if (v.person_id === personId) entry.myVote = true;
      voteMap.set(v.answer_id, entry);
    });

    const enriched: AnswerRow[] = answerData.map(a => ({
      ...a,
      avatars: avatarMap.get(a.person_id) || null,
      vote_count: voteMap.get(a.id)?.count || 0,
      voted_by_me: voteMap.get(a.id)?.myVote || false,
    }));

    setAnswers(enriched);
  }, [roomId, personId]);

  useEffect(() => { fetchAnswers(); }, [fetchAnswers]);

  // Realtime updates for this room
  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'answers',
        filter: `room=eq.${roomId}`,
      }, () => fetchAnswers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchAnswers]);

  const handleSubmit = async () => {
    if (!activePrompt) return;

    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('Réponse vide !');
      return;
    }

    setSubmitting(true);
    setError('');

    const row: any = {
      person_id: personId,
      room: roomId,
      prompt_key: activePrompt.key,
    };

    if (activePrompt.type === 'number') {
      const num = parseFloat(trimmed);
      if (isNaN(num)) {
        setError('Entre un nombre valide !');
        setSubmitting(false);
        return;
      }
      row.value_number = num;
      row.value_text = null;
    } else {
      row.value_text = trimmed;
      row.value_number = null;
    }

    await supabase.from('answers').insert(row);
    setInputValue('');
    setActivePrompt(null);
    setSubmitting(false);
    fetchAnswers();
  };

  const handleVote = async (answerId: string, alreadyVoted: boolean) => {
    if (alreadyVoted) {
      await supabase.from('votes').delete().eq('answer_id', answerId).eq('person_id', personId);
    } else {
      await supabase.from('votes').insert({ answer_id: answerId, person_id: personId });
    }
    fetchAnswers();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'à l\'instant';
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${Math.floor(hours / 24)}j`;
  };

  const displayedAnswers = filter
    ? answers.filter(a => a.prompt_key === filter)
    : answers;

  const promptLabels = new Map(room.prompts.map(p => [p.key, p.label]));

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 bg-card pixel-border" style={{ borderTop: 'none' }}>
        <div className="flex items-center gap-4">
          <span className="retro-title text-base">{room.name}</span>
        </div>
        <span className="text-sm text-accent">
          🟢 {presenceCount} cousin{presenceCount > 1 ? 's' : ''} connecté{presenceCount > 1 ? 's' : ''}
        </span>
        <button onClick={onClose} className="pixel-btn-secondary text-xs">
          ← Retour à la map (Esc)
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Prompts */}
        <div className="w-96 bg-card pixel-border overflow-y-auto p-4 flex flex-col" style={{ borderTop: 'none' }}>
          <h3 className="text-sm text-primary mb-4">📝 Questions</h3>
          <div className="space-y-3 flex-1">
            {room.prompts.map(prompt => (
              <button
                key={prompt.key}
                onClick={() => { setActivePrompt(prompt); setInputValue(''); setError(''); }}
                className="w-full text-left p-3 text-xs bg-muted hover:bg-secondary transition-colors text-foreground"
                style={{ fontFamily: '"Press Start 2P"' }}
              >
                ▶ {prompt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Board */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm text-primary">📋 Tableau des idées</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter(null)}
                className={`text-xs px-3 py-2 ${!filter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
                style={{ fontFamily: '"Press Start 2P"' }}
              >
                Tout
              </button>
              {room.prompts.map(p => (
                <button
                  key={p.key}
                  onClick={() => setFilter(p.key)}
                  className={`text-xs px-3 py-2 ${filter === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}
                  style={{ fontFamily: '"Press Start 2P"' }}
                >
                  {p.label.slice(0, 12)}..
                </button>
              ))}
            </div>
          </div>

          {displayedAnswers.length === 0 && (
            <div className="text-center text-muted-foreground text-sm mt-12">
              Aucune idée pour le moment... Sois le premier ! 🎉
            </div>
          )}

          <div className="space-y-3">
            {displayedAnswers.map(answer => (
              <div key={answer.id} className="bg-card pixel-border p-4 flex items-start gap-4">
                <div className="flex-shrink-0">
                  {answer.avatars ? (
                    <PixelBear
                      hatColor={answer.avatars.hat_color}
                      topColor={answer.avatars.top_color}
                      bottomColor={answer.avatars.bottom_color}
                      size={40}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-primary font-bold">
                      {answer.people?.display_name || '?'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {promptLabels.get(answer.prompt_key) || answer.prompt_key}
                    </span>
                  </div>
                  <div className="text-sm text-foreground mb-2">
                    {answer.value_text || `${answer.value_number}€`}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(answer.created_at)}
                    </span>
                    <button
                      onClick={() => handleVote(answer.id, answer.voted_by_me)}
                      className={`text-xs ${answer.voted_by_me ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                      style={{ fontFamily: '"Press Start 2P"' }}
                    >
                      {answer.voted_by_me ? '❤️' : '🤍'} +{answer.vote_count}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt modal */}
      {activePrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="retro-panel max-w-lg w-full">
            <h3 className="retro-title text-base mb-6">{activePrompt.label}</h3>
            <div className="mb-3 text-sm text-muted-foreground">
              {personName}, ta réponse :
            </div>

            {activePrompt.type === 'choice' ? (
              <div className="flex gap-3 mb-6">
                {activePrompt.choices!.map(c => (
                  <button
                    key={c}
                    onClick={() => setInputValue(c)}
                    className={`pixel-btn text-xs flex-1 ${inputValue === c ? '' : 'pixel-btn-secondary'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type={activePrompt.type === 'number' ? 'number' : 'text'}
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                className="pixel-input mb-6 text-sm"
                placeholder={activePrompt.type === 'number' ? '0' : 'Ta réponse...'}
                autoFocus
              />
            )}

            {error && (
              <div className="text-destructive text-xs mb-4">❌ {error}</div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setActivePrompt(null)}
                className="pixel-btn-secondary flex-1 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !inputValue.trim()}
                className="pixel-btn flex-1 text-xs disabled:opacity-50"
              >
                {submitting ? '...' : '✅ Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;
