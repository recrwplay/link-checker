'use strict'

const commander = require('commander')
const express = require('express')
const portfinder = require('portfinder')
const process = require('process')

process.on('message', (msg) => {
  if (msg.event === 'exit') {
    process.send({ event: 'exiting' })
    process.exit(0)
  }
})

function collect (value, previous) {
  return previous.concat([value])
}

const program = new commander.Command()
  .arguments('<dir>')
  .option('-r, --redirect <from=to>', 'a redirection from source to dest directory', collect, [])
  .option('--static <route=staticRootDir>', 'static assets directory')
  .action(async (dir) => {
    portfinder.basePort = 8000
    portfinder.getPort((err, port) => {
      if (err) {
        reject(err)
      }
      const app = express()
      const opts = program.opts()
      app.use(express.static(dir))
      for (const redirectDef of opts.redirect) {
        const [from, to] = redirectDef.split('=')
        app.get(from, (req, res) => res.redirect(to))
      }
      if (opts.static) {
        const [route, staticRootDir] = opts.static.split('=')
        app.use(route, express.static(staticRootDir))
      }
      app.listen(port, () => {
        console.log(`📘 http://localhost:${port}`)
        if (typeof process.send === 'function') {
          process.send({ event: 'started', port: port });
        }
      })
    })
  })

program.parse(process.argv)
