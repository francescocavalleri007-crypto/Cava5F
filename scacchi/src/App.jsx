import React from 'react';
import Scacchiera from './Scacchiera.jsx';

function App() {
  // Questo ID deve corrispondere a un documento dentro la collezione "games" di Firestore
  const gameId = "partita_locale_001"; 

  return (
    <div className="App" style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <div>
        <h1>Scacchiera con Firebase</h1>
        <Scacchiera gameId={gameId} />
      </div>
    </div>
  );
}

export default App;