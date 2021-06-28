'use strict'

const ospath = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const findCacheDir = require('find-cache-dir')

const express = require('express')
const Download = require('bestikk-download')
const bfs = require('bestikk-fs')
const downloader = new Download({})
const { unzip } = require('./unzip.js')

const root = ospath.join(__dirname, '..')
const baseDir = findCacheDir({ name: 'link-checker', create: true })
const linkcheckVersion = '2.0.19'
const platform = process.platform
const linkcheckBinaryPath = (platform === 'linux' || platform === 'darwin') ? ospath.join(baseDir, 'linkcheck') : ospath.join(baseDir, 'linkcheck.bat')

async function download() {
  const fileExtension = (platform === 'linux' || platform === 'darwin') ? 'tar.gz' : 'zip'
  const destionationBundle = ospath.join(baseDir, `linkcheck.${fileExtension}`)
  if (fs.existsSync(destionationBundle)) {
    console.log(`File: ${destionationBundle} already exists, skipping download.`)
    return
  }
  let bundleName
  if (platform === 'linux') {
    bundleName = `linkcheck-2.0.19-linux-x64.tar.gz`
  } else if (platform === 'darwin') {
    bundleName = `linkcheck-2.0.19-macos-x64.tar.gz`
  } else if (platform === 'win32') {
    // Windows?
    bundleName = `linkcheck-${linkcheckVersion}-windows-x64.zip`
  } else {
    throw new Error(`Platform ${platform} is not supported!`)
  }
  await downloader.getContentFromURL(`https://github.com/filiph/linkcheck/releases/download/${linkcheckVersion}/${bundleName}`, destionationBundle)
  if (destionationBundle.endsWith('.zip')) {
    await unzip(destionationBundle, '', baseDir)
  } else {
    await bfs.untar(destionationBundle, '', baseDir)
  }
}

async function run(dir, opts) {
  // download linkcheck binary
  if (fs.existsSync(linkcheckBinaryPath)) {
    console.log(`${ospath.relative(root, linkcheckBinaryPath)} already exists, skipping download`)
  } else {
    await download()
  }
  // chmod +x
  fs.chmodSync(linkcheckBinaryPath, 0o775)

  // use "fork" to spawn a new Node.js process otherwise it creates a deadlock
  const serverArgs = [dir]
  if (opts.redirect) {
    for (const redirectDef of opts.redirect) {
      serverArgs.push('--redirect')
      serverArgs.push(redirectDef)
    }
  }
  if (opts.static) {
    serverArgs.push('--static')
    serverArgs.push(opts.static)
  }
  const serverProcess = childProcess.fork(ospath.join(__dirname, 'server.js'), serverArgs)
  serverProcess.on('message', async (msg) => {
    if (msg.event === 'started') {
      // server has started!
      try {
        const args = []
        const skipFile = opts.skipFile
        if (skipFile) {
          if (ospath.isAbsolute(skipFile)) {
            args.push(`--skip-file ${skipFile}`)
          } else {
            const cwd = process.cwd
            args.push(`--skip-file ${ospath.join(cwd, skipFile)}`)
          }
        }
        args.push(`:${msg.port}`)
        console.log(`${ospath.relative(root, linkcheckBinaryPath)} ${args.join(' ')}`)
        const result = childProcess.execSync(`${linkcheckBinaryPath} ${args.join(' ')}`, { cwd: root, stdio: 'inherit' })
        // stop server and exit gracefully
        await new Promise((resolve, reject) => {
          serverProcess.on('message', (msg) => {
            if (msg.event === 'exiting') {
              resolve()
            }
          })
          serverProcess.send({ event: 'exit' })
        })
        process.exit(0)
      } catch (error) {
        if (error.stdout) {
          console.log(error.stdout.toString('utf8'))
        }
        if (error.stderr) {
          console.error(error.stderr.toString('utf8'))
        }
        await new Promise((resolve, reject) => {
          serverProcess.on('message', (msg) => {
            if (msg.event === 'exiting') {
              resolve()
            }
          })
          serverProcess.send({ event: 'exit' })
        })
        process.exit(1)
      }
    }
  })
}

module.exports = {
  run
}
