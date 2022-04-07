import React from 'react';
import ConfirmDialog from './confirm-dialog';
import InputDialog from './input-dialog';
import NotificationDialog from './notification-dialog';
import YesNoCancelDialog from './yes-no-cancel-dialog';
import expose from 'expose';

const exp = {};

window.current_confirm = null;
window.current_cancel = null;
let is_visible = false;
let require_shift = false;

let on_key_down = function (ev) {
  let t = true;
  if (require_shift) {
    t = ev.shiftKey;
  }
  if (ev.keyCode === 13 && t) {
    // enter
    window.current_confirm();
  } else if (ev.keyCode === 27) {
    // esc
    window.current_cancel();
  }
};

const show = function () {
  is_visible = true;
  window.addEventListener('keydown', on_key_down);
};

exp.show_confirm = function (text, on_confirm, on_cancel) {
  show();
  expose.set_state('main', {
    dialog: {
      type: 'confirm',
      text,
      on_confirm,
      on_cancel: on_cancel || function () {},
      hide: exp.hide,
    },
  });
};

exp.show_yes_no_cancel = function (text, on_yes, on_no, on_cancel) {
  show();
  expose.set_state('main', {
    dialog: {
      type: 'yesNoCancel',
      text: text,
      on_yes: on_yes || function () {},
      on_no: on_no || function () {},
      on_cancel: on_cancel || function () {},
      hide: exp.hide,
    },
  });
};

exp.set_shift_req = function (v) {
  require_shift = v;
};

exp.show_input = function (
  node_or_default_text,
  on_confirm,
  on_cancel,
  startingValue
) {
  show();
  let node = null;
  let default_text = null;
  if (typeof node_or_default_text === 'object') {
    node = node_or_default_text;
  } else {
    default_text = node_or_default_text;
  }
  expose.set_state('main', {
    dialog: {
      type: 'input',
      node,
      default_text,
      on_confirm: on_confirm || function () {},
      on_cancel: on_cancel || function () {},
      whiteSpace: require_shift,
      hide: exp.hide,
      startingValue,
    },
  });
};

exp.show_notification = function (text, on_confirm) {
  show();
  expose.set_state('main', {
    dialog: {
      type: 'notification',
      text: text,
      on_confirm: on_confirm || function () {},
      hide: exp.hide,
    },
  });
};

exp.hide = function () {
  if (is_visible) {
    is_visible = false;
    window.removeEventListener('keydown', on_key_down);
    expose.set_state('main', {
      dialog: {},
    });
  }
};

exp.is_visible = function () {
  return is_visible;
};

export const Dialog = ({ type, ...props }) => {
  if (type === 'confirm') {
    return (
      <div id="dialog-bg" className="dialog-bg">
        <ConfirmDialog {...props} />
      </div>
    );
  } else if (type === 'yesNoCancel') {
    return (
      <div id="dialog-bg" className="dialog-bg">
        <YesNoCancelDialog {...props} />
      </div>
    );
  } else if (type === 'input') {
    return (
      <div id="dialog-bg" className="dialog-bg">
        <InputDialog {...props} />
      </div>
    );
  } else if (type === 'notification') {
    return (
      <div id="dialog-bg" className="dialog-bg">
        <NotificationDialog {...props} />
      </div>
    );
  } else {
    return (
      <div
        id="dialog-bg"
        style={{
          pointerEvents: 'none',
        }}
      >
        <div id="dialog" />
      </div>
    );
  }
};

export default exp;
