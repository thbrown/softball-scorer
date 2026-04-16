import React from 'react';
import ConfirmDialog from './confirm-dialog';
import InputDialog from './input-dialog';
import NotificationDialog from './notification-dialog';
import YesNoCancelDialog from './yes-no-cancel-dialog';
import expose from 'expose';

interface DialogExp {
  show_confirm: (text: React.ReactNode, on_confirm: () => void, on_cancel?: () => void) => void;
  show_yes_no_cancel: (text: React.ReactNode, on_yes?: () => void, on_no?: () => void, on_cancel?: () => void) => void;
  show_input: (node_or_default_text: React.ReactNode | string, on_confirm?: (value: string) => void, on_cancel?: () => void, startingValue?: string) => void;
  show_notification: (text: React.ReactNode, on_confirm?: () => void) => void;
  hide: () => void;
  is_visible: () => boolean;
  set_shift_req: (v: boolean) => void;
}

const exp = {} as DialogExp;

(window as unknown as Record<string, unknown>).current_confirm = null;
(window as unknown as Record<string, unknown>).current_cancel = null;
let is_visible = false;
let require_shift = false;

let on_key_down = function (ev: KeyboardEvent) {
  let t = true;
  if (require_shift) {
    t = ev.shiftKey;
  }
  if (ev.keyCode === 13 && t) {
    // enter
    (window as unknown as Record<string, (() => void) | null>).current_confirm?.();
  } else if (ev.keyCode === 27) {
    // esc
    (window as unknown as Record<string, (() => void) | null>).current_cancel?.();
  }
};

const show = function () {
  is_visible = true;
  window.addEventListener('keydown', on_key_down);
};

exp.show_confirm = function (text: React.ReactNode, on_confirm: () => void, on_cancel?: () => void) {
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

exp.show_yes_no_cancel = function (text: React.ReactNode, on_yes?: () => void, on_no?: () => void, on_cancel?: () => void) {
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

exp.set_shift_req = function (v: boolean) {
  require_shift = v;
};

exp.show_input = function (
  node_or_default_text: React.ReactNode | string,
  on_confirm?: (value: string) => void,
  on_cancel?: () => void,
  startingValue?: string
) {
  show();
  let node: React.ReactNode = null;
  let default_text: string | null = null;
  if (typeof node_or_default_text === 'object') {
    node = node_or_default_text;
  } else {
    default_text = node_or_default_text as string;
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

exp.show_notification = function (text: React.ReactNode, on_confirm?: () => void) {
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

interface DialogProps {
  type?: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Dialog = ({ type, ...props }: DialogProps) => {
  const dialogProps = props as any;
  if (type === 'confirm') {
    return (
      <div id="dialog-bg" className="dialog-bg">
        <ConfirmDialog {...dialogProps} />
      </div>
    );
  } else if (type === 'yesNoCancel') {
    return (
      <div id="dialog-bg" className="dialog-bg">
        <YesNoCancelDialog {...dialogProps} />
      </div>
    );
  } else if (type === 'input') {
    return (
      <div id="dialog-bg" className="dialog-bg">
        <InputDialog {...dialogProps} />
      </div>
    );
  } else if (type === 'notification') {
    return (
      <div id="dialog-bg" className="dialog-bg">
        <NotificationDialog {...dialogProps} />
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
