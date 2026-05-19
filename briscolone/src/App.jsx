import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { BiddingOverlay } from './components/BiddingOverlay';
import { GameBoard } from './components/GameBoard';
import './App.css'; 

function App() {
  const gameId = "dwyvFJ0Ojwqa3sJagLp8"; 
  
  const [localPlayerId, setLocalPlayerId] = useState(() => {
    return localStorage.getItem(`briscola_player_${gameId}`) || null;
  }); 

  const { gameState, loading, updateGame } = useGameState(gameId);

  // Riferimento per avere sempre lo stato aggiornato dentro i timer ed eventi del browser
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // 1. HEARTBEAT + CASSAFORTE PER CHIUSURA SCHEDA ISTANTANEA
  useEffect(() => {
    if (!localPlayerId) return;

    // Funzione per dire a Firebase "sono vivo"
    const inviaSegnoDiVita = async () => {
      await updateGame({
        [`Players.${localPlayerId}.ultimo_ping`]: Date.now(),
        [`Players.${localPlayerId}.occupato`]: true
      });
    };

    // FUNZIONE FULMINEA: Viene eseguita all'istante quando si chiude la SCHEDA o la PAGINA
    const liberaPostoSuChiusuraScheda = () => {
      // Usiamo una scrittura diretta senza await perché la scheda sta morendo
      updateGame({
        [`Players.${localPlayerId}.occupato`]: false,
        [`Players.${localPlayerId}.ultimo_ping`]: 0
      });
    };

    inviaSegnoDiVita();
    const interval = setInterval(inviaSegnoDiVita, 5000); 

    // Ascoltiamo quando l'utente chiude la scheda, cambia pagina o chiude il browser
    window.addEventListener('beforeunload', liberaPostoSuChiusuraScheda);
    window.addEventListener('pagehide', liberaPostoSuChiusuraScheda);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', liberaPostoSuChiusuraScheda);
      window.removeEventListener('pagehide', liberaPostoSuChiusuraScheda);
    };
  }, [localPlayerId]); 

  // 2. LO SPAZZINO DI EMERGENZA (Se il browser crasha o internet si disconnette senza lanciare gli eventi sopra)
  useEffect(() => {
    const spazzaFantasmi = () => {
      const attualeStato = gameStateRef.current;
      if (!attualeStato) return;

      const oraAttuale = Date.now();
      const TIMEOUT = 14000; 
      const giocatori = attualeStato.Players || {};

      Object.entries(giocatori).forEach(([id, dati]) => {
        if (id === localPlayerId) return;

        if (dati.occupato && dati.ultimo_ping && (oraAttuale - dati.ultimo_ping) > TIMEOUT) {
          updateGame({
            [`Players.${id}.occupato`]: false,
            [`Players.${id}.ultimo_ping`]: 0
          });
        }
      });
    };

    const interval = setInterval(spazzaFantasmi, 4000);
    return () => clearInterval(interval);
  }, [localPlayerId]);

  const giocatori = gameState?.Players || {};
  const conteggioOccupati = Object.values(giocatori).filter(p => p.occupato === true).length;
  const stanzaPiena = conteggioOccupati >= 3; 

  const gestisciDistribuzioneCarte = async () => {
    if (stanzaPiena) {
      alert("Cosa pensi di fare? 🧐 Ci sono già dei giocatori attivi, non si resetta un bel niente!");
      return;
    }

    const semi = ['O', 'C', 'S', 'B']; 
    const mazzo = [];
    for (const seme of semi) {
      for (let valore = 1; valore <= 10; valore++) {
        mazzo.push(`${valore}_${seme}`); 
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
      G1: { nome: nomiAttuali.G1, carte: mazzo.slice(0, 8), punti_fatti: 0, occupato: false, ultimo_ping: 0 },
      G2: { nome: nomiAttuali.G2, carte: mazzo.slice(8, 16), punti_fatti: 0, occupato: false, ultimo_ping: 0 },
      G3: { nome: nomiAttuali.G3, carte: mazzo.slice(16, 24), punti_fatti: 0, occupato: false, ultimo_ping: 0 },
      G4: { nome: nomiAttuali.G4, carte: mazzo.slice(24, 32), punti_fatti: 0, occupato: false, ultimo_ping: 0 },
      G5: { nome: nomiAttuali.G5, carte: mazzo.slice(32, 40), punti_fatti: 0, occupato: false, ultimo_ping: 0 },
    };

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
    alert("Mazzo mescolato e sbloccato!");
  };

  const eseguiLogout = async () => {
    if (localPlayerId) {
      const backupId = localPlayerId;
      setLocalPlayerId(null);
      localStorage.removeItem(`briscola_player_${gameId}`);
      try {
        await updateGame({ 
          [`Players.${backupId}.occupato`]: false,
          [`Players.${backupId}.ultimo_ping`]: 0 
        });
      } catch (err) {
        console.error("Errore durante il logout:", err);
      }
    }
  };

  if (loading) return <div className="loading">Caricamento partita...</div>;
  if (!gameState) return <div className="error">Partita non trovata.</div>;

  if (!localPlayerId) {
    const eseguiLoginGiocatore = async (id) => {
      localStorage.setItem(`briscola_player_${gameId}`, id); 
      setLocalPlayerId(id);
      await updateGame({ 
        [`Players.${id}.occupato`]: true,
        [`Players.${id}.ultimo_ping`]: Date.now()
      });
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
        
        <button 
          onClick={gestisciDistribuzioneCarte} 
          style={{ 
            padding: '12px 25px', 
            fontSize: '15px', 
            backgroundColor: stanzaPiena ? '#475569' : '#3b82f6', 
            color: stanzaPiena ? '#94a3b8' : 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: stanzaPiena ? 'not-allowed' : 'pointer',
            opacity: stanzaPiena ? 0.5 : 1
          }}
        >
          {stanzaPiena ? "🔒 Reset Bloccato (Partita avviata)" : "🔄 Nuova Partita (Sblocca Tutti)"}
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
          <button onClick={eseguiLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Esci</button>
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