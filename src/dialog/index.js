import React from 'react';
import ReactDOM from 'react-dom';
import ConfirmDialog from './confirm-dialog';
import InputDialog from './input-dialog';
import NotificationDialog from './notification-dialog';
import YesNoCancelDialog from './yes-no-cancel-dialog';

const exp = {};

window.current_confirm = null;
window.current_cancel = null;
let is_visible = false;
let require_shift = false;

let on_key_down = function(ev) {
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

const show = function() {
  is_visible = true;
  window.addEventListener('keydown', on_key_down);
};

exp.show_confirm = function(text, on_confirm, on_cancel) {
  show();
  ReactDOM.render(
    React.createElement(ConfirmDialog, {
      text: text,
      on_confirm: on_confirm || function() {},
      on_cancel: on_cancel || function() {},
      hide: exp.hide,
    }),
    document.getElementById('dialog')
  );
};

exp.show_yes_no_cancel = function(text, on_yes, on_no, on_cancel) {
  show();
  ReactDOM.render(
    React.createElement(YesNoCancelDialog, {
      text: text,
      on_yes: on_yes || function() {},
      on_no: on_no || function() {},
      on_cancel: on_cancel || function() {},
      hide: exp.hide,
    }),
    document.getElementById('dialog')
  );
};

exp.set_shift_req = function(v) {
  require_shift = v;
};

exp.show_input = function(
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
  ReactDOM.render(
    React.createElement(InputDialog, {
      node: node,
      default_text: default_text,
      on_confirm: on_confirm || function() {},
      on_cancel: on_cancel || function() {},
      whiteSpace: require_shift,
      hide: exp.hide,
      startingValue: startingValue,
    }),
    document.getElementById('dialog')
  );
};

exp.show_notification = function(text, on_confirm) {
  show();
  ReactDOM.render(
    React.createElement(NotificationDialog, {
      text: text,
      on_confirm: on_confirm || function() {},
      hide: exp.hide,
    }),
    document.getElementById('dialog')
  );
};

exp.hide = function() {
  is_visible = false;
  window.removeEventListener('keydown', on_key_down);
  ReactDOM.unmountComponentAtNode(document.getElementById('dialog'));
};

exp.is_visible = function() {
  return is_visible;
};

export default exp;
