import React, { useState, useEffect } from 'react';
import {Button} from 'react-bootstrap';
import { db } from './firebase.js';
import { doc, setDoc, onSnapshot } from "firebase/firestore";
//creiamo qui un componente da proiettare sotto nell'html
const BoxStatoDb = ({colore, testo}) =>{
  return(
    <div className='card text-center w-100' style={{width: '18rem'}}>
      <div className='card-body' style={{backgroundColor:colore}}>
        <h5 className = 'card-title'>{testo || "In attesa:"}</h5>
      </div>
    </div>
  );
};
function App() {
  const [inputTesto, setInputTesto] = useState(""); //useState ha come ingresso il valore iniziale. [nome dello stato, set Nome dello stato]
  const [inputColore, setInputColore] = useState("#aaa");
  const [statoRemoto, setStatoRemoto] = useState({  messaggio: "" , colore: "#aaa"}); // Stato da Firebase 
  // JSON che comprende i due valori su db




  // LETTURA ASINCRONA DAL DB
  useEffect(()=>{
    const funzioneListener = onSnapshot(doc(db,"Informazioni","Stato"),(documento)=>{
      if(documento.exists){
        setStatoRemoto(documento.data());
      }
    }); // Snapshot = scatto, in questo caso cambiamento su un ramo. Ci restituiscono lo "scatto" dei nuovi dati
    return () => funzioneListener();
  },[]);
  const inviaDati = async () => { // funzioni considerate come var --> async e await ultima versione di javascript modulare --> sup. promise
    try {
      await setDoc(doc(db, "Informazioni","Stato"), { // chiama una funzione asincrona di Firebase 
        messaggio: inputTesto,
        colore: inputColore
      }); // quando uso await sono obbligato a dichiarare la funzione che lo ospita come async.
      // quando sono qui sono sicuro di avere settato il documento ( è come se fossi nel then della promise)
    } catch (e) {
      console.error("Errore: ", e);
    }
  };

  return (
    <div>
      <h1>React + Firebase Firestore</h1>
      <div>
        <div className='row'>
          <div className='col col-6'>
            <h3>Messaggio+colore</h3>
            <input 
              type="text" 
              value={inputTesto}
              onChange={(e) => setInputTesto(e.target.value)}
              placeholder="Scrivi un messaggio..."
            />
            <input className='ms-3'
              type="color" 
              value={inputColore}
              onChange = {(e) => setInputColore(e.target.value)}
            />
            <Button onClick={inviaDati} variant='success'>Invia a Firestore</Button>
          </div>
          <div className='col col-6'>
            <h3>Stato dal Database:</h3>
            <BoxStatoDb
              colore={statoRemoto.colore}
              testo={statoRemoto.messaggio}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; // esporta il componente per farlo usare ad altri file

