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
    listItem: theme.classes.listItem,
  }))
);

const ListPicker = props => (
  <div>
    {props.items.map((item, i) => (
      <div
        id={item.id}
        key={item + i}
        onClick={props.handleItemClick(item)}
        className={
          'list-item  ' + props.classes.listItem + ' ' + props.itemClassName
        }
      >
        <NoSelect>{item.name}</NoSelect>
      </div>
    ))}
  </div>
);

const ListPickerEnhanced = enhance(ListPicker);

// an item is { name, id }
ListPickerEnhanced.defaultProps = {
  onClick: () => {},
  items: [],
  itemClassName: '',
};

export default ListPickerEnhanced;
