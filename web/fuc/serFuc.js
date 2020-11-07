const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const compressing = require('compressing')
const si = require('systeminformation')

// 获取磁盘信息
const GetDiskInfoA = async() => {
  return new Promise((resolve, reject) => {
    si.fsSize().then(data => {
      const currentDisk = __dirname.substr(0, 2).toLowerCase() // 当前盘符
      const rObj = {}
      const sarr = []
      for (let i = 0; i < data.length; i++) {
        if (data[i].fs.toLowerCase() === currentDisk) { // 只获取当前磁盘信息
          const total = (data[i].size / 1024 / 1024 / 1024).toFixed(0) + 'G' // 总量
          const used = (data[i].used / 1024 / 1024 / 1024).toFixed(0) + 'G' // 已使用
          const available = ((data[i].size - data[i].used) / 1024 / 1024 / 1024).toFixed(0) + 'G' // 可用
          const capacity = data[i].use // 使用率
          sarr[0] = total
          sarr[1] = used
          sarr[2] = available
          sarr[3] = capacity.toFixed(2) + '%'
        }
      }
      rObj.path = '/'
      rObj.size = sarr
      resolve(rObj)
    }).catch(err => {
      err = false
      resolve(err)
    })
  })
}
// 获取磁盘信息
const GetDiskInfoB = async() => {
  return new Promise((resolve, reject) => {
    si.fsSize().then(data => {
      const rObj = {}
      const sarr = []
      const total = (data[0].size / 1024 / 1024 / 1024).toFixed(0) + 'G' // 总量
      const used = (data[0].used / 1024 / 1024 / 1024).toFixed(0) + 'G' // 已使用
      const available = ((data[0].size - data[0].used) / 1024 / 1024 / 1024).toFixed(0) + 'G' // 可用
      const capacity = data[0].use // 使用率
      sarr[0] = total
      sarr[1] = used
      sarr[2] = available
      sarr[3] = capacity.toFixed(2) + '%'
      rObj.path = '/'
      rObj.size = sarr
      resolve(rObj)
    }).catch(err => {
      err = false
      resolve(err)
    })
  })
}
// 获取当前路径所有文件及目录
const GetDir = async(pathName) => {
  return new Promise((resolve, reject) => {
    fs.readdir(pathName, (err, files) => {
      if (err) {
        resolve(false)
      } else {
        resolve(files)
      }
    })
  })
}
// 分页函数
const pageInt = async(files, page, showRow) => {
  showRow = showRow * 1
  page = page * 1
  const allPage = Math.ceil(files.length / showRow) // 总页数
  const start = (page - 1) * showRow // 起始数据下标
  let end = start + showRow
  if (end > files.length) {
    end = files.length
  }
  const PAGE = '<div>' + pageShow(page, allPage) + '<span class=\'Pnumber\'>' + page + '/' + allPage + '</span><span class=\'Pline\'>从' + (start + 1) + '-' + end + '条</span><span class=\'Pcount\'>共' + files.length + '条数据</span></div>'
  files = files.slice(start, end)
  return { PAGE, files }
}
// 页面拼接
const pageShow = (page, allPage) => {
  const maxPage = 8
  let html = ''
  let Pstart = '<a class="Pstart" onclick="GetFiles(1)">首页</a><a class="Ppren" onclick="GetFiles(' + (page - 1) + ')">上一页</a>'
  let Pstop = '<a class="Pnext" onclick="GetFiles(' + (page + 1) + ')">下一页</a><a class="Pend" onclick="GetFiles(' + allPage + ')">尾页</a>'
  if (allPage === 0) {
    html = '<span class=\'Pcurrent\'>' + page + '</span>'
    return html
  }
  if (page <= 1) {
    Pstart = ''
  }
  if (page >= allPage) {
    Pstop = ''
  }
  html += Pstart
  if (allPage <= maxPage) {
    for (let i = 1; i < allPage + 1; i++) {
      if (i === page) {
        html += '<span class="Pcurrent">' + page + '</span>'
      } else {
        html += '<a class="Pnum" onclick="GetFiles(' + i + ')">' + i + '</a>'
      }
    }
  } else {
    html += getPageNum(page, allPage, maxPage)
  }
  html += Pstop
  return html
}
// 页码显示规则
const getPageNum = (page, allPage, maxPage) => {
  let html = ''
  let l
  let r
  const a = parseInt(maxPage / 2)
  if (page < allPage - a) {
    page <= a ? l = page - 1 : l = a
    r = maxPage - l - 1
  } else {
    r = allPage - page
    l = maxPage - r - 1
  }
  for (let i = l; i > 0; i--) {
    if (page - i > 0) {
      html += '<a class="Pnum" onclick="GetFiles(' + (page - i) + ')">' + (page - i) + '</a>'
    }
  }
  html += '<span class="Pcurrent">' + page + '</span>'
  for (let i = 1; i < r + 1; i++) {
    html += '<a class="Pnum" onclick="GetFiles(' + (page + i) + ')">' + (page + i) + '</a>'
  }
  return html
}
// 指定目录
const dirFuc = (pathName, name) => {
  const a = path.parse(pathName)
  const b = path.join(a.dir, name).replace(/\\/g, '/')
  return b
}
// 删除数组空值
const delEmpty = (arr) => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === '') {
      arr.splice(i, 1)
      i = i - 1
    }
  }
  return arr
}
// 读取路径信息
const getStat = (path) => {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        resolve(false)
      } else {
        resolve(stats)
      }
    })
  })
}
// 创建路径
const mkdir = (dir) => {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir, err => {
      if (err) {
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}
// 彻底删除文件或文件夹
const rmFuc = async(_pathName) => {
  const flag = await fileInfo(_pathName)
  return new Promise((resolve, reject) => {
    if (!flag) {
      resolve(false)
    }
    if (flag.isFile()) {
      fs.unlink(_pathName, (err) => {
        if (err) {
          resolve(false)
        }
        resolve(true)
      })
    } else if (flag.isDirectory()) {
      fs.rmdir(_pathName, { recursive: true }, (err) => {
        if (err) {
          resolve(false)
        }
        resolve(true)
      })
    }
  })
}
// 路径是否存在，不存在则创建
const dirExists = async(dir) => {
  const isExists = await getStat(dir)
  // 如果该路径存在且不是文件，返回true
  if (isExists && isExists.isDirectory()) {
    return true
  } else if (isExists) { // 如果该路径存在但是文件，返回false
    return false
  }
  // 如果该路径不存在
  const tempDir = path.parse(dir).dir // 拿到上级路径
  // 递归判断，如果上级目录也不存在，则会代码会在此处继续循环执行，直到目录存在
  const status = await dirExists(tempDir)
  let mkdirStatus
  if (status) {
    mkdirStatus = await mkdir(dir)
  }
  return mkdirStatus
}
// 读取文件所有信息
const fileInfo = async(pathName) => {
  return new Promise((resolve, reject) => {
    fs.stat(pathName, (err, stats) => {
      if (err) {
        resolve(false)
      }
      resolve(stats)
    })
  })
}
// 遍历文件夹
const fsReadDir = async(oldP, newP) => {
  return new Promise((resolve, reject) => {
    fs.readdir(oldP, async(err, files) => {
      if (err) {
        resolve(false)
      }
      for (let i = 0; i < files.length; i++) {
        const flag = (await fileInfo(path.join(oldP, files[i]))).isFile()
        const _flag = (await fileInfo(path.join(oldP, files[i]))).isDirectory()
        if (flag) {
          await dirExists(newP)
          fs.writeFileSync(path.join(newP, files[i]), fs.readFileSync(path.join(oldP, files[i])))
        }
        if (_flag) {
          await fsReadDir(path.join(oldP, files[i]), path.join(newP, files[i]))
        }
      }
      resolve(true)
    })
  })
}
// 遍历复制粘贴文件夹
const copyFuc = async(oldP, newP) => {
  const a = await fileInfo(oldP)
  const b = await fileInfo(newP)
  if (a.isFile()) { // 文件
    if (JSON.stringify(a) === JSON.stringify(b)) {
      return 'same'
    }
    fs.writeFile(newP, fs.readFileSync(oldP), (err) => {
      if (err) return false
    })
    return 'file'
  } else if (a.isDirectory()) { // 目录
    await fsReadDir(oldP, newP)
  } else {
    return false
  }
}
// 重命名或剪切
const cutFuc = async(oldP, newP) => {
  return new Promise((resolve, reject) => {
    fs.rename(oldP, newP, (err) => {
      if (err) {
        console.log(err)
        resolve(false)
      }
      resolve(true)
    })
  })
}
// 文件夹文件分类
const filesType = async (files, pathName) => {
  const DIR = []
  const FILES = []
  for (let i = 0; i < files.length; i++) {
    const info = await fileInfo(path.join(pathName, files[i]))
    const fileObj = files[i] + ';' + info.size + ';' + parseInt(info.mtimeMs / 1000)
    if (info.isFile()) {
      FILES.push(fileObj)
    } else if (info.isDirectory()) {
      DIR.push(fileObj)
    }
  }
  return { DIR, FILES }
}
// 压缩
const zipFuc = async(data, rootDir, zipDir) => {
  const files = delEmpty(data.sfile.split(','))
  let zipName
  const first = await fileInfo(path.join(rootDir, data.path, data.sfile))
  if (files.length === 1 && first.isFile()) {
    zipName = data.sfile
    const zipStream = fs.createWriteStream(path.join(rootDir, data.dfile))
    const zip = archiver('zip', { zlib: { level: 9 } })
    zip.pipe(zipStream)
    zip.file(path.join(rootDir, data.path, data.sfile), { name: data.sfile })
    zipStream.on('close', async() => {
      console.log('压缩完毕')
    })
    zip.finalize()
  } else {
    zipName = path.parse(data.path).name
    if (zipName === '') {
      zipName = 'zipTmp'
    }
    await rmFuc(path.join(zipDir, zipName))
    await mkdir(path.join(zipDir, zipName))
    for (let i = 0; i < files.length; i++) {
      const oldP = path.join(rootDir, data.path, files[i])
      const newP = path.join(zipDir, zipName, files[i])
      await copyFuc(oldP, newP)
    }
    const zipStream = fs.createWriteStream(path.join(zipDir, zipName + '.zip'))
    const zip = archiver('zip', { zlib: { level: 9 } })
    zip.pipe(zipStream)
    zip.directory(path.join(zipDir, zipName), false)
    zipStream.on('close', async() => {
      await rmFuc(path.join(zipDir, zipName))
      // console.log('压缩完毕')
    })
    zip.finalize()
    await cutFuc(path.join(zipDir, zipName + '.zip'), path.join(rootDir, data.dfile))
  }
}
// 解压
const unZipFuc = async(data, rootDir, zipDir) => {
  return new Promise((resolve, reject) => {
    compressing.zip.uncompress(path.join(rootDir, data.sfile), path.join(rootDir, data.dfile)).then(() => {
      resolve(true)
    }).catch(err => {
      err = false
      resolve(err)
    })
  })
}

// 测试创建文件
// const creatTest = async() => {
//   let exts = ['folder', 'folder-unempty', 'sql', 'c', 'cpp', 'cs', 'flv', 'css', 'js', 'htm', 'html', 'java', 'log', 'mht', 'php', 'url', 'xml', 'ai', 'bmp', 'cdr', 'gif', 'ico', 'jpeg', 'jpg', 'JPG', 'png', 'psd', 'webp', 'ape', 'avi', 'flv', 'mkv', 'mov', 'mp3', 'mp4', 'mpeg', 'mpg', 'rm', 'rmvb', 'swf', 'wav', 'webm', 'wma', 'wmv', 'rtf', 'docx', 'fdf', 'potm', 'pptx', 'txt', 'xlsb', 'xlsx', '7z', 'cab', 'iso', 'bz2', 'rar', 'zip', 'gz', 'bt', 'file', 'apk', 'bookfolder', 'folder', 'folder-empty', 'folder-unempty', 'fromchromefolder', 'documentfolder', 'fromphonefolder', 'mix', 'musicfolder', 'picturefolder', 'videofolder', 'sefolder', 'access', 'mdb', 'accdb', 'sql', 'c', 'cpp', 'cs', 'js', 'fla', 'flv', 'htm', 'html', 'java', 'log', 'mht', 'php', 'url', 'xml', 'ai', 'bmp', 'cdr', 'gif', 'ico', 'jpeg', 'jpg', 'JPG', 'png', 'psd', 'webp', 'ape', 'avi', 'flv', 'mkv', 'mov', 'mp3', 'mp4', 'mpeg', 'mpg', 'rm', 'rmvb', 'swf', 'wav', 'webm', 'wma', 'wmv', 'doc', 'docm', 'dotx', 'dotm', 'dot', 'rtf', 'docx', 'pdf', 'fdf', 'ppt', 'pptm', 'pot', 'potm', 'pptx', 'txt', 'xls', 'csv', 'xlsm', 'xlsb', 'xlsx', '7z', 'gz', 'cab', 'iso', 'rar', 'zip', 'bt', 'file', 'apk', 'css']
//   exts = Array.from(new Set(exts))
//   const pathName = path.join(__dirname.replace('\\web\\fuc', ''), 'root')
//   for (let i = 0; i < exts.length; i++) {
//     fs.writeFileSync(path.join(pathName, i + '.' + exts[i]))
//   }
// }
// creatTest()
module.exports = {GetDiskInfoA, GetDiskInfoB, dirFuc, fileInfo, pageInt, copyFuc, cutFuc, zipFuc, unZipFuc, dirExists, rmFuc, GetDir, filesType }
