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

  // Stati per la gestione del popup password oscurato 🔐
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '' });
  const [passwordInput, setPasswordInput] = useState('');

  const gameStateRef = useRef(gameState);
  const lastPingsRef = useRef({});

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // CONTROLLER DI ESPULSIONE INTELLIGENTE A TIMESTAMP
  useEffect(() => {
    if (!gameState || !localPlayerId) return;
    
    const serverResetTime = gameState.resetTimestamp || 0;
    const localLoginTime = Number(localStorage.getItem(`briscola_login_time_${gameId}`)) || 0;
    
    if (serverResetTime > localLoginTime) {
      localStorage.removeItem(`briscola_player_${gameId}`);
      localStorage.removeItem(`briscola_login_time_${gameId}`);
      setLocalPlayerId(null);
    }
  }, [gameState?.resetTimestamp, localPlayerId]);

  // HEARTBEAT AD INCREMENTO IMMUNE AL CLOCK DRIFT
  useEffect(() => {
    if (!gameState || !localPlayerId) return;

    const serverResetTime = gameState.resetTimestamp || 0;
    const localLoginTime = Number(localStorage.getItem(`briscola_login_time_${gameId}`)) || 0;
    if (serverResetTime > localLoginTime) return; 

    const inviaSegnoDiVita = async () => {
      const attualeCount = gameStateRef.current?.Players?.[localPlayerId]?.ping_count || 0;
      await updateGame({
        [`Players.${localPlayerId}.ping_count`]: attualeCount + 1,
        [`Players.${localPlayerId}.occupato`]: true
      });
    };

    inviaSegnoDiVita();
    const interval = setInterval(inviaSegnoDiVita, 5000); 

    return () => clearInterval(interval);
  }, [localPlayerId, gameState?.resetTimestamp]); 

  // PULIZIA AUTOMATICA DEI FANTASMI
  useEffect(() => {
    if (localPlayerId) return; 

    const interval = setInterval(() => {
      const currentGameState = gameStateRef.current;
      if (!currentGameState) return;

      const giocatori = currentGameState.Players || {};
      const updates = {};
      let serveAggiornamento = false;

      Object.entries(giocatori).forEach(([id, dati]) => {
        if (dati.occupato) {
          const currentCount = dati.ping_count || 0;
          
          if (!lastPingsRef.current[id]) {
            lastPingsRef.current[id] = { count: currentCount, missed: 0 };
          } else if (lastPingsRef.current[id].count === currentCount) {
            lastPingsRef.current[id].missed += 1;
          } else {
            lastPingsRef.current[id].count = currentCount;
            lastPingsRef.current[id].missed = 0;
          }

          if (lastPingsRef.current[id].missed >= 3) {
            updates[`Players.${id}.occupato`] = false;
            updates[`Players.${id}.ping_count`] = 0;
            serveAggiornamento = true;
            delete lastPingsRef.current[id];
          }
        } else {
          delete lastPingsRef.current[id];
        }
      });

      if (serveAggiornamento) {
        updateGame(updates);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [localPlayerId]);

  const giocatori = gameState?.Players || {};

  // LOGICA COMUNE DI GENERAZIONE E DISTRIBUZIONE DEL MAZZO
  const eseguiMixEMazzo = async () => {
    const nomiAttuali = {
      G1: gameStateRef.current?.Players?.G1?.nome || "Giocatore 1",
      G2: gameStateRef.current?.Players?.G2?.nome || "Giocatore 2",
      G3: gameStateRef.current?.Players?.G3?.nome || "Giocatore 3",
      G4: gameStateRef.current?.Players?.G4?.nome || "Giocatore 4",
      G5: gameStateRef.current?.Players?.G5?.nome || "Giocatore 5",
    };

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

    const nuoviPlayers = {
      G1: { nome: nomiAttuali.G1, carte: mazzo.slice(0, 8), punti_fatti: 0, occupato: gameStateRef.current?.Players?.G1?.occupato || false, ping_count: gameStateRef.current?.Players?.G1?.ping_count || 0 },
      G2: { nome: nomiAttuali.G2, carte: mazzo.slice(8, 16), punti_fatti: 0, occupato: gameStateRef.current?.Players?.G2?.occupato || false, ping_count: gameStateRef.current?.Players?.G2?.ping_count || 0 },
      G3: { nome: nomiAttuali.G3, carte: mazzo.slice(16, 24), punti_fatti: 0, occupato: gameStateRef.current?.Players?.G3?.occupato || false, ping_count: gameStateRef.current?.Players?.G3?.ping_count || 0 },
      G4: { nome: nomiAttuali.G4, carte: mazzo.slice(24, 32), punti_fatti: 0, occupato: gameStateRef.current?.Players?.G4?.occupato || false, ping_count: gameStateRef.current?.Players?.G4?.ping_count || 0 },
      G5: { nome: nomiAttuali.G5, carte: mazzo.slice(32, 40), punti_fatti: 0, occupato: gameStateRef.current?.Players?.G5?.occupato || false, ping_count: gameStateRef.current?.Players?.G5?.ping_count || 0 },
    };

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
  };

  // Funzione per aprire il popup azzerando l'input precedente
  const apriModalPassword = (tipo) => {
    setPasswordInput('');
    setModalConfig({ isOpen: true, type: tipo });
  };

  // VALIDATORE CENTRALE DELLA PASSWORD (CON INPUT OSCURATO)
  const gestisciInviaPassword = async (e) => {
    e.preventDefault(); 
    const PASSWORD_SEGRETA = gameStateRef.current?.adminPassword || "Br1sc0l4!";

    if (passwordInput !== PASSWORD_SEGRETA) {
      alert("❌ Password errata!");
      setModalConfig({ isOpen: false, type: '' });
      return;
    }

    const tipoAzione = modalConfig.type;
    setModalConfig({ isOpen: false, type: '' }); // Chiude il popup

    if (tipoAzione === 'mazzo') {
      const conferma = window.confirm("Password corretta. Vuoi procedere con la nuova distribuzione del mazzo?");
      if (!conferma) return;
      await eseguiMixEMazzo();
      alert("Nuovo mazzo pronto! 🃏");
    } 
    else if (tipoAzione === 'sblocco') {
      const conferma = window.confirm("Vuoi liberare il tavolo e avviare subito una nuova partita?");
      if (!conferma) return;

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

      const resetCompleto = {
        fase: 'asta',                  
        giocatore_corrente: 'G1',       
        punti_chiamata: 60,            
        valore_chiamato: "",           
        giocatori_passati: [],         
        chiamante: "",                 
        cronologia_tavolo: [],          
        semi_briscola: "",             
        seme_giro_attuale: "",
        resetTimestamp: Date.now()
      };

      const ids = ['G1', 'G2', 'G3', 'G4', 'G5'];
      ids.forEach((id, index) => {
        const nomeAttuale = gameStateRef.current?.Players?.[id]?.nome || `Giocatore ${index + 1}`;
        resetCompleto[`Players.${id}`] = {
          nome: nomeAttuale,
          carte: mazzo.slice(index * 8, (index + 1) * 8),
          punti_fatti: 0,
          occupato: false, 
          ping_count: 0
        };
      });

      localStorage.removeItem(`briscola_player_${gameId}`);
      localStorage.removeItem(`briscola_login_time_${gameId}`);
      setLocalPlayerId(null);

      await updateGame(resetCompleto);
      alert("Tavolo azzerato e nuove carte distribuite con successo! Puoi rientrare. 🟢");
    }
  };

  const resetMazzoManoSuccessiva = async () => {
    await eseguiMixEMazzo();
  };

  const eseguiLogout = async () => {
    if (localPlayerId) {
      const backupId = localPlayerId;
      setLocalPlayerId(null);
      localStorage.removeItem(`briscola_player_${gameId}`);
      localStorage.removeItem(`briscola_login_time_${gameId}`);
      try {
        await updateGame({ 
          [`Players.${backupId}.occupato`]: false,
          [`Players.${backupId}.ping_count`]: 0 
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
      const oraLogin = Date.now();
      localStorage.setItem(`briscola_player_${gameId}`, id); 
      localStorage.setItem(`briscola_login_time_${gameId}`, oraLogin.toString()); 
      setLocalPlayerId(id);
      await updateGame({ 
        [`Players.${id}.occupato`]: true,
        [`Players.${id}.ping_count`]: 1
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
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
          <button onClick={() => apriModalPassword('mazzo')} style={{ padding: '12px 25px', fontSize: '15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            🔄 Nuova Partita (Mazzo)
          </button>
          <button onClick={() => apriModalPassword('sblocco')} style={{ padding: '12px 25px', fontSize: '15px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            🔒 Sblocca Tutti i Posti (Admin)
          </button>
        </div>

        {/* 🛡️ INTERFACCIA POPUP PASSWORD CON INPUT MASTATO */}
        {modalConfig.isOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <form onSubmit={gestisciInviaPassword} style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '320px', textAlign: 'center', border: '1px solid #334155' }}>
              <h3 style={{ color: 'white', marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>
                {modalConfig.type === 'mazzo' ? "Distribuzione Nuovo Mazzo" : "Sblocco Amministratore"}
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '20px' }}>Inserisci la password di sicurezza:</p>
              
              <input 
                type="password" 
                autoFocus
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white', fontSize: '18px', boxSizing: 'border-box', textAlign: 'center', marginBottom: '25px', letterSpacing: '3px' }}
              />
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button type="button" onClick={() => setModalConfig({ isOpen: false, type: '' })} style={{ padding: '10px 18px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                  Annulla
                </button>
                <button type="submit" style={{ padding: '10px 18px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                  Conferma
                </button>
              </div>
            </form>
          </div>
        )}
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
          <BiddingOverlay gameState={gameState} localPlayerId={localPlayerId} updateGame={updateGame} onNuovaPartita={resetMazzoManoSuccessiva} />
        ) : (
          <GameBoard gameState={gameState} localPlayerId={localPlayerId} updateGame={updateGame} onNuovaPartita={resetMazzoManoSuccessiva} />
        )}
      </main>
    </div>
  );
}

export default App;