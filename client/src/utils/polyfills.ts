// Prepend polyfill
// from: https://github.com/jserz/js_piece/blob/master/DOM/ParentNode/prepend()/prepend().md
(function (arr: { prepend?: (...args: (Node | string)[]) => void }[]) {
  arr.forEach(function (item) {
    if (Object.prototype.hasOwnProperty.call(item, 'prepend')) {
      return;
    }
    Object.defineProperty(item, 'prepend', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function prepend(this: Node) {
        let argArr = Array.prototype.slice.call(arguments),
          docFrag = document.createDocumentFragment();

        argArr.forEach(function (argItem: Node | string) {
          let isNode = argItem instanceof Node;
          docFrag.appendChild(
            isNode ? (argItem as Node) : document.createTextNode(String(argItem))
          );
        });

        this.insertBefore(docFrag, this.firstChild);
      },
    });
  });
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);
