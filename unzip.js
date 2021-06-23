const ospath = require('path')
const fs = require('fs')
const Transform = require('stream').Transform

const yauzl = require('yauzl')

function mkdirp(dir, cb) {
  if (dir === '.') return cb()
  fs.stat(dir, function (err) {
    if (err == null) return cb() // already exists

    var parent = ospath.dirname(dir)
    mkdirp(parent, function () {
      fs.mkdir(dir, cb)
    })
  })
}

async function unzip(path, baseDirName, destionationDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, function (err, zipfile) {
      if (err) {
        reject(err)
      }
      zipfile.once('end', function () {
        zipfile.close()
        resolve(destionationDir)
      })
      zipfile.readEntry()
      zipfile.on('entry', function (entry) {
        const paths =  entry.fileName.split('/')
        paths.shift()
        paths.unshift(baseDirName)
        entry.fileName = paths.join('/')
        if (/\/$/.test(entry.fileName)) {
          mkdirp(ospath.join(destionationDir, entry.fileName), function () {
            if (err) {
              reject(err)
            }
            zipfile.readEntry()
          })
        } else {
          // ensure parent directory exists
          mkdirp(ospath.dirname(ospath.join(destionationDir, entry.fileName)), function () {
            zipfile.openReadStream(entry, function (err, readStream) {
              if (err) {
                reject(err)
              }
              var filter = new Transform();
              filter._transform = function (chunk, encoding, cb) {
                cb(null, chunk)
              }
              filter._flush = function (cb) {
                cb()
                zipfile.readEntry()
              }

              // pump file contents
              var writeStream = fs.createWriteStream(ospath.join(destionationDir, entry.fileName))
              readStream.pipe(filter).pipe(writeStream)
            })
          })
        }
      })
    })
  })
}

module.exports = {
  unzip
}
