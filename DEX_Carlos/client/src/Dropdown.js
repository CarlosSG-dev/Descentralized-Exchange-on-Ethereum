import React, { useState } from 'react';

function Dropdown({onSelect, activeItem, items}) {
  
  //con el hook useState definimos las variables de estado actual y 
  //la funcion que se ejecutará cuando cambie el valor de esta variable
  const [dropdownVisible, setDropdownVisible] = useState(false);

  //funcion que se ejecutará cuando se haga click en el token para seleccionalo
  const selectItem = (e, item) => {
    e.preventDefault();
    setDropdownVisible(!dropdownVisible);
    onSelect(item);
  }

  return (
    <div className='dropdown ml-3'>
      <button 
        className="btn btn-secondary dropdown-toggle" 
        type="button" 
        onClick={() => setDropdownVisible(!dropdownVisible)}
      >
        {activeItem.label}
      </button>
      <div className={`dropdown-menu ${dropdownVisible ? 'visible' : ''}`}>
        {items && items.map((item, i) => ( 
          <a 
            className={`dropdown-item ${item.value === activeItem.value ? 'active' : null}`} 
            href='#'
            key={i}
            onClick={e => selectItem(e, item.value)}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default Dropdown;
