import React, { useState, useEffect } from "react";
import { getWeb3, getContracts } from './utils.js';
import App from './App.js';
import { DoubleOrbit } from 'react-spinner-animated';
import 'react-spinner-animated/dist/index.css'

//Para entender que es un hook y como funciona: 
//https://es.reactjs.org/docs/hooks-overview.html

function LoadingContainer() {
  //1.Definimos las instancias con estado por definir
  const [web3, setWeb3] = useState(undefined);
  const [accounts, setAccounts] = useState([]);
  const [contracts, setContracts] = useState(undefined);

  //2.Definimos el State con el hook de useEffect
  useEffect(() => {
    const init = async () => {
      const web3 = await getWeb3();
      const contracts = await getContracts(web3);
      const accounts = await web3.eth.getAccounts();
      setWeb3(web3);
      setContracts(contracts);
      setAccounts(accounts);
    }
    init();
  // eslint-disable-next-line
  }, []);

  //3. Función que nos dirá si el componente está listo o no
  const isReady = () => {
    return (
      typeof web3 !== 'undefined' 
      && typeof contracts !== 'undefined'
      && accounts.length > 0
    );
  }

  if (!isReady()) {
    return <DoubleOrbit text={"Cargando..."} bgColor={"#FFFFFF"} 
    center={true} width={"150px"} height={"150px"}/>;
  }

  return (
    <App
      web3={web3}
      accounts={accounts}
      contracts={contracts}
    />
  );
}

export default LoadingContainer;
