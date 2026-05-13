import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { db } from './firebase.js';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import './Scacchiera.css'; 

const Scacchiera = ({ gameId }) => {
  const [game, setGame] = useState(new Chess());
  const [evidenziate, setEvidenziate] = useState([]);

  // 1. SINCRONIZZAZIONE REAL-TIME CON FIREBASE
  useEffect(() => {
    // Nota: Ho lasciato l'ID fisso come nel tuo esempio, 
    // ma l'ideale sarebbe usare doc(db, "partite", gameId)
    const unsub = onSnapshot(doc(db, "partite", "nPtYr2ABVCGcmCPqsu2g"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newGame = new Chess(data.fen);
        setGame(newGame);
      }
    });
    return () => unsub();
  }, [gameId]);

  const resetGame = async () => {
    const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    try {
      // 1. Aggiorna Firebase
      const gameRef = doc(db, "partite", "nPtYr2ABVCGcmCPqsu2g");
      await updateDoc(gameRef, {
        fen: startingFen,
        turn: 'w',
        status: 'ongoing',
        lastMove: null // Opzionale: pulisce l'ultima mossa
      });

      // 2. Aggiorna lo stato locale
      setGame(new Chess(startingFen));
      setEvidenziate([]);
      
      console.log("Partita resettata con successo!");
    } catch (e) {
      console.error("Errore durante il reset:", e);
    }
  };
  // 2. GESTIONE DELLA MOSSA
  const onDrop = async (sourceSquare, targetSquare) => {
    const gameCopy = new Chess(game.fen());
    
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', 
      });

      if (move) {
        await updateDoc(doc(db, "partite", "nPtYr2ABVCGcmCPqsu2g"), {
          fen: gameCopy.fen(),
          turn: gameCopy.turn(),
          lastMove: { from: sourceSquare, to: targetSquare },
          status: gameCopy.isCheckmate() ? "checkmate" : "ongoing"
        });
      }
    } catch (e) {
      console.log("Mossa non valida");
    }
    setEvidenziate([]);
  };

  const mostraSuggerimenti = (square) => {
    const moves = game.moves({ square, verbose: true });
    setEvidenziate(moves.map(m => m.to));
  };

  // 3. RENDERING
  return (
    <div className="chess-container">
      <div className="status-messages">
        {game.isCheckmate() && <h3 className="alert-danger">SCACCO MATTO!</h3>}
        {game.isStalemate() && <h3 className="alert-warning">PATTA!</h3>}
        {game.isCheck() && !game.isCheckmate() && <h3 className="alert-danger">Re sotto scacco!</h3>}
        <button className="reset-btn" onClick={resetGame}> Reset </button>
        <h3 className="turn-indicator">
          Tocca al: <strong>{game.turn() === 'w' ? 'Bianco (W)' : 'Nero (B)'}</strong>
        </h3>
      </div>

      <table className="scacchiera-table" onContextMenu={(e) => e.preventDefault()}>
        <tbody>
          {game.board().map((riga, i) => (
            <tr key={i}>
              {riga.map((cella, j) => {
                const squareName = `${String.fromCharCode(97 + j)}${8 - i}`;
                const isScura = (i + j) % 2 !== 0;
                const isEvidenziata = evidenziate.includes(squareName);

                return (
                  <td
                    key={squareName}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(window.draggedSquare, squareName)}
                    className={`cella ${isScura ? 'scura' : 'chiara'} ${isEvidenziata ? 'evidenziata' : ''}`}
                  >
                    {cella && (
                      <img
                        /* LOGICA NOMI FILE: w -> W, b -> B */
                        src={`/img/${getPieceName(cella.type)}${cella.color === 'w' ? 'W' : 'B'}.png`}
                        className="piece-img"
                        draggable
                        onDragStart={() => {
                          window.draggedSquare = squareName;
                          mostraSuggerimenti(squareName);
                        }}
                        onDragEnd={() => setEvidenziate([])}
                        alt={`${cella.type}${cella.color}`}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const getPieceName = (type) => {
  const nomi = {
    p: 'Pedone',
    r: 'Torre',
    n: 'Cavallo',
    b: 'Alfiere',
    q: 'Regina',
    k: 'Re',
  };
  return nomi[type];
};

export default Scacchiera;