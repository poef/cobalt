import cobalt from './cobalt.js';

window.cobalt = cobalt;

function loadData() {
    let nodes = Array.from(document.head.childNodes).concat(Array.from(document.body.childNodes));
    for (var i=0,l=nodes.length;i<l;i++) {
        if (nodes[i].nodeType==Node.COMMENT_NODE) {
            return nodes[i].textContent;
        }
    }
    return {};
}

//TODO: cobaltDocument is not a fragment, it should have a head.title, a body - which is a fragment, and parts
// which may be any kind of document and aren't rendered by default
// e.g. script and css
window.cobaltDocument = cobalt.fragment(loadData().trim());

var docElement = document.createElement('cobalt-document');
docElement.innerHTML = cobalt.html.render(window.cobaltDocument);
document.body.appendChild(docElement);
