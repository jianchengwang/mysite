const fs = require('fs')
const path = require('path')

const travel = function travel (dir, callback) {
  fs.readdirSync(dir).forEach((file) => {
    const pathname = path.join(dir, file)
    if (fs.statSync(pathname).isDirectory()) {
      travel(pathname, callback)
    } else {
      callback(pathname)
    }
  })
}

const genRoutes = function (dir) {
  const asyncRoutes = []
  travel(dir, function (pathname) {
    const targetDir = dir.replace('./', '')
    pathname = pathname.replace(targetDir, '').replace('\\', '/').replace('\\', '/').replace('.md', '')
    console.info(pathname)
    asyncRoutes.push(pathname)
  })
  return asyncRoutes
}

const genUtils = {
  travel,
  genRoutes
}

module.exports = genUtils
