import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MAP_DATA, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, TILE,
  SPAWN_POS, isSolid, getZoneAt, ROOMS, RoomId, ZONE_POSITIONS,
} from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import PixelBear from '@/components/PixelBear';
import RoomView from '@/pages/RoomView';

const TILE_COLORS: Record<number, string> = {
  [TILE.GRASS]: '#2d5a1e',
  [TILE.TREE]: '#1a3a10',
  [TILE.WATER]: '#1a4a6a',
  [TILE.PATH]: '#8a7a5a',
  [TILE.ROCK]: '#5a5a5a',
  [TILE.CABIN]: '#6a4a2a',
  [TILE.ZONE_CUISINE]: '#8a7a5a',
  [TILE.ZONE_JEUX]: '#8a7a5a',
  [TILE.ZONE_PISCINE]: '#8a7a5a',
  [TILE.SIGN]: '#7a6a3a',
  [TILE.FLOWER]: '#2d5a1e',
};

const ZONE_LABELS: Record<string, string> = {
  cuisine: '🍳 Cuisine',
  jeux: '🎲 Salle de jeux',
  piscine: '🏊 Piscine',
};

const OverworldMap = () => {
  const navigate = useNavigate();
  const [pos, setPos] = useState(SPAWN_POS);
  const [activeRoom, setActiveRoom] = useState<RoomId | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [presenceCount, setPresenceCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; text: string }[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminAnswers, setAdminAnswers] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState({ hat_color: 'none', top_color: '#e74c3c', bottom_color: '#2c3e50' });
  const adminBuffer = useRef('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const notifId = useRef(0);

  const personId = localStorage.getItem('cousinade_person_id');
  const personName = localStorage.getItem('cousinade_person_name');

  // Auth checks
  useEffect(() => {
    if (!localStorage.getItem('cousinade_auth')) { navigate('/'); return; }
    if (!personId) { navigate('/who'); return; }
    setIsMobile(window.innerWidth < 900);
  }, [navigate, personId]);

  // Load avatar
  useEffect(() => {
    if (!personId) return;
    supabase.from('avatars').select('hat_color, top_color, bottom_color')
      .eq('person_id', personId).maybeSingle()
      .then(({ data }) => {
        if (data) setAvatarConfig(data);
        else navigate('/avatar');
      });
  }, [personId, navigate]);

  // Presence heartbeat
  useEffect(() => {
    if (!personId) return;
    const beat = async () => {
      await supabase.from('presence').upsert(
        { person_id: personId, last_seen_at: new Date().toISOString() },
        { onConflict: 'person_id' }
      );
    };
    beat();
    const interval = setInterval(beat, 25000);
    return () => clearInterval(interval);
  }, [personId]);

  // Presence count polling
  useEffect(() => {
    const fetchPresence = async () => {
      const cutoff = new Date(Date.now() - 90000).toISOString();
      const { count } = await supabase
        .from('presence')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', cutoff);
      setPresenceCount(count || 0);
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 10000);
    return () => clearInterval(interval);
  }, []);

  // Realtime notifications for new answers
  useEffect(() => {
    const channel = supabase
      .channel('answers-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'answers',
      }, async (payload) => {
        const answer = payload.new as any;
        if (answer.person_id === personId) return;

        const { data: person } = await supabase
          .from('people')
          .select('display_name')
          .eq('id', answer.person_id)
          .maybeSingle();

        const roomName = ROOMS[answer.room as RoomId]?.name || answer.room;
        const name = person?.display_name || 'Quelqu\'un';
        const id = `notif-${notifId.current++}`;

        setNotifications(prev => [...prev, {
          id,
          text: `${name} a ajouté une idée dans ${roomName}`,
        }]);

        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [personId]);

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = MAP_WIDTH * TILE_SIZE;
    canvas.height = MAP_HEIGHT * TILE_SIZE;

    // Draw tiles
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = MAP_DATA[y][x];
        ctx.fillStyle = TILE_COLORS[tile] || '#2d5a1e';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Add details
        if (tile === TILE.TREE) {
          ctx.fillStyle = '#0d2a06';
          ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 4, 32, 28);
          ctx.fillStyle = '#4a2a0a';
          ctx.fillRect(x * TILE_SIZE + 20, y * TILE_SIZE + 32, 8, 16);
        } else if (tile === TILE.WATER) {
          ctx.fillStyle = '#2a5a8a';
          ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 8, 40, 4);
          ctx.fillRect(x * TILE_SIZE + 12, y * TILE_SIZE + 24, 32, 4);
        } else if (tile === TILE.ROCK) {
          ctx.fillStyle = '#7a7a7a';
          ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 12, 32, 24);
          ctx.fillStyle = '#9a9a9a';
          ctx.fillRect(x * TILE_SIZE + 12, y * TILE_SIZE + 16, 20, 12);
        } else if (tile === TILE.CABIN) {
          ctx.fillStyle = '#8a5a2a';
          ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 8, 40, 36);
          ctx.fillStyle = '#aa3a1a';
          ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, 44, 12);
          ctx.fillStyle = '#3a2a1a';
          ctx.fillRect(x * TILE_SIZE + 16, y * TILE_SIZE + 24, 16, 20);
        } else if (tile === TILE.SIGN) {
          ctx.fillStyle = '#5a4a2a';
          ctx.fillRect(x * TILE_SIZE + 20, y * TILE_SIZE + 20, 8, 28);
          ctx.fillStyle = '#8a7a4a';
          ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 8, 32, 16);
        } else if (tile === TILE.FLOWER) {
          ctx.fillStyle = '#4a8a2a';
          ctx.fillRect(x * TILE_SIZE + 12, y * TILE_SIZE + 28, 4, 12);
          ctx.fillStyle = '#ea4a5a';
          ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 20, 12, 12);
        } else if (tile === TILE.ZONE_CUISINE || tile === TILE.ZONE_JEUX || tile === TILE.ZONE_PISCINE) {
          // Zone marker
          ctx.fillStyle = 'rgba(200, 168, 78, 0.3)';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Zone labels
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    Object.entries(ZONE_POSITIONS).forEach(([room, zpos]) => {
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      const label = ZONE_LABELS[room] || room;
      const tx = zpos.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = zpos.y * TILE_SIZE - 4;
      ctx.strokeText(label, tx, ty);
      ctx.fillText(label, tx, ty);
    });
  }, []);

  // Zone detection
  useEffect(() => {
    const zone = getZoneAt(pos.x, pos.y);
    if (zone) {
      setTooltip(`Appuie sur Entrée pour entrer dans ${ROOMS[zone].name}`);
    } else {
      setTooltip(null);
    }
  }, [pos]);

  // Keyboard
  useEffect(() => {
    if (activeRoom) return;

    const handleKey = (e: KeyboardEvent) => {
      // Admin shortcut
      adminBuffer.current += e.key.toLowerCase();
      if (adminBuffer.current.length > 10) adminBuffer.current = adminBuffer.current.slice(-10);
      if (adminBuffer.current.includes('admin')) {
        adminBuffer.current = '';
        openAdmin();
        return;
      }

      if (e.key === 'Enter') {
        const zone = getZoneAt(pos.x, pos.y);
        if (zone) {
          setActiveRoom(zone);
          return;
        }
      }

      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp') dy = -1;
      if (e.key === 'ArrowDown') dy = 1;
      if (e.key === 'ArrowLeft') dx = -1;
      if (e.key === 'ArrowRight') dx = 1;

      if (dx === 0 && dy === 0) return;
      e.preventDefault();

      setPos(prev => {
        const nx = prev.x + dx;
        const ny = prev.y + dy;
        if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) return prev;
        if (isSolid(MAP_DATA[ny][nx])) return prev;
        return { x: nx, y: ny };
      });
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pos, activeRoom]);

  // Close room on Esc
  useEffect(() => {
    if (!activeRoom) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveRoom(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [activeRoom]);

  const openAdmin = async () => {
    const { data } = await supabase
      .from('answers')
      .select('*, people!inner(display_name)')
      .order('created_at', { ascending: false })
      .limit(30);
    setAdminAnswers(data || []);
    setShowAdmin(true);
  };

  const deleteAnswer = async (id: string) => {
    await supabase.from('answers').delete().eq('id', id);
    setAdminAnswers(prev => prev.filter(a => a.id !== id));
  };

  if (isMobile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="retro-panel text-center p-8">
          <h1 className="retro-title text-sm mb-4">📱 Oups !</h1>
          <p className="retro-text">Desktop only pour le moment.</p>
          <p className="text-[7px] text-muted-foreground mt-2">Reviens sur un ordinateur !</p>
        </div>
      </div>
    );
  }

  if (activeRoom) {
    return (
      <RoomView
        roomId={activeRoom}
        onClose={() => setActiveRoom(null)}
        personId={personId!}
        personName={personName!}
        avatarConfig={avatarConfig}
        presenceCount={presenceCount}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-3 bg-card pixel-border" style={{ borderTop: 'none' }}>
        <div className="flex items-center gap-3">
           <PixelBear hatColor={avatarConfig.hat_color} topColor={avatarConfig.top_color} bottomColor={avatarConfig.bottom_color} size={32} />
          <span className="text-[8px] text-foreground">{personName}</span>
        </div>
        <div className="text-[8px] text-primary">
          🏕️ Cousinade 2026 — Retro Hub
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[8px] text-accent">
            🟢 {presenceCount} cousin{presenceCount > 1 ? 's' : ''} connecté{presenceCount > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => navigate('/avatar')}
            className="text-[7px] text-muted-foreground hover:text-foreground"
            style={{ fontFamily: '"Press Start 2P"' }}
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative mt-16" style={{ width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE }}>
        <canvas ref={canvasRef} className="pixel-border" />

        {/* Player */}
        <div
          className="absolute transition-all duration-150"
          style={{
            left: pos.x * TILE_SIZE + (TILE_SIZE - 32) / 2,
            top: pos.y * TILE_SIZE + (TILE_SIZE - 32) / 2,
            width: 32,
            height: 32,
            zIndex: 10,
          }}
        >
          <PixelBear hatColor={avatarConfig.hat_color} topColor={avatarConfig.top_color} bottomColor={avatarConfig.bottom_color} size={32} />
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 retro-panel px-6 py-3 z-50">
          <span className="text-[8px] text-primary pixel-blink">▶</span>
          <span className="text-[8px] text-foreground ml-2">{tooltip}</span>
        </div>
      )}

      {/* Controls hint */}
      <div className="text-[6px] text-muted-foreground mt-4 text-center">
        ← ↑ ↓ → pour se déplacer • Entrée pour interagir
      </div>

      {/* Notifications */}
      <div className="fixed top-16 right-4 z-50 space-y-2 max-w-xs">
        {notifications.map(n => (
          <div key={n.id} className="pixel-toast">
            <span className="text-[7px] text-foreground">💬 {n.text}</span>
          </div>
        ))}
      </div>

      {/* Admin modal */}
      {showAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="retro-panel max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="retro-title text-[10px]">🔧 Admin</h2>
              <button onClick={() => setShowAdmin(false)} className="pixel-btn text-[7px]">
                Fermer
              </button>
            </div>
            <div className="space-y-2">
              {adminAnswers.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center bg-muted p-2">
                  <div className="text-[7px] text-foreground">
                    <span className="text-primary">{a.people?.display_name}</span>
                    {' — '}{a.room}/{a.prompt_key}: {a.value_text || a.value_number}
                  </div>
                  <button
                    onClick={() => deleteAnswer(a.id)}
                    className="text-[7px] text-destructive hover:underline"
                    style={{ fontFamily: '"Press Start 2P"' }}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverworldMap;
