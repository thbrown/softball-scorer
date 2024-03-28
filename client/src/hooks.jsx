import Modal from 'elements/modal';
import React from 'react';

// const {
//   title,
//   onConfirm,
//   confirmText,
//   onCancel,
//   cancelText,
//   maxWidth,
//   body,
//   children,
// } = modalProps;
export const useModal = (modalProps) => {
  const [open, setOpen] = React.useState(false);

  return {
    open,
    setOpen,
    modal: open ? (
      <Modal
        {...modalProps}
        open={open}
        onConfirm={() => {
          const shouldClose = modalProps.onConfirm?.();
          if (shouldClose === true || shouldClose === undefined) {
            setOpen(false);
          }
        }}
        onCancel={
          modalProps.onCancel
            ? () => {
                setOpen(false);
                modalProps.onCancel?.();
              }
            : undefined
        }
      />
    ) : null,
  };
};
