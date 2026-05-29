import React, { useState, useEffect } from 'react';

export function BiddingOverlay({ gameState, localPlayerId, updateGame }) {
  const giocatori = gameState?.Players || {};
  const localPlayer = giocatori?.[localPlayerId];
  const isMyTurn = gameState?.giocatore_corrente === localPlayerId;
  
  const ordineValori = ['1', '3', '10', '9', '8', '7', '6', '5', '4', '2'];
  const nomiValori = { '1': 'Asso', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': 'Fante', '9': 'Cavallo', '10': 'Re' };
  const nomiSemi = { O: 'Ori/Denari', C: 'Coppe', S: 'Spade', B: 'Bastoni' };

  const valoreAttuale = gameState?.valore_chiamato || ''; 
  const puntiAttuali = gameState?.punti_chiamata || 60;     
  const passati = gameState?.giocatori_passati || [];      
  const indexAttuale = valoreAttuale ? ordineValori.indexOf(valoreAttuale) : -1;

  const [sceltaPunti, setSceltaPunti] = useState(puntiAttuali + 1);

  // 🛠️ STATI AGGIUNTI SOLO PER PERMETTERE LA MODIFICA NELLA SCHERMATA DI BRISCOLA
  const [modificaAttiva, setModificaAttiva] = useState(false);
  const [cartaModificata, setCartaModificata] = useState(valoreAttuale || '1');
  const [puntiModificati, setPuntiModificati] = useState(puntiAttuali || 60);

  // Sincronizza i selettori quando cambia lo stato del gioco
  useEffect(() => {
    if (valoreAttuale) setCartaModificata(valoreAttuale);
    if (puntiAttuali) setPuntiModificati(puntiAttuali);
  }, [valoreAttuale, puntiAttuali]);

  // 🛠️ INTERCETTAZIONE SILENTE: Se 4 hanno passato e nessuno ha chiamato, il client salva l'ultimo giocatore prima del blocco server
  useEffect(() => {
    if (passati.length === 4 && !passati.includes(localPlayerId) && !valoreAttuale) {
      // Invia subito un'apertura tecnica standard (Asso a 60) a nome dell'ultimo giocatore.
      // Questo sblocca il server e porta il gioco alla fase 'scelta_briscola' senza glitch.
      updateGame({
        valore_chiamato: '1',
        punti_chiamata: 60,
        chiamante: localPlayerId,
        giocatore_corrente: localPlayerId,
        fase: 'scelta_briscola'
      });
    }
  }, [passati, valoreAttuale, localPlayerId]);

  useEffect(() => {
    setSceltaPunti(puntiAttuali + 1);
  }, [puntiAttuali]);

  const renderCardImage = (code) => {
    if (!code) return null;
    return (
      <img 
        src={`/carte/${code}.png`} 
        alt={code}
        style={{ width: '75px', height: '115px', borderRadius: '6px', boxShadow: '0 3px 8px rgba(0,0,0,0.4)' }} 
      />
    );
  };

  const calcolaProssimoGiocatore = (attualeId) => {
    let currentNum = parseInt(attualeId.replace('G', ''), 10);
    let tentativi = 0;
    while (tentativi < 5) {
      currentNum = (currentNum % 5) + 1;
      const prossimoId = `G${currentNum}`;
      if (!passati.includes(prossimoId)) return prossimoId;
      tentativi++;
    }
    return attualeId;
  };

  const handleChiamaValore = async (nuovoValore) => {
    const prossimoGiocatore = calcolaProssimoGiocatore(localPlayerId);
    await updateGame({
      valore_chiamato: nuovoValore,
      punti_chiamata: 60, 
      giocatore_corrente: prossimoGiocatore,
      chiamante: localPlayerId 
    });
  };

  const handleRilanciaPunti = async () => {
    if (sceltaPunti <= puntiAttuali || !valoreAttuale) return;
    const prossimoGiocatore = calcolaProssimoGiocatore(localPlayerId);
    
    const aggiornamenti = {
      punti_chiamata: sceltaPunti,
      giocatore_corrente: prossimoGiocatore,
      chiamante: localPlayerId 
    };

    if (sceltaPunti === 120) {
      aggiornamenti.fase = 'scelta_briscola';
    }
    await updateGame(aggiornamenti);
  };

  const handlePassa = async () => {
    const nuoviPassati = [...passati, localPlayerId];
    if (nuoviPassati.length === 4) {
      const tuttiID = ['G1', 'G2', 'G3', 'G4', 'G5'];
      const superstite = tuttiID.find(id => !nuoviPassati.includes(id)) || gameState.chiamante || localPlayerId;

      await updateGame({
        giocatori_passati: nuoviPassati,
        chiamante: superstite,
        giocatore_corrente: superstite, 
        fase: 'scelta_briscola'
      });
    } else {
      const prossimoGiocatore = calcolaProssimoGiocatore(localPlayerId);
      await updateGame({
        giocatori_passati: nuoviPassati,
        giocatore_corrente: prossimoGiocatore
      });
    }
  };

  const handleScegliSeme = async (seme) => {
    await updateGame({
      semi_briscola: seme,
      fase: 'gioco',
      socio: '', 
      giocatore_corrente: gameState.chiamante 
    });
  };

  // 🛠️ FUNZIONE AGGIUNTA SOLO PER APPLICARE LA MODIFICA DELLA CARTA NELLA FASE FINALE
  const handleApplicaModificaCarta = async () => {
    await updateGame({
      valore_chiamato: cartaModificata,
      punti_chiamata: puntiModificati
    });
    setModificaAttiva(false);
  };

  if (gameState?.fase === 'scelta_briscola') {
    const isChiamante = gameState.chiamante === localPlayerId;
    return (
      <div className="bidding-overlay" style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', color: 'white', maxWidth: '500px', margin: '20px auto', textAlign: 'center' }}>
        <h2>🏆 Asta Conclusa!</h2>
        <p>Vincitore dell'Asta: <strong>{giocatori[gameState.chiamante]?.nome || gameState.chiamante}</strong></p>
        
        {/* Sezione dichiarazione aggiornata con supporto alla modifica in tempo reale */}
        <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', margin: '15px 0' }}>
          {modificaAttiva ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Cambia la carta da cercare:</label>
              <select value={cartaModificata} onChange={(e) => setCartaModificata(e.target.value)} style={{ padding: '6px', borderRadius: '4px', background: '#1e293b', color: 'white', border: '1px solid #475569' }}>
                {ordineValori.map(v => <option key={v} value={v}>{nomiValori[v]}</option>)}
              </select>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Cambia i punti della dichiarazione:</label>
              <input type="number" min={60} max={120} value={puntiModificati} onChange={(e) => setPuntiModificati(Math.max(60, Math.min(120, parseInt(e.target.value, 10) || 60)))} style={{ padding: '6px', borderRadius: '4px', background: '#1e293b', color: 'white', border: '1px solid #475569', fontWeight: 'bold' }} />
              <button onClick={handleApplicaModificaCarta} style={{ padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Salva Modifiche</button>
            </div>
          ) : (
            <>
              <p style={{ margin: '5px 0' }}>Dichiarazione: <strong style={{ color: '#f59e0b' }}>{nomiValori[valoreAttuale]}</strong> a <strong style={{ color: '#3b82f6' }}>{puntiAttuali} punti</strong></p>
              {isChiamante && passati.length === 4 && (
                <button onClick={() => setModificaAttiva(true)} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', marginTop: '5px' }}>
                  ✏️ Modifica carta o punti prima di scegliere il seme
                </button>
              )}
            </>
          )}
        </div>

        {isChiamante ? (
          <div style={{ marginTop: '25px', background: '#0f172a', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: '#10b981', margin: '0 0 15px 0' }}>Scegli il Seme di Briscola (Verrà nascosto al 1° giro):</h3>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {Object.entries(nomiSemi).map(([codice, nome]) => (
                <button key={codice} onClick={() => handleScegliSeme(codice)} style={{ padding: '12px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {nome}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', marginTop: '20px' }}>Attendi che il chiamante scelga il seme segreto...</p>
        )}
      </div>
    );
  }

  const sonoPassato = passati.includes(localPlayerId);

  return (
    <div className="bidding-overlay" style={{ background: '#1e293b', padding: '25px', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.5)', color: 'white', maxWidth: '550px', margin: '20px auto' }}>
      <h2 style={{ textAlign: 'center', margin: '0 0 15px 0' }}>📢 Fase di Asta</h2>
      
      <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
        <p style={{ margin: '4px 0' }}>Carta sotto asta: <strong style={{ color: '#f59e0b', fontSize: '18px' }}>{nomiValori[valoreAttuale] || 'Nessuna'}</strong></p>
        <p style={{ margin: '4px 0' }}>Punti attuali della carta: <strong style={{ color: '#3b82f6', fontSize: '18px' }}>{puntiAttuali}</strong></p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#94a3b8' }}>Miglior offerente attuale: <strong>{giocatori[gameState?.chiamante]?.nome || 'Nessuno'}</strong></p>
        <p style={{ margin: '4px 0', fontSize: '14px', color: '#10b981' }}>Tocca a: <strong>{giocatori[gameState?.giocatore_corrente]?.nome || gameState?.giocatore_corrente}</strong></p>
      </div>

      {isMyTurn && !sonoPassato ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {valoreAttuale ? (
            <>
              {valoreAttuale !== '2' && (
                <div style={{ border: '1px solid #334155', padding: '12px', borderRadius: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#cbd5e1' }}>
                    Offri una carta inferior (Batte i {puntiAttuali} punti attuali e resetta a 60):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {ordineValori.slice(indexAttuale + 1).map((val) => (
                      <button key={val} onClick={() => handleChiamaValore(val)} style={{ padding: '6px 10px', background: '#d97706', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                        {nomiValori[val]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ border: '1px solid #334155', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#cbd5e1' }}>
                  Rilancia sui punti per l'attuale carta ({nomiValori[valoreAttuale]}):
                </label>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="number" 
                    min={puntiAttuali + 1} 
                    max={120} 
                    value={sceltaPunti} 
                    onChange={(e) => setSceltaPunti(Math.max(puntiAttuali + 1, Math.min(120, parseInt(e.target.value, 10) || (puntiAttuali + 1))))}
                    style={{ width: '65px', padding: '6px', borderRadius: '5px', border: '1px solid #475569', background: '#0f172a', color: 'white', fontSize: '15px', fontWeight: 'bold', textAlign: 'center' }}
                  />
                  <button onClick={handleRilanciaPunti} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    Rilancia a {sceltaPunti} Punti
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ border: '1px solid #334155', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#cbd5e1' }}>
                Inaugura l'asta chiamando una carta a partire da 60 punti:
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {ordineValori.map((val) => (
                  <button key={val} onClick={() => handleChiamaValore(val)} style={{ padding: '6px 10px', background: '#d97706', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    {nomiValori[val]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handlePassa} style={{ padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}>
            ❌ Passa il turno
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#94a3b8', margin: '10px 0 20px 0', padding: '10px', background: sonoPassato ? '#3b1e1e' : 'none', borderRadius: '6px' }}>
          {sonoPassato ? "🔴 Hai passato! Segui la fine dell'asta." : "Attendi il tuo turno per parlare..."}
        </div>
      )}

      <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '2px dashed #334155' }}>
        <h4 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#cbd5e1' }}>🃏 Le tue carte in mano:</h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {localPlayer?.carte?.map((card, index) => <div key={index}>{renderCardImage(card)}</div>)}
        </div>
      </div>
    </div>
  );
}