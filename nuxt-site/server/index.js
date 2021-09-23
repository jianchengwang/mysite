const app = require('express')();
const shell = require('shelljs');

app.get('/downgit', (req, res) => {
  let query = req.query
  const gitrep = query.gitrep
  const downloadLink = shell.exec(`/root/_sh/downgit/downgit.sh '${gitrep}' | tail -n 1`)
  res.send(downloadLink)
})

app.get('/kindlepush', (req, res) => {
  let query = req.query
  const mailTo = query.mailTo
  const book = query.book
  shell.exec(`/root/_sh/kindlepush/kindlepush.sh s '${mailTo}' '${book}'`)
  res.send('done')
})

module.exports = {
  path: 'api',
  handler: app
}
