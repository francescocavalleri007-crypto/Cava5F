import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { db } from './firebase.js';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import './Scacchiera.css'; 

const Scacchiera = ({ gameId }) => {
  const [game, setGame] = useState(new Chess());
  const [evidenziate, setEvidenziate] = useState([]);
  const [isFlipped, setIsFlipped] = useState(false); // Stato per ruotare la visualizzazione

  // 1. SINCRONIZZAZIONE REAL-TIME CON FIREBASE
  useEffect(() => {
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
      const gameRef = doc(db, "partite", "nPtYr2ABVCGcmCPqsu2g");
      await updateDoc(gameRef, {
        fen: startingFen,
        turn: 'w',
        status: 'ongoing',
        lastMove: null 
      });

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

  // Logica per determinare l'ordine di rendering delle righe e colonne
  const board = game.board();
  const displayBoard = isFlipped ? [...board].reverse() : board;

  return (
    <div className="chess-container">
      <div className="status-messages">
        {game.isCheckmate() && <h3 className="alert-danger">SCACCO MATTO!</h3>}
        {game.isStalemate() && <h3 className="alert-warning">PATTA!</h3>}
        {game.isCheck() && !game.isCheckmate() && <h3 className="alert-danger">Re sotto scacco!</h3>}
        
        <div className="button-group">
          <button className="reset-btn" onClick={resetGame}> Reset </button>
          <button className="flip-btn" onClick={() => setIsFlipped(!isFlipped)}> Gira Scacchiera </button>
        </div>

        <h3 className="turn-indicator">
          Tocca al: <strong>{game.turn() === 'w' ? 'Bianco (W)' : 'Nero (B)'}</strong>
        </h3>
      </div>

      <table className="scacchiera-table" onContextMenu={(e) => e.preventDefault()}>
        <tbody>
          {displayBoard.map((riga, i) => {
            // Se invertito, l'indice i=0 corrisponde alla riga 1, altrimenti alla riga 8
            const actualRowIndex = isFlipped ? i : 7 - i;
            const displayRow = isFlipped ? [...riga].reverse() : riga;

            return (
              <tr key={actualRowIndex}>
                {displayRow.map((cella, j) => {
                  const actualColIndex = isFlipped ? 7 - j : j;
                  const squareName = `${String.fromCharCode(97 + actualColIndex)}${actualRowIndex + 1}`;
                  const isScura = (actualRowIndex + actualColIndex) % 2 === 0;
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const getPieceName = (type) => {
  const nomi = { p: 'Pedone', r: 'Torre', n: 'Cavallo', b: 'Alfiere', q: 'Regina', k: 'Re' };
  return nomi[type];
};

export default Scacchiera;