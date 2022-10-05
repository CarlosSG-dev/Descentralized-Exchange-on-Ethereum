import React, { useState, useEffect } from "react";
import Header from './Header.js';
import Footer from './Footer.js';
import Wallet from './Wallet.js';
import NewOrder from './NewOrder.js';
import AllOrders from './AllOrders.js';
import MyOrders from './MyOrders.js';
import AllTrades from './AllTrades.js';

const SIDE = {
  BUY: 0,
  SELL: 1
};

function App({web3, accounts, contracts}) {
  //1.1.Definimos el estado de los tokens i definimos un objeto user que almacenara datos como 
  //el token seleccionado
  const [tokens, setTokens] = useState([]);
  const [user, setUser] = useState({
    accounts: [],
    balances: {
      tokenDex: 0,
      tokenWallet: 0
    },
    selectedToken: undefined
  });
  //--------------- IMPLEMENTACION LIBRO DE ORDENES-----------------//
  //Definimos el estado para el libro de ordenes
  const [orders, setOrders] = useState({
    buy: [],
    sell: []
  });
  //Hacemos fetch de las ordenes del contrato inteligente tanto de las 
  //compras como de las ventas
  const getOrders = async token => {
    const orders = await Promise.all([
      contracts.dex.methods
        .getOrders(web3.utils.fromAscii(token.ticker), SIDE.BUY)
        .call(),
      contracts.dex.methods
        .getOrders(web3.utils.fromAscii(token.ticker), SIDE.SELL)
        .call(),
    ]);
    return {buy: orders[0], sell: orders[1]};
  }

  //----------------------------------------------------------------//
  //Definimos el estado de los trades
  const [trades, setTrades] = useState([]);
  //El listener representa la conexión de WebSocket que existe con la blockchain
  const [listener, setListener] = useState(undefined);

  const getBalances = async (account, token) => {
    const tokenDex = await contracts.dex.methods
      .traderBalances(account, web3.utils.fromAscii(token.ticker))
      .call();
    const tokenWallet = await contracts[token.ticker].methods
      .balanceOf(account)
      .call();
    return {tokenDex, tokenWallet};
  }

  
 //Se escuchará el evento NewToken definido en Dex.sol
  const listenToTrades = token => {
    //Necesitamos crear un Set, es decir, un objeto que no permita duplicados
    const tradeIds = new Set();
    setTrades([]);
    //4.1.Creamos un listener para el evento NewTrade y filtramos por el ticker del token
    const listener = contracts.dex.events.NewTrade(
      {
        filter: {ticker: web3.utils.fromAscii(token.ticker)},
        fromBlock: 0
      })
      //Cada vez que haya un nuevo evento NewTrade se ejecutara el callback
      .on('data', newTrade => {
        if(tradeIds.has(newTrade.returnValues.tradeId)) return;
        tradeIds.add(newTrade.returnValues.tradeId);
        setTrades(trades => ([...trades, newTrade.returnValues]));
      });
    //Cancelamos la conexión de websocket anterior si existe actualizando el estado de listener
    setListener(listener);
  }
   //3.1. Función que será llamada cada vez que se cambie el token seleccionado por el usuario
  const selectToken = token => {
    setUser({...user, selectedToken: token});
  }

  const deposit = async amount => {
    await contracts[user.selectedToken.ticker].methods
      .approve(contracts.dex.options.address, amount)
      .send({from: user.accounts[0]});
    await contracts.dex.methods
      .deposit(amount, web3.utils.fromAscii(user.selectedToken.ticker))
      .send({from: user.accounts[0]});
    const balances = await getBalances(
      user.accounts[0],
      user.selectedToken
    );
    setUser(user => ({ ...user, balances}));
  }

  const withdraw = async amount => {
    await contracts.dex.methods
      .withdraw(
        amount, 
        web3.utils.fromAscii(user.selectedToken.ticker)
      )
      .send({from: user.accounts[0]});
    const balances = await getBalances(
      user.accounts[0],
      user.selectedToken
    );
    setUser(user => ({ ...user, balances}));
  }

  //-----------------NewOrder.js IMPLEMENTACION ------------//

  const createMarketOrder = async (amount, side) => {
    await contracts.dex.methods
      .createMarketOrder(
        web3.utils.fromAscii(user.selectedToken.ticker),
        amount,
        side
      )
      .send({from: user.accounts[0]});
    const orders = await getOrders(user.selectedToken);
    setOrders(orders);
  }

  const createLimitOrder = async (amount, price, side) => {
    await contracts.dex.methods
      .createLimitOrder(
        web3.utils.fromAscii(user.selectedToken.ticker),
        amount,
        price,
        side
      )
      .send({from: user.accounts[0]});
    const orders = await getOrders(user.selectedToken);
    setOrders(orders);
  }
//----------------------------------------------------------//

//2.1. hacemos fetch de la lista inicial de tokens, cuando el componente se monta en el DOM,
 // usando useEffect
  useEffect(() => {
    const init = async () => {
      //2.1. obtenemos la lista de tokens desde el contrato
      const rawTokens = await contracts.dex.methods.getTokens().call(); 
      //2.2. creamos un array de tokens para transformarlos de bytes32 a formato ASCII 
      //para que pueda ser leido
      const tokens = rawTokens.map(token => ({
        ...token,
        ticker: web3.utils.hexToUtf8(token.ticker)
      }));
      const [balances, orders] = await Promise.all([
        getBalances(accounts[0], tokens[0]),
        getOrders(tokens[0]),
      ]);
      listenToTrades(tokens[0])
      //2.3 Guardamos el estado de los tokens en el estado de React
      setTokens(tokens);
      setUser({accounts, balances, selectedToken: tokens[0]});
      setOrders(orders);
    }
    init();
  }, []);
//Hook para cuando el usuario cambie de token
  useEffect(() => {
    const init = async () => {
      const [balances, orders] = await Promise.all([
        getBalances(
          user.accounts[0], 
          user.selectedToken
        ),
        getOrders(user.selectedToken),
      ]);
      listenToTrades(user.selectedToken);
      setUser(user => ({ ...user, balances}));
      setOrders(orders);
    }
    if(typeof user.selectedToken !== 'undefined') {
      init();
    }
  }, [user.selectedToken], () => {
    listener.unsubscribe();
  });
  
  //4.1 En principio el estado del token está vacío, por lo que, hasta que se seleccione uno,
  // mostraremos un mensaje de cargando
  if(typeof user.selectedToken === 'undefined') {
    return <div>Cargando...</div>;
  }

  return (
    <div id="app">
      <Header
        contracts={contracts}
        tokens={tokens}
        user={user}
        selectToken={selectToken}
      />
      <main className="container-fluid">
        <div className="row">
          <div className="col-sm-4 first-col">
            <Wallet 
              user={user}
              deposit={deposit}
              withdraw={withdraw}
            />
            {user.selectedToken.ticker !== 'DAI' ? (
              <NewOrder 
                createMarketOrder={createMarketOrder}
                createLimitOrder={createLimitOrder}
              />
            ) : null}
          </div>
          {user.selectedToken.ticker !== 'DAI' ? (
            <div className="col-sm-8">
              <AllTrades 
                trades={trades}
              />
              <AllOrders 
                orders={orders}
              />
              <MyOrders 
                orders={{
                  buy: orders.buy.filter(
                    order => order.trader.toLowerCase() === accounts[0].toLowerCase()
                  ),
                  sell: orders.sell.filter(
                    order => order.trader.toLowerCase() === accounts[0].toLowerCase()
                  )
                }}
              />
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
