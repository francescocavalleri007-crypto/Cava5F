import { StrictMode } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css' 
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// queste librerie sono in una sottocartella installate con npm install... sono locali e stanno in node_modules

createRoot(document.getElementById('root')).render(
  <StrictMode> 
    <App />
  </StrictMode>,
)// StrictMode è come un componente HTML che deriva dalla libreria 'react'
// App è un tag esportato 

/*
-- da fare nella cartella che conterrà la cartella del progetto
COMANDO: npm create vite@latest nome-progetto
(
1- cd nome-progetto
2- npm install
3- npm run nome-script ( normalmente dev) --> potrebbe anche essere build
)
npm --> funziona solo se nodejs installato
*/