'use strict';
const React = require('react');
const ReactDOM = require('react-dom');
const MainContainer = require('./main-container');

window.React = React;

// Prepend polyfill
// from: https://github.com/jserz/js_piece/blob/master/DOM/ParentNode/prepend()/prepend().md
(function (arr) {
	arr.forEach(function (item) {
		if (item.hasOwnProperty('prepend')) {
			return;
		}
		Object.defineProperty(item, 'prepend', {
			configurable: true,
			enumerable: true,
			writable: true,
			value: function prepend() {
				let argArr = Array.prototype.slice.call(arguments),
					docFrag = document.createDocumentFragment();

				argArr.forEach(function (argItem) {
					let isNode = argItem instanceof Node;
					docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
				});

				this.insertBefore(docFrag, this.firstChild);
			}
		});
	});
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);

const container = document.createElement('div');
document.body.prepend(container);

let Main = global.Main = {};

let main_props = {
	main: Main
};
Main.render = function () {
	ReactDOM.render(
		React.createElement(MainContainer, main_props),
		container
	);
};
Main.render();

let _resize_timeout = null;
window.addEventListener('resize', function () {
	if (_resize_timeout !== null) {
		clearTimeout(_resize_timeout);
	}
	_resize_timeout = setTimeout(Main.render, 100);
});
