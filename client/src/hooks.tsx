import Modal from 'elements/modal';
import React from 'react';

interface UseModalProps {
  title?: string;
  onConfirm?: () => boolean | void;
  confirmText?: string;
  onCancel?: () => void;
  cancelText?: string;
  maxWidth?: string;
  body?: React.ReactNode;
  children?: React.ReactNode;
}

export const useModal = (modalProps: UseModalProps) => {
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
