import React, { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { BiddingOverlay } from './components/BiddingOverlay';
import { GameBoard } from './components/GameBoard';
import './App.css'; 

function App() {
  const gameId = "dwyvFJ0Ojwqa3sJagLp8"; 
  
  // Legge subito se questo browser ha già un login attivo in memoria
  const [localPlayerId, setLocalPlayerId] = useState(() => {
    return localStorage.getItem(`briscola_player_${gameId}`) || null;
  }); 

  const { gameState, loading, updateGame } = useGameState(gameId);

  // Se lo stato di Firebase dice che il nostro posto è libero ma noi abbiamo il login in memoria, si ri-occupa automaticamente
  useEffect(() => {
    if (gameState && localPlayerId) {
      const miSpettaIlPosto = gameState.Players?.[localPlayerId]?.occupato;
      if (miSpettaIlPosto === false) {
        updateGame({ [`Players.${localPlayerId}.occupato`]: true });
      }
    }
  }, [gameState, localPlayerId]);

  const gestisciDistribuzioneCarte = async () => {
    const semi = ['O', 'C', 'S', 'B']; 
    const mazzo = [];
    for (const seme of semi) {
      for (let valore = 1; valore <= 10; valore++) {
        mazzo.push(`${seme}_${valore}`);
      }
    }
    for (let i = mazzo.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]];
    }

    const nomiAttuali = {
      G1: gameState?.Players?.G1?.nome || "Giocatore 1",
      G2: gameState?.Players?.G2?.nome || "Giocatore 2",
      G3: gameState?.Players?.G3?.nome || "Giocatore 3",
      G4: gameState?.Players?.G4?.nome || "Giocatore 4",
      G5: gameState?.Players?.G5?.nome || "Giocatore 5",
    };

    const nuoviPlayers = {
      G1: { nome: nomiAttuali.G1, carte: mazzo.slice(0, 8), punti_fatti: 0, occupato: false },
      G2: { nome: nomiAttuali.G2, carte: mazzo.slice(8, 16), punti_fatti: 0, occupato: false },
      G3: { nome: nomiAttuali.G3, carte: mazzo.slice(16, 24), punti_fatti: 0, occupato: false },
      G4: { nome: nomiAttuali.G4, carte: mazzo.slice(24, 32), punti_fatti: 0, occupato: false },
      G5: { nome: nomiAttuali.G5, carte: mazzo.slice(32, 40), punti_fatti: 0, occupato: false },
    };

    // Resetta le sessioni locali di tutti i browser quando si forza una nuova partita
    localStorage.removeItem(`briscola_player_${gameId}`);

    await updateGame({
      Players: nuoviPlayers,
      fase: 'asta',                  
      giocatore_corrente: 'G1',       
      punti_chiamata: 60,            
      valore_chiamato: "",           
      giocatori_passati: [],         
      chiamante: "",                 
      cronologia_tavolo: [],          
      semi_briscola: "",             
      seme_giro_attuale: ""          
    });

    setLocalPlayerId(null);
    alert("Mazzo distribuito e memorie browser resettate!");
  };

  const eseguiLogout = async () => {
    if (localPlayerId) {
      await updateGame({ [`Players.${localPlayerId}.occupato`]: false });
      localStorage.removeItem(`briscola_player_${gameId}`);
      setLocalPlayerId(null);
    }
  };

  if (loading) return <div className="loading">Caricamento partita in corso su Firebase...</div>;
  if (!gameState) return <div className="error">Partita non trovata.</div>;

  if (!localPlayerId) {
    const giocatori = gameState.Players || {};
    
    const eseguiLoginGiocatore = async (id) => {
      await updateGame({ [`Players.${id}.occupato`]: true });
      localStorage.setItem(`briscola_player_${gameId}`, id); // Salva il login sul telefono/PC dell'utente
      setLocalPlayerId(id);
    };

    return (
      <div className="app-container login-screen" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <header>
          <h1>Briscolone Online 🃏</h1>
          <p style={{ color: '#cbd5e1', fontSize: '18px' }}>Seleziona il tuo profilo:</p>
        </header>
        
        <div className="login-buttons-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px', margin: '30px auto' }}>
          {Object.entries(giocatori).map(([id, dati]) => {
            const isOccupied = dati.occupato === true;
            return (
              <button
                key={id}
                disabled={isOccupied}
                onClick={() => eseguiLoginGiocatore(id)}
                style={{
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: isOccupied ? '#64748b' : '#10b981', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isOccupied ? 'not-allowed' : 'pointer',
                  opacity: isOccupied ? 0.6 : 1
                }}
              >
                {dati.nome || `Giocatore ${id}`} ({id}) {isOccupied ? "🔴 Occupato" : "🟢 Entra"}
              </button>
            );
          })}
        </div>

        <hr style={{ borderColor: '#334155', margin: '40px auto', maxWidth: '400px' }} />
        <button onClick={gestisciDistribuzioneCarte} style={{ padding: '12px 25px', fontSize: '15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          🔄 Nuova Partita (Sblocca Tutti)
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
        <h1>Briscolone Online 🃏</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', color: 'white' }}>
            Profilo: <strong style={{ color: '#10b981' }}>{gameState.Players?.[localPlayerId]?.nome || localPlayerId}</strong>
          </div>
          <button onClick={eseguiLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Esci</button>
        </div>
      </header>
      <main>
        {(gameState.fase === 'asta' || gameState.fase === 'scelta_briscola') ? (
          <BiddingOverlay gameState={gameState} localPlayerId={localPlayerId} updateGame={updateGame} />
        ) : (
          <GameBoard gameState={gameState} localPlayerId={localPlayerId} updateGame={updateGame} />
        )}
      </main>
    </div>
  );
}

export default App;