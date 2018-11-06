/* glabals document, chrome */

console.log('ebayMagic:inject:execute');

const findBoxValue = (priceList, text) => {
  //console.log('ebayMagic:inject:findBoxValue', text, priceList);

  return Object.keys(priceList).reduce(
    (match, set) => {
      //console.log(match, set)
      if ((!match || match.set.length < set.length) && text.toLowerCase().includes(set.toLowerCase())) {
        return {
          set,
          value: priceList[set],
        };
      }
      return match;
    }, false
  );
};

// <li class="s-item" data-view="mi:1686|iid:8" id="srp-river-results-listing8">
//   <div class="s-item__wrapper clearfix">
//     <div class="s-item__image-section">...</div>
//     <div class="s-item__info clearfix">
//       <div class="s-item__title-hotness"></div>
//       <a class="s-item__link" href="https://www.ebay.com/itm/Magic-The-Gathering-Innistrad-Boos...">
//         <h3 class="s-item__title" role="text">
//           Magic The Gathering Innistrad Booster Box Factory Sealed English
//         </h3>
//       </a>
//       ...
//       <div class="s-item__details clearfix">
//         <div class="s-item__detail s-item__detail--primary">
//           <span class="s-item__price">$389.99</span>
//         </div>
//         ...
//         <div class="s-item__detail s-item__detail--primary">
//           <span class="s-item__shipping s-item__logisticsCost">
//             <span class="BOLD">Free Shipping</span>
//           </span>
//         </div>
//         <div class="s-item__detail s-item__detail--primary">
//           <span class="s-item__shipping s-item__logisticsCost">+$13.65 shipping</span>
//         </div>
//         ...
//       </div>
//     </div>
//   </div>
// </li>
const extractListingValues = el => {
  const text = el.getElementsByClassName('s-item__title')[0].innerText;
  const priceDetail = el.getElementsByClassName('s-item__price')[0].parentElement;
  const price = parseFloat(priceDetail.innerText.replace(/[^0-9.]/g, ''));

  const shippingDetail = el.getElementsByClassName('s-item__logisticsCost') || 
    el.getElementsByClassName('s-item__shipping');
  const logistics = shippingDetail && shippingDetail[0] ? shippingDetail[0].innerText : '';
  const free = logistics === 'Free Shipping';
  const shipping = free ? 0 : parseFloat(logistics.replace(/[^0-9.]/g, ''));

  const base = price + shipping;

  return {
    text,
    base,
    priceDetail,
  };
}

// <div class="s-item__detail s-item__detail--secondary">
//   <span class="s-item__hotness s-item__itemHotness" aria-label="">
//     <span class="BOLD NEGATIVE" style="font-size: 20px;">$XX.XX ($XX.XX)</span>
//   </span>
// </div>
const buildDetail = (base, set, value) => {
  // console.log('ebayMagic:inject:buildDetail', base, value);

  if (!set || !value || !base) {
    return null;
  }

  const difference = (value - base);
  const color = difference > 0 ? 'POSITIVE' : 'NEGATIVE';

  const text = document.createElement('span');
  text.className = `BOLD ${color}`;
  text.style = 'font-size: 20px;';
  text.innerHTML = `$${difference.toFixed(2)}&nbsp;($${value.toFixed(2)})&nbsp;-&nbsp;${set}`

  const wrapper = document.createElement('span');
  wrapper.className = 's-item__hotness s-item__itemHotness';
  wrapper.append(text);

  const detail = document.createElement('div');
  detail.className = 's-item__detail s-item__detail--secondary ebayMagic';
  detail.append(wrapper);

  return detail;
};

const injectValue = priceList => el => {
  // console.log('ebayMagic:inject:injectValue', el);
  const {text, base, priceDetail} = extractListingValues(el);
  const {set, value} = findBoxValue(priceList, text) || {};

  if (priceDetail.nextSibling.className.split(' ').includes('ebayMagic')) {
    priceDetail.nextSibling.remove();
  }

  const newDetail = buildDetail(base, set, value);
  if (newDetail) {
    priceDetail.after(newDetail);
  }
  return newDetail;
};

const reloadPrices = () => new Promise((resolve, reject) =>
  chrome.runtime.sendMessage(
    {data: 'ebayMagic:reload'},
    response => {
      console.log('ebayMagic:reloadPrices.complete', response);
      if (response && response.priceList) {
        resolve(response.priceList);
      } else {
        reject(new Error('Reload failed'))
      }
    }
  )
);

const annotatePage = priceList => {
  console.log('ebayMagic:inject:annotatePage', priceList);

  return new Promise((resolve, reject) =>
    chrome.storage.sync.get(['priceList'], result => {
      if (!result.priceList) {
        return reject(new Error('Attempted to annotatePage but no prices are saved'));
      }
      const main = document.getElementById('srp-river-main');
      const items = Array.prototype.slice.apply(main.getElementsByClassName('s-item'));
      return Promise.all(items.map(injectValue(JSON.parse(result.priceList))));
    })
  );
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('ebayMagic:background:onMessage', request);

  if (request.data === 'ebayMagic:refresh') {
    annotatePage(request.priceList)
      .then(sendResponse)
      //.then(() => chrome.runtime.Port.disconnect());
  }
});

annotatePage()
  .catch(err => {
    console.log(err);
    return reloadPrices();
  })
  .then(() =>
    console.log('ebayMagic:inject:annotatePage.complete')
  );

// module.exports = {
//   findBoxValue,
//   extractListingValues,
//   buildDetail,
//   injectValue,
// };

