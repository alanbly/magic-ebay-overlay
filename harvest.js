
const pushContent = () => new Promise((resolve, reject) => {
  console.log('ebayMagic:pushContent')
  chrome.runtime.sendMessage({
    data: 'ebayMagic:push',
    html: document.documentElement.outerHTML
  }, response => {
    console.log('ebayMagic:pushContent.complete', response);
    resolve(response);
  })
});

pushContent()
  .then(values => console.log('ebayMagic:pushContent.values', values))
  .catch(err => console.log('ebayMagic:pushContent.failed', err))
