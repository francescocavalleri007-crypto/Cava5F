import { useState, useEffect } from 'react';
// IMPORTAZIONE DEL DB: Aggiusta il percorso '../firebase' in base a dove hai messo il file di configurazione
import { db } from '../firebase.js'; 
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export function useGameState(gameId) {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    // Usiamo il nome della collezione (es. "partiteBriscolone" o "partite"). 
    // Assicurati che corrisponda al nome esatto che vedi su Firebase.
    const docRef = doc(db, "partiteBriscolone", gameId);

    console.log("Tentativo di connessione a Firestore per la partita:", gameId);

    // Ascolta i cambiamenti in tempo real-time
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        console.log("✅ Dati ricevuti correttamente da Firestore:", docSnap.data());
        setGameState(docSnap.data());
      } else {
        console.error(`⚠️ Il documento con ID "${gameId}" non esiste nella collezione! Controlla se l'ID è corretto.`);
        setGameState(null);
      }
      // Questo spegne tassativamente la scritta "Caricamento partita in corso..."
      setLoading(false); 
    }, (error) => {
      console.error("❌ Errore di connessione/permessi con Firestore:", error);
      setLoading(false);
    });

    // Pulizia dell'ascoltatore quando il componente viene smontato
    return () => unsubscribe();
  }, [gameId]);

  // Funzione per inviare le modifiche delle carte giocate o dell'asta al DB
  const updateGame = async (updatedFields) => {
    try {
      const docRef = doc(db, "partiteBriscolone", gameId);
      await updateDoc(docRef, updatedFields);
      console.log("Aggiornamento inviato con successo:", updatedFields);
    } catch (error) {
      console.error("Errore durante l'aggiornamento del documento su Firebase:", error);
    }
  };

  return { gameState, loading, updateGame };
}