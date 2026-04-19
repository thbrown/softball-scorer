import React from 'react';
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
}

const ListPicker = ({
  items,
  onClick,
  itemClassName,
  textClassName,
}: ListPickerProps) => {
  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', margin: '10px', fontSize: '14pt' }}>
        No options available
      </div>
    );
  }
  return (
    <div>
      {items.map((item: ListPickerItem, i: number) => (
        <ListButton
          id={'list-' + item.id}
          key={item.id + i}
          onClick={() => onClick(item)}
          className={'list-item ' + itemClassName}
        >
          <div className="centered-row">
            <NoSelect
              style={{ display: 'inline-block' }}
              div={true}
              className={`prevent-overflow ${textClassName}`}
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

export default ListPicker;
