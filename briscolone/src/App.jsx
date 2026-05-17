import React, { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { BiddingOverlay } from './components/BiddingOverlay';
import { GameBoard } from './components/GameBoard';
import './App.css'; 

function App() {
  const gameId = "dwyvFJ0Ojwqa3sJagLp8"; 
  const [localPlayerId, setLocalPlayerId] = useState(null); 
  const { gameState, loading, updateGame } = useGameState(gameId);

  // --- SCRIPT PER GENERARE E DISTRIBUIRE LE CARTE ---
  const gestisciDistribuzioneCarte = async () => {
    // 1. Generiamo il mazzo completo di 40 carte
    const semi = ['O', 'C', 'S', 'B']; 
    const mazzo = [];
    
    for (const seme of semi) {
      for (let valore = 1; valore <= 10; valore++) {
        mazzo.push(`${seme}_${valore}`);
      }
    }

    // 2. Mescoliamo il mazzo
    for (let i = mazzo.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]];
    }

    // 3. Recuperiamo i nomi attuali, azzeriamo i punti fatti e LIBERIAMO i profili (occupato: false)
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

    // 4. Mandiamo l'aggiornamento massivo a Firebase resettando l'asta e la scelta intermedia
    await updateGame({
      Players: nuoviPlayers,
      fase: 'asta',                  
      giocatore_corrente: 'G1',       
      punti_chiamata: 60,            
      valore_chiamato: "",           
      giocatori_passati: [],         
      chiamante: "",                 
      
      // USIAMO IL NUOVO ARRAY PER IL BANCO ORDINATO:
      cronologia_tavolo: [],          
      semi_briscola: "",             
      seme_giro_attuale: ""          
    });

    // Se l'admin resetta la partita, forziamo il logout locale della sessione per rientrare da capo
    setLocalPlayerId(null);
    alert("Mazzo mescolato! Nuova partita avviata: tutti i profili sono stati liberati.");
  };

  if (loading) {
    return <div className="loading">Caricamento partita in corso su Firebase...</div>;
  }

  if (!gameState) {
    return <div className="error">Partita non trovata. Controlla il codice gameId in App.jsx</div>;
  }

  // --- SCHERMATA DI LOGIN / SCELTA GIOCATORE BLINDATA ---
  if (!localPlayerId) {
    const giocatori = gameState.Players || {};
    
    const eseguiLoginGiocatore = async (id) => {
      // Controllo di sicurezza in tempo reale prima di entrare
      if (giocatori[id]?.occupato) {
        alert("Questo profilo è già stato selezionato da un altro dispositivo! Scegline un altro.");
        return;
      }

      // 1. Comunichiamo a Firebase che questo utente adesso è occupato
      await updateGame({
        [`Players.${id}.occupato`]: true
      });

      // 2. Salviamo il ruolo localmente per avviare il gioco
      setLocalPlayerId(id);
    };

    return (
      <div className="app-container login-screen" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <header>
          <h1>Briscolone Online 🃏</h1>
          <p style={{ color: '#cbd5e1', fontSize: '18px' }}>Seleziona il tuo profilo per entrare in partita:</p>
        </header>
        
        {/* Pulsantiera di Login Dinamica */}
        <div className="login-buttons-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px', margin: '30px auto' }}>
          {Object.entries(giocatori).map(([id, dati]) => {
            const isOccupied = dati.occupato === true;

            return (
              <button
                key={id}
                disabled={isOccupied} // Disabilita fisicamente il click se occupato
                onClick={() => eseguiLoginGiocatore(id)}
                style={{
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: isOccupied ? '#475569' : '#10b981', // Grigio se occupato, verde se disponibile
                  color: isOccupied ? '#94a3b8' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isOccupied ? 'not-allowed' : 'pointer',
                  boxShadow: isOccupied ? 'none' : '0 4px 6px rgba(0,0,0,0.2)',
                  opacity: isOccupied ? 0.6 : 1,
                  transition: 'background-color 0.2s'
                }}
              >
                {dati.nome || `Giocatore ${id}`} ({id}) {isOccupied ? "🔴 (In uso)" : "🟢 Libero"}
              </button>
            );
          })}
        </div>

        <hr style={{ borderColor: '#334155', margin: '40px auto', maxWidth: '400px' }} />

        {/* PANNELLO DI CONTROLLO: Pulsante di sblocco e distribuzione */}
        <div style={{ marginTop: '20px' }}>
          <p style={{ color: '#94a3b8' }}>Sei l'amministratore o vuoi avviare una nuova mano?</p>
          <button
            onClick={gestisciDistribuzioneCarte}
            style={{
              padding: '12px 25px',
              fontSize: '15px',
              fontWeight: 'bold',
              backgroundColor: '#3b82f6', 
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }}
          >
            🔄 Mescola e Distribuisci Carte (Libera Tutti)
          </button>
        </div>
        
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '40px' }}>ID Partita attuale: <code>{gameId}</code></p>
      </div>
    );
  }

  // --- SCHERMATA DI GIOCO REALE (Asta o Tavolo dopo il Login) ---
  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
        <h1>Briscolone Online 🃏</h1>
        <div style={{ backgroundColor: '#1e293b', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', color: 'white' }}>
          Loggato come: <strong style={{ color: '#10b981' }}>{gameState.Players?.[localPlayerId]?.nome || localPlayerId}</strong>
        </div>
      </header>

      <main>
        {(gameState.fase === 'asta' || gameState.fase === 'scelta_briscola') ? (
          <BiddingOverlay 
            gameState={gameState} 
            localPlayerId={localPlayerId} 
            updateGame={updateGame} 
          />
        ) : (
          <GameBoard 
            gameState={gameState} 
            localPlayerId={localPlayerId} 
            updateGame={updateGame} 
          />
        )}
      </main>
    </div>
  );
}

export default App;