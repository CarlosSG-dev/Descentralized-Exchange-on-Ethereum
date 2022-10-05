pragma solidity 0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Dex {
    enum Side {
        BUY,
        SELL
    }
    //Estructura del token
    struct Token {
        //El ticker es un string corto que representa la abreviación del token, por ejemplo ETH
        bytes32 ticker;
        address tokenAddress;
    }
    
    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint filled;
        uint price;
        uint date;
    }
    
    mapping(bytes32 => Token) public tokens;
    bytes32[] public tokenList;
    //Seguimiento de que i cuantos tokens han sido enviados por X dirección de wallet
    //bytes32 para identificar cada token, uint serà el balance de la wallet
    mapping(address => mapping(bytes32 => uint)) public traderBalances;
    //Mapping para el libro de ordenes de venta/compra, el uint sera 0 o 1 para diferenciar la compra de la venta
   //Order[] sacará los precios ordenados de mejor precio de venta/compra
    mapping(bytes32 => mapping(uint => Order[])) public orderBook;
    address public admin;
    uint public nextOrderId;
    
    //MARKET ORDER
    uint public nextTradeId;
    bytes32 constant DAI = bytes32('DAI');
    
    //Utilizamos indexed para filtrar eventos en el frontend por campos específicos
    event NewTrade(
        uint tradeId,
        uint orderId,
        bytes32 indexed ticker,
        address indexed trader1,
        address indexed trader2,
        uint amount,
        uint price,
        uint date
    );
    
    constructor() {
        admin = msg.sender;
    }
    //Función para que el front end pueda recibir la lista de ordenes del orderbook
    function getOrders(
      bytes32 ticker, 
      Side side) 
      external 
      view
      returns(Order[] memory) {
      return orderBook[ticker][uint(side)];
    }
    //Función que permite al front end recoger la lista de tokens que se puedan tradear
    function getTokens() 
      external 
      view 
      returns(Token[] memory) {
      Token[] memory _tokens = new Token[](tokenList.length);
      for (uint i = 0; i < tokenList.length; i++) {
        _tokens[i] = Token(
          tokens[tokenList[i]].ticker,
          tokens[tokenList[i]].tokenAddress
        );
      }
      return _tokens;
    }
    //Función para añadir el token
    function addToken(
        bytes32 ticker,
        address tokenAddress)
        onlyAdmin()
        external {
        tokens[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }
    
    //Función para recibir los tokens ERC20
    //Podríamos definir una interfaz propia para los tokens ERC20, pero usaremos
    //la de OpenZeppelin, una libreria para solidity que está auditada
    function deposit(
        uint amount,
        bytes32 ticker)
        tokenExist(ticker)
        external {
        IERC20(tokens[ticker].tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        //IMPORTANTE, DESDE SOLIDITY 0.8.0, EL FALLO DE Integer Overflow se ha solucionado
        //Ya no es necesario utilizar SafeMath
        // CAMBIAMOS POR EL FALLO DE Integer Overflow:  
        // traderBalances[msg.sender][ticker].add(amount);
        traderBalances[msg.sender][ticker] += amount;
    }
    
    function withdraw(
        uint amount,
        bytes32 ticker)
        tokenExist(ticker)
        external {
        require(
            traderBalances[msg.sender][ticker] >= amount,
            'Fondos insuficientes'
        ); 
        traderBalances[msg.sender][ticker] -= amount;
        IERC20(tokens[ticker].tokenAddress).transfer(msg.sender, amount);
    }
    
    function createLimitOrder(
        bytes32 ticker,
        uint amount,
        uint price,
        Side side)
        tokenExist(ticker)
        tokenIsNotDai(ticker)
        external {
        if(side == Side.SELL) {
            require(
                traderBalances[msg.sender][ticker] >= amount, 
                'Cantidad del token insuficiente'
            );
        } else {
            require(
                traderBalances[msg.sender][DAI] >= amount * price,
                'Cantidad de DAI insuficiente'
            );
        }
        Order[] storage orders = orderBook[ticker][uint(side)];
        orders.push(Order(
            nextOrderId,
            msg.sender,
            side,
            ticker,
            amount,
            0,
            price,
            block.timestamp 
        ));
        //Algoritmo Bubble sort para ordenar las ordenes de compra venta.
        uint i = orders.length > 0 ? orders.length - 1 : 0;
        while(i > 0) {
            if(side == Side.BUY && orders[i - 1].price > orders[i].price) {
                break;   
            }
            if(side == Side.SELL && orders[i - 1].price < orders[i].price) {
                break;   
            }
            Order memory order = orders[i - 1];
            orders[i - 1] = orders[i];
            orders[i] = order;
            i--;
        }
        nextOrderId++;
    }
    
    function createMarketOrder(
        bytes32 ticker,
        uint amount,
        Side side)
        tokenExist(ticker)
        tokenIsNotDai(ticker)
        external {
        if(side == Side.SELL) {
            require(
                traderBalances[msg.sender][ticker] >= amount, 
                'Cantidad del token insuficiente'
            );
        }
        Order[] storage orders = orderBook[ticker][uint(side == Side.BUY ? Side.SELL : Side.BUY)];
        uint i;
        uint remaining = amount;
        
        while(i < orders.length && remaining > 0) {
            uint available = orders[i].amount - orders[i].filled;
            uint matched = (remaining > available) ? available : remaining;
            remaining = remaining - matched;
            orders[i].filled = orders[i].filled + matched;
            emit NewTrade(
                nextTradeId,
                orders[i].id,
                ticker,
                orders[i].trader,
                msg.sender,
                matched,
                orders[i].price,
                block.timestamp
            );
            if(side == Side.SELL) {
                traderBalances[msg.sender][ticker] = traderBalances[msg.sender][ticker] - matched;
                traderBalances[msg.sender][DAI] = traderBalances[msg.sender][DAI] + (matched * orders[i].price);
                traderBalances[orders[i].trader][ticker] = traderBalances[orders[i].trader][ticker] + matched;
                traderBalances[orders[i].trader][DAI] = traderBalances[orders[i].trader][DAI] - (matched * orders[i].price);
            }
            if(side == Side.BUY) {
                require(
                    traderBalances[msg.sender][DAI] >= matched * orders[i].price,
                    'Cantidad de DAI insuficiente'
                );
                traderBalances[msg.sender][ticker] = traderBalances[msg.sender][ticker] + matched;
                traderBalances[msg.sender][DAI] = traderBalances[msg.sender][DAI] - (matched * orders[i].price);
                traderBalances[orders[i].trader][ticker] = traderBalances[orders[i].trader][ticker] - matched;
                traderBalances[orders[i].trader][DAI] = traderBalances[orders[i].trader][DAI] + (matched * orders[i].price);
            }
            nextTradeId++;
            i++;
        }
        
        i = 0;
        //Tenemos que comprobar si por ejemplo en [A,B,C,D] en el orderbook, si la compra de X al precio A, esta completado, tendrá que pasar
        //a B, y así sucesivamente hasta que comprobmeos que la primera posición del array no esté completado y parar
        while(i < orders.length && orders[i].filled == orders[i].amount) {
            for(uint j = i; j < orders.length - 1; j++ ) {
                orders[j] = orders[j + 1];
            }
            orders.pop();
            i++;
        }
    }
   
    modifier tokenIsNotDai(bytes32 ticker) {
       require(ticker != DAI, 'No se puede tradear DAI');
       _;
    }     

    //Comprobamos que el token exista
    modifier tokenExist(bytes32 ticker) {
        require(
            tokens[ticker].tokenAddress != address(0),
            'El token no existe'
        );
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, 'Restringido a admin');
        _;
    }
}
// ------------------ EXPLICACIÓN USO DE EXTERNAL ------------------//
//   https://medium.com/@yangnana11/solidity-function-types-4ad4e5de6d56#:~:text=external%20%3AExternal%20functions%20are%20part,f()%20works).
// external:External functions are part of the contract interface, 
// which means they can be called from other contracts and via transactions. 
// An external function f cannot be called internally (i.e. f()does not work, 
// but this.f() works). External functions are sometimes more efficient when they 
// receive large arrays of data.
