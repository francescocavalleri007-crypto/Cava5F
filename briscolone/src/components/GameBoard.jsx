import React from 'react';

export function GameBoard({ gameState, localPlayerId, updateGame }) {
  const giocatori = gameState?.Players || {};
  const localPlayer = giocatori?.[localPlayerId];
  const isMyTurn = gameState?.giocatore_corrente === localPlayerId;
  
  const cronologiaTavolo = gameState?.cronologia_tavolo || [];
  const passati = gameState?.giocatori_passati || [];

  const nomiSemi = { O: 'Ori/Denari', C: 'Coppe', S: 'Spade', B: 'Bastoni' };
  const nomiValori = { '1': 'Asso', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': 'Fante', '9': 'Cavallo', '10': 'Re' };

  const forzaCarta = { '1': 10, '3': 9, '10': 8, '9': 7, '8': 6, '7': 5, '6': 4, '5': 3, '4': 2, '2': 1 };
  const puntiCarta = { '1': 11, '3': 10, '10': 4, '9': 3, '8': 2, '2': 0, '4': 0, '5': 0, '6': 0, '7': 0 };

  if (!giocatori) return <div className="error">Dati mancanti.</div>;

  // Calcoliamo quante mani sono state giocate in totale
  // Se un giocatore ha 8 carte, siamo alla mano 1. Se ne ha 0, la partita è finita.
  const carteRimanenti = localPlayer?.carte?.length || 0;
  const manoAttuale = 9 - carteRimanenti; 
  const partitaFinita = carteRimanenti === 0 && cronologiaTavolo.length === 0;

  const handlePlayCard = async (cardCode) => {
    if (!isMyTurn || !localPlayer || cronologiaTavolo.length >= 5) return;

    const nuoveCarteMano = localPlayer.carte.filter(c => c !== cardCode);
    const nuovaCronologia = [...cronologiaTavolo, { giocatoreId: localPlayerId, carta: cardCode }];

    let semeGiro = gameState?.seme_giro_attuale || '';
    if (cronologiaTavolo.length === 0) {
      semeGiro = cardCode.split('_')[0];
    }

    // --- LOGICA IDENTIFICAZIONE SOCIO (Al primo giro di carte) ---
    let idSocioAggiornato = gameState?.socio || '';
    const cartaCercata = `${gameState?.semi_briscola}_${gameState?.valore_chiamato}`;
    
    // Se la carta giocata è quella chiamata, abbiamo trovato il socio!
    if (cardCode === cartaCercata) {
      idSocioAggiornato = localPlayerId;
    }

    const currentNum = parseInt(localPlayerId.replace('G', ''), 10);
    const nextPlayerId = `G${(currentNum % 5) + 1}`;

    await updateGame({
      [`Players.${localPlayerId}.carte`]: nuoveCarteMano,
      cronologia_tavolo: nuovaCronologia,
      seme_giro_attuale: semeGiro,
      giocatore_corrente: nextPlayerId,
      socio: idSocioAggiornato
    });
  };

  const calcolaPresaEDisponi = async () => {
    if (cronologiaTavolo.length < 5) return;

    const briscola = gameState?.semi_briscola;
    const semeGiro = gameState?.seme_giro_attuale;

    let idVincitore = '';
    let cartaVincente = null;
    let puntiTotaliPresa = 0;

    cronologiaTavolo.forEach(({ giocatoreId, carta }) => {
      const [seme, valore] = carta.split('_');
      puntiTotaliPresa += (puntiCarta[valore] || 0);

      if (!cartaVincente) {
        idVincitore = giocatoreId;
        cartaVincente = { seme, valore };
      } else {
        const eBriscolaNuova = seme === briscola;
        const eBriscolaVecchia = cartaVincente.seme === briscola;
        const eSemeGiroNuovo = seme === semeGiro;
        const eSemeGiroVecchio = cartaVincente.seme === semeGiro;

        let scavalca = false;

        if (eBriscolaNuova && !eBriscolaVecchia) {
          scavalca = true;
        } else if (eBriscolaNuova && eBriscolaVecchia) {
          if (forzaCarta[valore] > forzaCarta[cartaVincente.valore]) scavalca = true;
        } else if (!eBriscolaNuova && !eBriscolaVecchia) {
          if (eSemeGiroNuovo && !eSemeGiroVecchio) {
            scavalca = true;
          } else if (eSemeGiroNuovo && eSemeGiroVecchio) {
            if (forzaCarta[valore] > forzaCarta[cartaVincente.valore]) scavalca = true;
          }
        }

        if (scavalca) {
          idVincitore = giocatoreId;
          cartaVincente = { seme, valore };
        }
      }
    });

    const puntiAttualiVincitore = giocatori[idVincitore]?.punti_fatti || 0;
    const nuoviPunti = puntiAttualiVincitore + puntiTotaliPresa;

    // Se a fine mano 1 il socio non è uscito allo scoperto, lo cerchiamo nelle mani rimaste nascoste
    let idSocioAggiornato = gameState?.socio || '';
    if (!idSocioAggiornato) {
      const cartaCercata = `${gameState?.semi_briscola}_${gameState?.valore_chiamato}`;
      Object.entries(giocatori).forEach(([id, dati]) => {
        if (dati.carte?.includes(cartaCercata)) {
          idSocioAggiornato = id;
        }
      });
    }

    // Calcoliamo quante mani restano DOPO questa presa
    const prossimeCarteRimaste = giocatori[localPlayerId]?.carte?.length || 0;

    const aggiornamenti = {
      [`Players.${idVincitore}.punti_fatti`]: nuoviPunti,
      cronologia_tavolo: [], 
      seme_giro_attuale: '',
      giocatore_corrente: idVincitore,
      socio: idSocioAggiornato
    };

    // Se le carte in mano sono finite, passiamo alla fase di calcolo risultati
    if (prossimeCarteRimaste === 0) {
      aggiornamenti.fase = 'risultato_finale';
    }

    await updateGame(aggiornamenti);
    alert(`Presa vinta da ${giocatori[idVincitore]?.nome || idVincitore} (+${puntiTotaliPresa} punti)!`);
  };

const resetMassivoNuovaPartita = async () => {
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

    // Forza OCCUPATO: FALSE per liberare le sessioni di tutti
    const nuoviPlayers = {};
    Object.entries(giocatori).forEach(([id, dati], index) => {
      nuoviPlayers[id] = {
        nome: dati.nome,
        punti_fatti: 0,
        carte: mazzo.slice(index * 8, (index + 1) * 8),
        occupato: false // LIBERA TUTTI I GIOCATORI!
      };
    });

    await updateGame({
      Players: nuoviPlayers,
      fase: 'asta',
      giocatore_corrente: 'G1',
      punti_chiamata: 60,
      valore_chiamato: "",
      giocatori_passati: [],
      chiamante: "",
      socio: "",
      cronologia_tavolo: [],
      semi_briscola: "",
      seme_giro_attuale: ""
    });

    // NOTA: Poiché l'ID locale (localPlayerId) risiede in App.jsx, 
    // l'azzeramento di Firebase forzerà la disconnessione automatica 
    // o permetterà ai giocatori di risedersi liberamente al tavolo.
    alert("Partita resettata con successo! Tutti i profili sono stati liberati.");
  };
  const renderCardImage = (code) => {
    if (!code) return null;
    return (
      <img 
        src={`/carte/${code}.png`} 
        alt={code}
        style={{ width: '90px', height: '140px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.4)', display: 'block' }} 
      />
    );
  };

  // --- SCHERMATA DI VITTORIA / CALCOLO PUNTI FINALE ---
  if (gameState?.fase === 'risultato_finale' || partitaFinita) {
    const idChiamante = gameState?.chiamante;
    const idSocio = gameState?.socio;
    const puntiRichiesti = gameState?.punti_chiamata || 60;

    const puntiChiamante = giocatori[idChiamante]?.punti_fatti || 0;
    const puntiSocio = (idSocio && idSocio !== idChiamante) ? (giocatori[idSocio]?.punti_fatti || 0) : 0;
    const puntiTotaliCoppia = puntiChiamante + puntiSocio;

    const coppiaVince = puntiTotaliCoppia >= puntiRichiesti;

    return (
      <div style={{ color: 'white', background: '#1e293b', padding: '40px', borderRadius: '15px', maxWidth: '600px', margin: '30px auto', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <h1 style={{ fontSize: '36px', color: coppiaVince ? '#10b981' : '#ef4444', margin: '0 0 20px 0' }}>
          {coppiaVince ? '🎉 VITTORIA DEL CHIAMANTE!' : '💀 VITTORIA DELLA DIFESA!'}
        </h1>
        
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '10px', marginBottom: '30px', textAlign: 'left' }}>
          <p style={{ fontSize: '18px', margin: '8px 0' }}>📢 Chiamante: <strong>{giocatori[idChiamante]?.nome}</strong> ({puntiChiamante} punti)</p>
          <p style={{ fontSize: '18px', margin: '8px 0' }}>🤝 Socio nascosto: <strong>{giocatori[idSocio]?.nome || 'Se stesso'}</strong> ({puntiSocio} punti)</p>
          <hr style={{ borderColor: '#334155', margin: '15px 0' }} />
          <p style={{ fontSize: '20px', margin: '8px 0', color: '#f59e0b' }}>📊 Punti fatti dalla coppia: <strong>{puntiTotaliCoppia} / 120</strong></p>
          <p style={{ fontSize: '16px', margin: '8px 0', color: '#94a3b8' }}>🎯 Obiettivo dell'Asta: <strong>{puntiRichiesti} punti</strong></p>
        </div>

        <button 
          onClick={resetMassivoNuovaPartita} 
          style={{ padding: '15px 35px', fontSize: '18px', background: '#10b981', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(16,185,129,0.4)' }}
        >
          🔄 Nuova Partita (Mescola e Rigioca)
        </button>
      </div>
    );
  }

  const tavoloCompleto = cronologiaTavolo.length === 5;
  const mostraSemeRealmente = manoAttuale > 1; // NASCONDE AL PRIMO GIRO

  return (
    <div className="game-board" style={{ color: 'white', padding: '15px' }}>
      
      <div className="game-info" style={{ textAlign: 'center', marginBottom: '20px', background: '#1e293b', padding: '15px', borderRadius: '10px' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#f59e0b' }}>🖐️ Mano numero: {manoAttuale} / 8</h2>
        
        <h3 style={{ margin: '0 0 5px 0' }}>
          💥 Seme di Briscola: {' '}
          <span style={{ color: mostraSemeRealmente ? '#10b981' : '#ef4444', fontStyle: mostraSemeRealmente ? 'normal' : 'italic' }}>
            {mostraSemeRealmente ? nomiSemi[gameState?.semi_briscola] : '❓ Nascosto (Visibile dalla 2° mano)'}
          </span>
        </h3>
        
        <p style={{ margin: '5px 0', color: '#cbd5e1', fontSize: '16px' }}>
          📢 Giocatore che ha chiamato: <strong style={{ color: '#3b82f6' }}>{giocatori[gameState?.chiamante]?.nome || 'In attesa'}</strong>
        </p>
        <p style={{ margin: '5px 0', color: '#cbd5e1' }}>
          🎯 Bersaglio: Il <strong>{nomiValori[gameState?.valore_chiamato]}</strong> | Traguardo: <strong>{gameState?.punti_chiamata} punti</strong>
        </p>
        
        {gameState?.socio && mostraSemeRealmente && (
          <p style={{ margin: '5px 0', color: '#a7f3d0', fontWeight: 'bold' }}>
            🤝 Il Socio è uscito allo scoperto: {giocatori[gameState.socio]?.nome}!
          </p>
        )}

        <p style={{ margin: '10px 0 0 0', borderTop: '1px solid #334155', paddingTop: '5px' }}>
          Turno attuale di: <strong style={{ color: '#10b981' }}>{giocatori[gameState?.giocatore_corrente]?.nome || gameState?.giocatore_corrente}</strong>
        </p>
      </div>

      <div className="players-scores" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
        {Object.entries(giocatori).map(([id, dati]) => (
          <div key={id} style={{ background: gameState?.giocatore_corrente === id ? '#047857' : '#1e293b', padding: '10px 15px', borderRadius: '8px', textAlign: 'center', border: localPlayerId === id ? '2px solid #3b82f6' : 'none' }}>
            <div style={{ fontWeight: 'bold' }}>{dati.nome} {localPlayerId === id && "(Tu)"}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
              🏆 Punti: {dati.punti_fatti || 0}
            </div>
          </div>
        ))}
      </div>

      <div className="table-center" style={{ background: '#064e3b', padding: '25px', borderRadius: '15px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)', minHeight: '260px' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 15px 0', color: '#a7f3d0' }}>Carte sul banco (Da sinistra a destra)</h3>
        
        <div className="played-cards" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {cronologiaTavolo.map(({ giocatoreId, carta }, ordine) => (
            <div key={ordine} style={{ textAlign: 'center', border: '1px solid #065f46', padding: '5px', borderRadius: '10px', background: '#022c22' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>#{ordine + 1}</div>
              <div style={{ fontSize: '14px', marginBottom: '5px', fontWeight: 'bold', color: '#10b981' }}>{giocatori[giocatoreId]?.nome}</div>
              {renderCardImage(carta)}
            </div>
          ))}
        </div>

        {tavoloCompleto && (
          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <button onClick={calcolaPresaEDisponi} style={{ padding: '12px 25px', fontSize: '16px', background: '#f59e0b', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              📥 Assegna Punti e Raccogli Tavolo
            </button>
          </div>
        )}
      </div>

      <div className="local-player-hand" style={{ marginTop: '30px', textAlign: 'center' }}>
        <h3>Le tue carte rimaste:</h3>
        <div className="cards-container" style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
          {localPlayer?.carte?.map((card, index) => (
            <button key={index} disabled={!isMyTurn || tavoloCompleto} onClick={() => handlePlayCard(card)} style={{ background: 'none', border: 'none', padding: 0, cursor: (isMyTurn && !tavoloCompleto) ? 'pointer' : 'not-allowed', opacity: isMyTurn ? 1 : 0.6 }}>
              {renderCardImage(card)}
            </button>
          ))}
        </div>
        {isMyTurn && !tavoloCompleto ? (
          <p style={{ color: '#10b981', fontWeight: 'bold', marginTop: '10px' }}>⚠️ È il tuo turno, lancia una carta!</p>
        ) : (
          <p style={{ color: '#94a3b8', marginTop: '10px' }}>{tavoloCompleto ? "Tavolo pronto per il conteggio." : "Attendi il tuo turno di gioco..."}</p>
        )}
      </div>
    </div>
  );
}