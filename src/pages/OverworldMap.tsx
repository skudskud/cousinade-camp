import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MAP_DATA, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, TILE,
  SPAWN_POS, isSolid, getZoneAt, ROOMS, RoomId, ZONE_POSITIONS,
} from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import PixelBear from '@/components/PixelBear';
import MusicPlayer from '@/components/MusicPlayer';
import RoomView from '@/pages/RoomView';

const TILE_COLORS: Record<number, string> = {
  [TILE.GRASS]: '#7ec8a3',
  [TILE.TREE]: '#5ba37d',
  [TILE.WATER]: '#87ceeb',
  [TILE.PATH]: '#f5e6c8',
  [TILE.ROCK]: '#b8b8b8',
  [TILE.CABIN]: '#deb887',
  [TILE.ZONE_CUISINE]: '#ffb347',
  [TILE.ZONE_JEUX]: '#87ceeb',
  [TILE.ZONE_PISCINE]: '#77dd77',
  [TILE.SIGN]: '#d4a574',
  [TILE.FLOWER]: '#98d8a8',
  [TILE.BUSH]: '#6db36d',
  [TILE.APPLE_TREE]: '#5ba37d',
  [TILE.DUCK]: '#87ceeb',
  [TILE.RABBIT]: '#7ec8a3',
  [TILE.RIVER]: '#5dade2',
  [TILE.BRIDGE]: '#c4a35a',
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
  const [enteringRoom, setEnteringRoom] = useState<RoomId | null>(null);
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

  // Draw map - re-run when activeRoom changes (null = returning from room)
  useEffect(() => {
    if (activeRoom) return; // Don't draw when in room view
    
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
        
        // Base grass for most tiles
        ctx.fillStyle = '#7ec8a3';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Then draw tile-specific content
        const tx = x * TILE_SIZE;
        const ty = y * TILE_SIZE;

        if (tile === TILE.TREE) {
          // Tree trunk
          ctx.fillStyle = '#8b5a2b';
          ctx.fillRect(tx + 26, ty + 40, 12, 24);
          // Tree foliage (layered circles effect)
          ctx.fillStyle = '#228b22';
          ctx.fillRect(tx + 10, ty + 8, 44, 36);
          ctx.fillStyle = '#32cd32';
          ctx.fillRect(tx + 16, ty + 12, 32, 28);
        } else if (tile === TILE.APPLE_TREE) {
          // Apple tree trunk
          ctx.fillStyle = '#8b5a2b';
          ctx.fillRect(tx + 26, ty + 40, 12, 24);
          // Apple tree foliage
          ctx.fillStyle = '#228b22';
          ctx.fillRect(tx + 8, ty + 6, 48, 38);
          ctx.fillStyle = '#32cd32';
          ctx.fillRect(tx + 14, ty + 10, 36, 30);
          // Apples!
          ctx.fillStyle = '#ff6347';
          ctx.fillRect(tx + 18, ty + 16, 8, 8);
          ctx.fillRect(tx + 38, ty + 20, 8, 8);
          ctx.fillRect(tx + 26, ty + 28, 8, 8);
        } else if (tile === TILE.RIVER) {
          // River water
          ctx.fillStyle = '#5dade2';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          // Water ripples
          ctx.fillStyle = '#85c1e9';
          ctx.fillRect(tx + 8, ty + 16, 20, 4);
          ctx.fillRect(tx + 36, ty + 32, 20, 4);
          ctx.fillRect(tx + 16, ty + 48, 24, 4);
        } else if (tile === TILE.BRIDGE) {
          // Path base
          ctx.fillStyle = '#f5e6c8';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          // Bridge planks
          ctx.fillStyle = '#c4a35a';
          ctx.fillRect(tx + 4, ty, 8, TILE_SIZE);
          ctx.fillRect(tx + 20, ty, 8, TILE_SIZE);
          ctx.fillRect(tx + 36, ty, 8, TILE_SIZE);
          ctx.fillRect(tx + 52, ty, 8, TILE_SIZE);
          // Bridge rails
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(tx, ty + 2, TILE_SIZE, 4);
          ctx.fillRect(tx, ty + 58, TILE_SIZE, 4);
        } else if (tile === TILE.WATER) {
          ctx.fillStyle = '#87ceeb';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#add8e6';
          ctx.fillRect(tx + 8, ty + 20, 24, 4);
          ctx.fillRect(tx + 32, ty + 40, 20, 4);
        } else if (tile === TILE.PATH) {
          ctx.fillStyle = '#f5e6c8';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          // Path texture
          ctx.fillStyle = '#e8d4a8';
          ctx.fillRect(tx + 8, ty + 12, 6, 6);
          ctx.fillRect(tx + 40, ty + 32, 8, 8);
          ctx.fillRect(tx + 24, ty + 48, 6, 6);
        } else if (tile === TILE.ROCK) {
          ctx.fillStyle = '#808080';
          ctx.fillRect(tx + 10, ty + 16, 44, 36);
          ctx.fillStyle = '#a9a9a9';
          ctx.fillRect(tx + 16, ty + 22, 32, 24);
          ctx.fillStyle = '#c0c0c0';
          ctx.fillRect(tx + 22, ty + 28, 16, 12);
        } else if (tile === TILE.CABIN) {
          // Main building
          ctx.fillStyle = '#deb887';
          ctx.fillRect(tx + 6, ty + 16, 52, 42);
          // Roof
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(tx + 2, ty + 6, 60, 16);
          // Door
          ctx.fillStyle = '#654321';
          ctx.fillRect(tx + 26, ty + 34, 16, 24);
          // Windows
          ctx.fillStyle = '#87ceeb';
          ctx.fillRect(tx + 12, ty + 26, 10, 10);
          ctx.fillRect(tx + 46, ty + 26, 10, 10);
        } else if (tile === TILE.BUSH) {
          ctx.fillStyle = '#228b22';
          ctx.fillRect(tx + 12, ty + 24, 40, 32);
          ctx.fillStyle = '#32cd32';
          ctx.fillRect(tx + 18, ty + 30, 28, 22);
          // Some berries
          ctx.fillStyle = '#ff69b4';
          ctx.fillRect(tx + 22, ty + 34, 6, 6);
          ctx.fillRect(tx + 36, ty + 38, 6, 6);
        } else if (tile === TILE.FLOWER) {
          // Stem
          ctx.fillStyle = '#228b22';
          ctx.fillRect(tx + 30, ty + 36, 4, 20);
          // Petals - different colors for variety
          const colors = ['#ff69b4', '#ffb6c1', '#ff6347', '#ffd700', '#da70d6'];
          const color = colors[(x + y) % colors.length];
          ctx.fillStyle = color;
          ctx.fillRect(tx + 22, ty + 24, 20, 16);
          // Center
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(tx + 28, ty + 28, 8, 8);
        } else if (tile === TILE.DUCK) {
          // Water background
          ctx.fillStyle = '#5dade2';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          // Duck body
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx + 20, ty + 28, 24, 16);
          // Duck head
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx + 38, ty + 20, 12, 12);
          // Duck beak
          ctx.fillStyle = '#ffa500';
          ctx.fillRect(tx + 50, ty + 24, 8, 6);
          // Water ripples
          ctx.fillStyle = '#85c1e9';
          ctx.fillRect(tx + 12, ty + 48, 16, 4);
          ctx.fillRect(tx + 36, ty + 52, 12, 4);
        } else if (tile === TILE.RABBIT) {
          // Rabbit body
          ctx.fillStyle = '#d2b48c';
          ctx.fillRect(tx + 24, ty + 32, 20, 16);
          // Rabbit head
          ctx.fillRect(tx + 36, ty + 24, 14, 14);
          // Rabbit ears
          ctx.fillStyle = '#d2b48c';
          ctx.fillRect(tx + 38, ty + 10, 4, 16);
          ctx.fillRect(tx + 46, ty + 10, 4, 16);
          // Inner ear
          ctx.fillStyle = '#ffb6c1';
          ctx.fillRect(tx + 39, ty + 12, 2, 10);
          ctx.fillRect(tx + 47, ty + 12, 2, 10);
          // Eye
          ctx.fillStyle = '#000000';
          ctx.fillRect(tx + 46, ty + 28, 3, 3);
          // Tail
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx + 20, ty + 36, 8, 8);
        } else if (tile === TILE.ZONE_CUISINE) {
          // Kitchen floor
          ctx.fillStyle = '#ffb347';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          // Stove
          ctx.fillStyle = '#2f2f2f';
          ctx.fillRect(tx + 16, ty + 20, 32, 28);
          // Burners
          ctx.fillStyle = '#ff4500';
          ctx.fillRect(tx + 20, ty + 26, 10, 10);
          ctx.fillRect(tx + 34, ty + 26, 10, 10);
          // Pot
          ctx.fillStyle = '#696969';
          ctx.fillRect(tx + 22, ty + 16, 20, 8);
        } else if (tile === TILE.ZONE_JEUX) {
          // Game room floor
          ctx.fillStyle = '#87ceeb';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          // Game table
          ctx.fillStyle = '#228b22';
          ctx.fillRect(tx + 12, ty + 20, 40, 28);
          // Dice
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx + 20, ty + 28, 12, 12);
          ctx.fillStyle = '#000000';
          ctx.fillRect(tx + 24, ty + 32, 4, 4);
          // Cards
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx + 36, ty + 26, 10, 14);
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(tx + 40, ty + 30, 4, 4);
        } else if (tile === TILE.ZONE_PISCINE) {
          // Pool area
          ctx.fillStyle = '#77dd77';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          // Pool
          ctx.fillStyle = '#00bfff';
          ctx.fillRect(tx + 8, ty + 16, 48, 36);
          ctx.fillStyle = '#87ceeb';
          ctx.fillRect(tx + 14, ty + 22, 36, 24);
          // Pool edge
          ctx.fillStyle = '#f5f5dc';
          ctx.fillRect(tx + 6, ty + 14, 52, 4);
        } else if (tile === TILE.SIGN) {
          // Post
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(tx + 28, ty + 30, 8, 32);
          // Sign board
          ctx.fillStyle = '#deb887';
          ctx.fillRect(tx + 10, ty + 14, 44, 20);
          ctx.fillStyle = '#8b4513';
          ctx.strokeStyle = '#654321';
          ctx.lineWidth = 2;
          ctx.strokeRect(tx + 10, ty + 14, 44, 20);
        }

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
      }
    }

    // Zone labels
    ctx.font = '14px "Press Start 2P"';
    ctx.textAlign = 'center';
    Object.entries(ZONE_POSITIONS).forEach(([room, zpos]) => {
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      const label = ZONE_LABELS[room] || room;
      const tx = zpos.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = zpos.y * TILE_SIZE - 8;
      ctx.strokeText(label, tx, ty);
      ctx.fillText(label, tx, ty);
    });
  }, [activeRoom]);

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
          // Trigger transition animation
          setEnteringRoom(zone);
          setTimeout(() => {
            setActiveRoom(zone);
            setEnteringRoom(null);
          }, 600);
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
          <h1 className="retro-title text-lg mb-4">📱 Oups !</h1>
          <p className="text-base text-foreground">Desktop only pour le moment.</p>
          <p className="text-sm text-muted-foreground mt-3">Reviens sur un ordinateur !</p>
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
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-card pixel-border" style={{ borderTop: 'none' }}>
        <button
          onClick={() => navigate('/avatar')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group"
          title="Modifier mon personnage"
        >
          <PixelBear hatColor={avatarConfig.hat_color} topColor={avatarConfig.top_color} bottomColor={avatarConfig.bottom_color} size={48} />
          <div className="flex flex-col items-start">
            <span className="text-sm text-foreground">{personName}</span>
            <span className="text-[10px] text-muted-foreground group-hover:text-primary">✏️ Modifier</span>
          </div>
        </button>
        <div className="text-sm text-primary">
          🏕️ Cousinade 2026 Ardèche
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-accent">
            🟢 {presenceCount} cousin{presenceCount > 1 ? 's' : ''} connecté{presenceCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative mt-16" style={{ width: MAP_WIDTH * TILE_SIZE, height: MAP_HEIGHT * TILE_SIZE }}>
        <canvas ref={canvasRef} className="pixel-border" />

        {/* Player */}
        <div
          className="absolute transition-all duration-150"
          style={{
            left: pos.x * TILE_SIZE + (TILE_SIZE - 48) / 2,
            top: pos.y * TILE_SIZE + (TILE_SIZE - 48) / 2,
            width: 48,
            height: 48,
            zIndex: 10,
          }}
        >
          <PixelBear hatColor={avatarConfig.hat_color} topColor={avatarConfig.top_color} bottomColor={avatarConfig.bottom_color} size={48} />
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 retro-panel px-8 py-4 z-50">
          <span className="text-sm text-primary pixel-blink">▶</span>
          <span className="text-sm text-foreground ml-3">{tooltip}</span>
        </div>
      )}

      {/* Controls hint */}
      <div className="text-xs text-muted-foreground mt-6 text-center">
        ← ↑ ↓ → pour se déplacer • Entrée pour interagir
      </div>

      {/* Room Transition Animation */}
      {enteringRoom && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
          <div className="room-transition-overlay" />
          <div className="room-transition-text">
            <span className="text-4xl mb-4">{ROOMS[enteringRoom].icon}</span>
            <span className="text-xl text-primary">{ROOMS[enteringRoom].name}</span>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-24 right-4 z-50 space-y-3 max-w-sm">
        {notifications.map(n => (
          <div key={n.id} className="pixel-toast">
            <span className="text-xs text-foreground">💬 {n.text}</span>
          </div>
        ))}
      </div>

      {/* Music Player */}
      <MusicPlayer />

      {/* Admin modal */}
      {showAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="retro-panel max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="retro-title text-base">🔧 Admin</h2>
              <button onClick={() => setShowAdmin(false)} className="pixel-btn text-xs">
                Fermer
              </button>
            </div>
            <div className="space-y-3">
              {adminAnswers.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center bg-muted p-3">
                  <div className="text-xs text-foreground">
                    <span className="text-primary">{a.people?.display_name}</span>
                    {' — '}{a.room}/{a.prompt_key}: {a.value_text || a.value_number}
                  </div>
                  <button
                    onClick={() => deleteAnswer(a.id)}
                    className="text-xs text-destructive hover:underline"
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
