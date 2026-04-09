import React from 'react';
import { compose, withHandlers } from 'recompose';
import { makeStyles } from 'css/helpers';
import NoSelect from 'elements/no-select';
import ListButton from 'elements/list-button';

interface ListPickerItem {
  id: string;
  name: string;
  floatName?: string;
}

interface ListPickerProps {
  items: ListPickerItem[];
  onClick: (item: ListPickerItem) => void;
  itemClassName?: string;
  textClassName?: string;
  // injected by recompose
  handleItemClick?: (item: ListPickerItem) => () => void;
}

const enhance = compose(
  withHandlers({
    handleItemClick: (props: ListPickerProps) => (item: ListPickerItem) => () => {
      props.onClick(item);
    },
  })
);

const useListPickerStyles = makeStyles((theme) => ({
  listItemFloat: {
    float: 'right',
    marginRight: '5px',
    fontSize: '12px',
    marginTop: '6px',
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ListPicker = (props: any) => {
  const { classes } = useListPickerStyles();

  if (props.items.length === 0) {
    return (
      <div style={{ textAlign: 'center', margin: '10px', fontSize: '14pt' }}>
        No options available
      </div>
    );
  }
  return (
    <div>
      {props.items.map((item: ListPickerItem, i: number) => (
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
              <span className={classes.listItemFloat}>
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

export default ListPickerEnhanced;
