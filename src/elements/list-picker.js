import React from 'react';
import { compose, withHandlers } from 'recompose';
import { makeStyles } from 'css/helpers';
import NoSelect from 'elements/no-select';

const enhance = compose(
  withHandlers({
    handleItemClick: props => item => () => {
      props.onClick(item);
    },
  })
);

const useListPickerStyles = makeStyles(theme => ({
  listItemFloat: {
    float: 'right',
    marginRight: '5px',
    fontSize: '12px',
    marginTop: '8px',
  },
}));

const ListPicker = props => {
  const { classes } = useListPickerStyles();
  return (
    <div>
      {props.items.map((item, i) => (
        <div
          id={'list-' + item.id}
          key={item.id + i}
          onClick={props.handleItemClick(item)}
          className={'list-item ' + props.itemClassName}
        >
          <NoSelect
            style={{ display: 'inline-block' }}
            div={true}
            className={props.textClassName}
          >
            {item.name}
          </NoSelect>
          {item.floatName && (
            <span className={classes.listItemFloat}>
              <NoSelect>{item.floatName}</NoSelect>
            </span>
          )}
        </div>
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
