import React from 'react';
import { compose, withHandlers } from 'recompose';
import NoSelect from 'elements/no-select';
import ListButton from 'elements/list-button';

const enhance = compose(
  withHandlers({
    handleItemClick: (props) => (item) => () => {
      props.onClick(item);
    },
  })
);

const ListPicker = (props) => {

  if (props.items.length === 0) {
    return (
      <div style={{ textAlign: 'center', margin: '10px', fontSize: '14pt' }}>
        No options available
      </div>
    );
  }
  return (
    <div>
      {props.items.map((item, i) => (
        <ListButton
          id={'list-' + item.id}
          key={item.id + i}
          onClick={props.handleItemClick(item)}
          className={'list-item ' + props.itemClassName}
        >
          <div className="centered-row">
            <NoSelect
              style={{ display: 'inline-block' }}
              div={true}
              className={`prevent-overflow ${props.textClassName}`}
            >
              {item.name}
            </NoSelect>
            {item.floatName ? (
              <span className="list-item-float">
                <NoSelect>{item.floatName}</NoSelect>
              </span>
            ) : (
              <div />
            )}
          </div>
        </ListButton>
      ))}
    </div>
  );
};

const ListPickerEnhanced = enhance(ListPicker);

// an item is { name, id, ?floatName }
ListPickerEnhanced.defaultProps = {
  onClick: () => {},
  items: [],
  itemClassName: '',
};

export default ListPickerEnhanced;
