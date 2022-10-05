import React from 'react';
import Moment from 'react-moment';

function MyOrders({orders}) {
  const renderList = (orders, side, className) => {
    return (
      <>
        <table className={`table table-striped mb-0 order-list ${className}`}>
          <thead>
            <tr className="table-title order-list-title">
              <th colSpan='3'>{side}</th>
            </tr>
            <tr>
              <th>Cantidad/Completado</th>
              <th>Precio</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.amount}/{order.filled}</td>
                <td>{order.price}</td>
                <td>
                  <Moment fromNow>{parseInt(order.date) * 1000}</Moment>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <div id="order-list" className="card">
      <h2 className="card-title">Mis ordenes</h2>
      <div className="row">
        <div className="col-sm-6">
          {renderList(orders.buy, 'Compra', 'order-list-buy')}
        </div>
        <div className="col-sm-6">
          {renderList(orders.sell, 'Venta', 'order-list-sell')}
        </div>
      </div>
    </div>
  );
}

export default MyOrders;
