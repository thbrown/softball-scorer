import React from 'react';

const MAX_WIDTH = 800;

const createDiv = (getStyle) => {
  return (props) => {
    const style = getStyle(props);
    const newProps = Object.keys(props).reduce((acc, key) => {
      if (['style', 'id', 'key'].includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {});
    console.log('render div with style', style);
    return (
      <div style={style} {...newProps}>
        {props.children}
      </div>
    );
  };
};

const Root = (props) => {
  return (
    <div
      id={props.id}
      style={{
        position: 'fixed',
        background: 'rgba(0, 0, 0, 0.5)',
        width: '100%',
        height: '100%',
        left: 0,
        top: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
      }}
    >
      {props.children}
    </div>
  );
};

const InnerRoot = (props) => {
  return (
    <div
      style={{
        width: props.maxWidth ? props.maxWidth : MAX_WIDTH - 200 + 'px',
        padding: '16px',
        border: '1px solid black',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0px 9px 25px 10px rgba(0, 0, 0, 0.5)',
      }}
    >
      {props.children}
    </div>
  );
};

const ButtonsContainer = (props) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '16px',
      }}
    >
      {props.children}
    </div>
  );
};

const Modal = ({
  title,
  onConfirm,
  confirmText,
  onCancel,
  cancelText,
  open,
  maxWidth,
  body,
  children,
}) => {
  return (
    <Root
      id="modal"
      style={{
        display: open ? 'flex' : 'none',
      }}
      onClick={(ev) => {
        ev.stopPropagation();
      }}
    >
      <InnerRoot maxWidth={maxWidth}>
        <h2>{title ?? 'Modal'}</h2>
        <div
          style={{
            maxHeight: window.innerHeight - 400 + 'px',
            overflow: 'auto',
          }}
        >
          {children}
          {body}
        </div>
        <ButtonsContainer>
          {onConfirm && (
            <div
              id="dialog-confirm"
              className="button primary-button"
              onClick={onConfirm}
            >
              <span className="no-select">{confirmText ?? 'Confirm'}</span>
            </div>
          )}
          {onCancel && (
            <div
              id="dialog-cancel"
              className="button tertiary-button"
              onClick={onCancel}
            >
              <span className="no-select">{cancelText ?? 'Cancel'}</span>
            </div>
          )}
        </ButtonsContainer>
      </InnerRoot>
    </Root>
  );
};

export default Modal;
