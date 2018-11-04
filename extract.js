const fetch = require('node-fetch');
const {JSDOM} = require('jsdom');
const {
  merge,
  splitEvery,
  tap,
} = require('ramda');

const coreRegex = /M([0-9]+)|Core Set 20([0-9]+)|(.+) w\//;

const extractValueMap = html => {
  console.log('extractValueMap');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const sets = document.querySelectorAll(['.cP','.cN']);
  const values = splitEvery(2, 
    Array.prototype.slice.apply(sets)
      .map(a => a.innerHTML)
  ).reduce((vals, [value, name]) => {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''))
    const add = {
      [name]: parsed,
    };
    const matched = coreRegex.exec(name);
    if (matched && (matched[1] || matched[2])) {
      const year = matched[1] || matched[2];
      add[`Core 20${year}`] = parsed;
      add[`Core Set 20${year}`] = parsed;
      add[`Core ${year}`] = parsed;
      add[`Core Set ${year}`] = parsed;
      add[`20${year} Core`] = parsed;
      add[`20${year} Core Set`] = parsed;
      add[`M${year}`] = parsed;
    } else if (matched && matched[3]) {
      add[matched[3]] = parsed;
    }
    return merge(add, vals);
  }, {});
  return values;
};

const pullSetValueMap = () => {
  console.log('pullSetValueMap')
  return fetch('http://mtg.dawnglare.com/?p=sets')
    .then(set => set.text())
    .then(extractValueMap)
    .then(tap(values => console.log('Load Complete', values)));
}

module.exports = {
  extractValueMap,
  pullSetValueMap,
};
