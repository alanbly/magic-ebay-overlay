const {
  pullSetValueMap,
} = require('./extract');

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.pullDawnglare = (req, res) => {
  console.log('pullDawnglare');
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  pullSetValueMap()
    .then(values => res.status(200).send(values))
    .catch(err => res.status(err.status || 400).send(err))
};

