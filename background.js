const splitEvery = (size, array) => {
  let chunked = []

  while(array.length > 0) {
    chunked.push(array.splice(0, size))
  }

  return chunked
}

// const fetch = url => new Promise((resolve, reject) => {
//   var xhr = new XMLHttpRequest();
//   xhr.open('GET', url, true);
//   xhr.onreadystatechange = () => {
//     if (xhr.readyState === 4) {
//       resolve(xhr.responseText);
//     }
//   }
//   xhr.onerror = err => {
//     console.log(`fetch ${url} failed`, err);
//     reject(err)
//   }
//   xhr.send();
// });

const coreRegex = /M([0-9]+)|Core Set 20([0-9]+)|(.+) w\//;

const extractValueMap = html => {
  const doc = (new DOMParser()).parseFromString(html, 'text/html');
  const sets = doc.querySelectorAll(['.cP','.cN']);

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
    return Object.assign(vals, add);
  }, {});

  return values;
};

const storeValueMap = values => new Promise((resolve, reject) =>
  chrome.storage.sync.set({
    priceList: JSON.stringify(values),
    date: new Date().toISOString(),
  }, function() {
    console.log('ebayMagic:extract:storeValueMap.priceList', values);
    resolve(values);
  })
);

let activeTab;
const updatePageAction = action => (tabId, tab) => {
  console.log('ebayMagic:background:updatePageAction', action, tabId, tab);
  const {
    url,
    status,
  } = tab;

  if (url && url.includes('https://www.ebay.com')) {
    chrome.pageAction.show(tabId);
    activeTab = tabId;
  } else if(!url && status === 'complete') {
    chrome.tabs.get(tabId, tab => updatePageAction(action)(tabId, tab));
  }
};

chrome.tabs.onActivated.addListener(({tabId}) => updatePageAction('onActivated')(tabId, {}));

const notifyPages = priceList => new Promise((resolve, reject) => {
  if (activeTab) {
    chrome.tabs.sendMessage(activeTab, {
      data: 'ebayMagic:refresh',
      priceList,
    }, {}, response => {
      console.log('notifyPages.complete', response);
      resolve({priceList, response});
    });
  }
});

const pullSetValueMap = () =>
  fetch('https://us-central1-magic-relay.cloudfunctions.net/dawnglare')
    .then(set => set.json())
    .then(storeValueMap)
    .then(notifyPages);

chrome.runtime.onInstalled.addListener(() => {
  console.log('ebayMagic:background:onInstalled');

  pullSetValueMap();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('ebayMagic:background:onMessage', message);

  if (message.data === 'ebayMagic:reload') {
    pullSetValueMap().then(sendResponse);//.then(() => chrome.runtime.Port.disconnect());
  } else if (message.data === 'ebayMagic:push') {
    storeValueMap(extractValueMap(message.html))
      .then(tap(sendResponse))
      .then(notifyPages);
  }
});

chrome.tabs.onCreated.addListener(updatePageAction('onCreated'));
chrome.tabs.onUpdated.addListener(updatePageAction('onUpdated'));

chrome.pageAction.onClicked.addListener(callback => {
  console.log('ebayMagic:background:onClicked');

  pullSetValueMap()
    .then(callback);//.then(() => chrome.runtime.Port.disconnect());
});
