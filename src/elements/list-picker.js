import React from 'react';
import injectSheet from 'react-jss';
import { compose, withHandlers } from 'recompose';
import NoSelect from 'elements/no-select';

const enhance = compose(
  withHandlers({
    handleItemClick: props => item => () => {
      props.onClick(item);
    },
  }),
  injectSheet(theme => ({
    listItemFloat: {
      float: 'right',
      marginRight: '32px',
      fontSize: '12px',
    },
  }))
);

const ListPicker = props => (
  <div>
    {props.items.map((item, i) => (
      <div
        id={'list-' + item.id}
        key={item + i}
        onClick={props.handleItemClick(item)}
        className={'list-item ' + props.itemClassName}
      >
        <NoSelect>{item.name}</NoSelect>
        {item.floatName && (
          <span className={props.classes.listItemFloat}>
            <NoSelect>{item.floatName}</NoSelect>
          </span>
        )}
      </div>
    ))}
  </div>
);

const ListPickerEnhanced = enhance(ListPicker);

// an item is { name, id, ?floatName }
ListPickerEnhanced.defaultProps = {
  onClick: () => {},
  items: [],
  itemClassName: '',
};

export default ListPickerEnhanced;
