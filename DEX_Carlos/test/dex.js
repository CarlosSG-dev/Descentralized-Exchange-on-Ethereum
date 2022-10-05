const { expectRevert } = require('@openzeppelin/test-helpers');
const Dai = artifacts.require('mocks/Dai.sol');
const Bat = artifacts.require('mocks/Bat.sol');
const Rep = artifacts.require('mocks/Rep.sol');
const Zrx = artifacts.require('mocks/Zrx.sol');
const Dex = artifacts.require('Dex.sol');

const SIDE = {
  BUY: 0,
  SELL: 1
};
//Devolvera un array de 3 nuevas intancias de contract
contract('Dex', (accounts) => { //Extraemos la lista de adresses (accounts)
  let dai, bat, rep, zrx, dex;
  const [trader1, trader2] = [accounts[1], accounts[2]]; //accounts[0] sería el admin, extraemos 2 direcciones
  const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX']
    .map(ticker => web3.utils.fromAscii(ticker));

  beforeEach(async() => {
    ([dai, bat, rep, zrx] = await Promise.all([
      Dai.new(), 
      Bat.new(), 
      Rep.new(), 
      Zrx.new()
    ]));
    dex = await Dex.new();
    await Promise.all([
      dex.addToken(DAI, dai.address),
      dex.addToken(BAT, bat.address),
      dex.addToken(REP, rep.address),
      dex.addToken(ZRX, zrx.address)
    ]);

    const amount = web3.utils.toWei('1000'); //cantidad a añadir de tokens ERC20, toWei creará una cantidad de X partes de ether
    const seedTokenBalance = async (token, trader) => { //Función que añade tokens a X adress o dirección
      await token.faucet(trader, amount)
      await token.approve(
        dex.address, 
        amount, 
        {from: trader}
      );
    };
    await Promise.all(
      [dai, bat, rep, zrx].map(
        token => seedTokenBalance(token, trader1) 
      )
    );
    await Promise.all(
      [dai, bat, rep, zrx].map(
        token => seedTokenBalance(token, trader2) 
      )
    );
  });

  //----------------------- TEST deposit() ---------------------//
  it('Deberia depositar tokens', async () => {
    const amount = web3.utils.toWei('100');

    await dex.deposit(
      amount,
      DAI,
      {from: trader1}
    );

    const balance = await dex.traderBalances(trader1, DAI);
    assert(balance.toString() === amount);
  });

  it('NO deberia depositar tokens si el token no existe', async () => {
    await expectRevert(
      dex.deposit(
        web3.utils.toWei('100'),
        web3.utils.fromAscii('TokenNoExistente'),
        {from: trader1}
      ),
      'Este token no existe'
    );
  });
  //----------------------- TEST withdraw() ---------------------//
  //1  
  it('should withdraw tokens', async () => {
    const amount = web3.utils.toWei('100');

    await dex.deposit(
      amount,
      DAI,
      {from: trader1}
    );

    await dex.withdraw(
      amount,
      DAI,
      {from: trader1}
    );

    const [balanceDex, balanceDai] = await Promise.all([
      dex.traderBalances(trader1, DAI),
      dai.balanceOf(trader1)
    ]);
    assert(balanceDex.isZero());
    assert(balanceDai.toString() === web3.utils.toWei('1000')); 
  });
  //2
  it('No deberia sacar tokens si el balance es insuficiente', async () => {
    await expectRevert(
      dex.withdraw(
        web3.utils.toWei('1000'),
        web3.utils.fromAscii('TokenNoExistente'),
        {from: trader1}
      ),
      'Este token no existe'
    );
  });
  //3
  it('No deberia sacar tokens si el balance es insuficiente', async () => {
    await dex.deposit(
      web3.utils.toWei('100'),
      DAI,
      {from: trader1}
    );

    await expectRevert(
      dex.withdraw(
        web3.utils.toWei('1000'),
        DAI,
        {from: trader1}
      ),
      'El balance es insuficiente'
    );
  });

  //----------------------- TEST createLimitOrder() ---------------------//
  // it('Deberia crearse limit order', async () => {
  //   await dex.deposit(
  //     web3.utils.toWei('100'),
  //     DAI,
  //     {from: trader1}
  //   );
  
  //   await dex.createLimitOrder(
  //     REP,
  //     web3.utils.toWei('10'),
  //     10,
  //     SIDE.BUY,
  //     {from: trader1}
  //   );
  
  //   let buyOrders = await dex.getOrders(REP, SIDE.BUY);
  //   let sellOrders = await dex.getOrders(REP, SIDE.SELL);
  //   assert(buyOrders.length === 1);
  //   assert(buyOrders[0].trader === trader1);
  //   assert(buyOrders[0].ticker === web3.utils.padRight(REP, 64));
  //   assert(buyOrders[0].price === '10');
  //   assert(buyOrders[0].amount === web3.utils.toWei('10'));
  //   assert(sellOrders.length === 0);
  
  //   await dex.deposit(
  //     web3.utils.toWei('200'),
  //     DAI,
  //     {from: trader2}
  //   );
  
  //   await dex.createLimitOrder(
  //     REP,
  //     web3.utils.toWei('10'),
  //     11,
  //     SIDE.BUY,
  //     {from: trader2}
  //   );
  
  //   buyOrders = await dex.getOrders(REP, SIDE.BUY);
  //   sellOrders = await dex.getOrders(REP, SIDE.SELL);
  //   assert(buyOrders.length === 2);
  //   assert(buyOrders[0].trader === trader2);
  //   assert(buyOrders[1].trader === trader1);
  //   assert(sellOrders.length === 0);
  
  //   await dex.deposit(
  //     web3.utils.toWei('200'),
  //     DAI,
  //     {from: trader2}
  //   );
  
  //   await dex.createLimitOrder(
  //     REP,
  //     web3.utils.toWei('10'),
  //     9,
  //     SIDE.BUY,
  //     {from: trader2}
  //   );
  
  //   buyOrders = await dex.getOrders(REP, SIDE.BUY);
  //   sellOrders = await dex.getOrders(REP, SIDE.SELL);
  //   assert(buyOrders.length === 3);
  //   assert(buyOrders[0].trader === trader2);
  //   assert(buyOrders[1].trader === trader1);
  //   assert(buyOrders[2].trader === trader2);
  //   assert(sellOrders.length === 0);
  // });

  // it('NO se deberia crear el limit order si el balance del token es insuficiente', async () => {
  //   await dex.deposit(
  //     web3.utils.toWei('99'),
  //     REP,
  //     {from: trader1}
  //   );

  //   await expectRevert(
  //     dex.createLimitOrder(
  //       REP,
  //       web3.utils.toWei('100'),
  //       10,
  //       SIDE.SELL,
  //       {from: trader1}
  //     ),
  //     'Balance del token insuficiente'
  //   );
  // });

  // it('NO deberia crearse limit order si el balance de DAI es insuficiente', async () => {
  //   await dex.deposit(
  //     web3.utils.toWei('99'),
  //     DAI,
  //     {from: trader1}
  //   );

  //   await expectRevert(
  //     dex.createLimitOrder(
  //       REP,
  //       web3.utils.toWei('10'),
  //       10,
  //       SIDE.BUY,
  //       {from: trader1}
  //     ),
  //     'Balance de DAI insuficiente'
  //   );
  // });

  // it('NO deberia crearse una limit order si el token es DAI', async () => {
  //   await expectRevert(
  //     dex.createLimitOrder(
  //       DAI,
  //       web3.utils.toWei('1000'),
  //       10,
  //       SIDE.BUY,
  //       {from: trader1}
  //     ),
  //     'No se puede tradear DAI'
  //   );
  // });

  // it('NO se deberia crear una limit order si el token no existe', async () => {
  //   await expectRevert(
  //     dex.createLimitOrder(
  //       web3.utils.fromAscii('Token-Inexistente'),
  //       web3.utils.toWei('1000'),
  //       10,
  //       SIDE.BUY,
  //       {from: trader1}
  //     ),
  //     'Este token no existe'
  //   );
  // });
  // //----------------------------- TEST createMarketOrder() ----------------------//
  // it('Deberia crear una Market Order y concordar con los precios', async () => {
  //   await dex.deposit(
  //     web3.utils.toWei('100'),
  //     DAI,
  //     {from: trader1}
  //   );
  
  //   await dex.createLimitOrder(
  //     BAT,
  //     web3.utils.toWei('10'),
  //     10,
  //     SIDE.BUY,
  //     {from: trader1}
  //   );
  
  //   await dex.deposit(
  //     web3.utils.toWei('100'),
  //     BAT,
  //     {from: trader2}
  //   );
  
  //   await dex.createMarketOrder(
  //     BAT,
  //     web3.utils.toWei('5'),
  //     SIDE.SELL,
  //     {from: trader2}
  //   );
  
  //   const balances = await Promise.all([
  //     dex.traderBalances(trader1, DAI),
  //     dex.traderBalances(trader1, BAT),
  //     dex.traderBalances(trader2, DAI),
  //     dex.traderBalances(trader2, BAT),
  //   ]);
  //   const orders = await dex.getOrders(BAT, SIDE.BUY);
  //   assert(orders.length === 1);
  //   assert(orders[0].filled = web3.utils.toWei('5'));
  //   assert(balances[0].toString() === web3.utils.toWei('50'));
  //   assert(balances[1].toString() === web3.utils.toWei('5'));
  //   assert(balances[2].toString() === web3.utils.toWei('50'));
  //   assert(balances[3].toString() === web3.utils.toWei('95'));
  // });

  // it('NO deberia crearse una Market Order si el baalance del token es insuficiente', async () => {
  //   await expectRevert(
  //     dex.createMarketOrder(
  //       REP,
  //       web3.utils.toWei('101'),
  //       SIDE.SELL,
  //       {from: trader2}
  //     ),
  //     'Balance del token insuficiente'
  //   );
  // });

  // it('NO deberia crearse market order si el balance de DAI es insuficiente', async () => {
  //   await dex.deposit(
  //     web3.utils.toWei('100'),
  //     REP,
  //     {from: trader1}
  //   );
  
  //   await dex.createLimitOrder(
  //     REP,
  //     web3.utils.toWei('100'),
  //     10,
  //     SIDE.SELL,
  //     {from: trader1}
  //   );

  //   await expectRevert(
  //     dex.createMarketOrder(
  //       REP,
  //       web3.utils.toWei('101'),
  //       SIDE.BUY,
  //       {from: trader2}
  //     ),
  //     'Balance de DAI insuficiente'
  //   );
  // });

  // it('No deberia crear una market order si el token es DAI', async () => {
  //   await expectRevert(
  //     dex.createMarketOrder(
  //       DAI,
  //       web3.utils.toWei('1000'),
  //       SIDE.BUY,
  //       {from: trader1}
  //     ),
  //     'NO se puede tradear DAI'
  //   );
  // });

  // it('NO se deberia crear una market order si el token no existe', async () => {
  //   await expectRevert(
  //     dex.createMarketOrder(
  //       web3.utils.fromAscii('Token-Inexistente'),
  //       web3.utils.toWei('1000'),
  //       SIDE.BUY,
  //       {from: trader1}
  //     ),
  //     'Este token no existe'
  //   );
  // });
});


