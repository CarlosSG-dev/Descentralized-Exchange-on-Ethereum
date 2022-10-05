import React, { useState } from 'react';

const DIRECTION = {
  WITHDRAW: 'WITHDRAW',
  DEPOSIT: 'DEPOSIT'
};
//Función para depositar o retirar tokens entre la wallet y el contrato inteligente del exchange
//deposit,withdraw y user en la función wallet son Props, es decir,
//objetos que se pasan como parámetros a la función para pasar información 
//entre componentes
function Wallet({deposit, withdraw, user}) {
  //creamos el estado tanto de la cantidad como de la acción a realizar (depositar o retirar)
  const [direction, setDirection] = useState(DIRECTION.DEPOSIT);
  const [amount, setAmount] = useState(0);

  const onSubmit = (e) => {
    e.preventDefault();
    if(direction === DIRECTION.DEPOSIT) {
      deposit(amount);
    } else {
      withdraw(amount);
    }
  }

  return (
    //HTML donde se muestran el balance de tokens del usuario y el del dex,
    //y un formulario para depositar o retirar tokens
    <div id="wallet" className="card">
      <h2 className="card-title">Wallet</h2>
      <h3>Balance del token {user.selectedToken.ticker}</h3>
      <div className="form-group row">
        <label htmlFor="wallet" className="col-sm-4 col-form-label">Wallet</label>
        <div className="col-sm-8">
          <input 
            className="form-control" 
            id="wallet" 
            disabled 
            value={user.balances.tokenWallet}
          />
        </div>
      </div>
      <div className="form-group row">
        <label htmlFor="contract" className="col-sm-4 col-form-label">DEX</label>
        <div className="col-sm-8">
          <input 
            className="form-control" 
            id="wallet" 
            disabled 
            value={user.balances.tokenDex}
          />
        </div>
      </div>

      <h3>Transferir {user.selectedToken.ticker}</h3>
      <form id="transfer" onSubmit={(e) => onSubmit(e)}>
        <div className="form-group row">
          <label htmlFor="direction" className="col-sm-4 col-form-label">Dirección</label>
          <div className="col-sm-8">
            <div id="direction" className="btn-group" role="group">
              <button 
                type="button" 
                className={`btn btn-secondary ${direction === DIRECTION.DEPOSIT ? 'active' : ''}`}
                onClick={() => setDirection(DIRECTION.DEPOSIT)}
              >Depositar</button>
              <button 
                type="button" 
                className={`btn btn-secondary ${direction === DIRECTION.WITHDRAW ? 'active' : ''}`}
                onClick={() => setDirection(DIRECTION.WITHDRAW)}
              >Retirar</button>
            </div>
          </div>
        </div>
        <div className="form-group row">
          <label htmlFor="amount" className="col-sm-4 col-form-label">Cantidad</label>
          <div className="col-sm-8">
            <div className="input-group mb-3">
              <input 
                id="amount" 
                type="text" 
                className="form-control" 
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="input-group-append">
                <span className="input-group-text">{user.selectedToken.ticker}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <button type="submit" className="btn btn-primary">Enviar</button>
        </div>
      </form>
    </div>
  );
}

export default Wallet;
