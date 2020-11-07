const express = require('express') // express框架
const os = require('os') // 操作系统
const fs = require('fs') // 文件系统
const path = require('path') // path模块
const app = express()

const multiparty = require('multiparty') // 请求解析模块
const bodyParser = require('body-parser') // 请求解析模块
const debug = require('debug')('my-application') // debug模块

const { msWait } = require(path.join(__dirname, 'fuc/msfuc.js')) // 外部函数
const { GetDiskInfoA, GetDiskInfoB, dirFuc, fileInfo, pageInt, copyFuc, cutFuc, zipFuc, unZipFuc, dirExists, rmFuc, GetDir, filesType } = require('./fuc/serFuc.js') // 外部函数

const recTure = true // 回收站权限
const rootDir = dirFuc(__dirname, 'root') // 指定的根目录名称，跟运行项目目录同级
const recDir = dirFuc(__dirname, 'recycle') // 指定的回收站目录
const zipDir = dirFuc(__dirname, 'zipRoot') // 指定的压缩文件目录

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
app.use('/download', express.static('download')) // 允许次目录文件可以访问
app.use('/static', express.static(path.join(__dirname, 'static'))) // 允许次目录文件可以访问

let overOldP = ''
let overData = [] // 全局批量操作文件标记

app.all('*', function(req, res, next) {
  // 设置允许跨域的域名，*代表允许任意域名跨域
  res.header('Access-Control-Allow-Origin', '*')
  // 允许的header类型
  res.header('Access-Control-Allow-Headers', 'content-type')
  // 跨域允许的请求方式
  res.header('Access-Control-Allow-Methods', 'DELETE,PUT,POST,GET,OPTIONS')
  if (req.method.toLowerCase() === 'options') {
    res.send(200) // 让options尝试请求快速结束
  } else {
    next()
  }
})

app.post('/files', async(req, res) => { // 渲染文件接口
  const action = req.query.action // 接口函数
  const page = req.query.p || req.body.p // 当前页
  const showRow = req.query.showRow || req.body.showRow // 每页展示条数
  const _pathName = req.body.path // 操作路径
  const pathName = rPath(rootDir + '/' + _pathName) // 绝对路径
  const recName = rPath(recDir + '/' + _pathName) // 回收站绝对路径
  console.log('操作路径：' + _pathName + '\n' + '磁盘路径：' + pathName + '\n' + '回收路径：' + recName + '\n')
  switch (action) {
    case 'GetDir': // 获取目录文件渲染页面
    {
      let files
      if (req.body.all === 'True') { // 包含子目录搜索
        const objArr = []
        const getDirAll = async (_pathName, pathName, keyWords) => {
          return new Promise((resolve, reject) => {
            fs.readdir(pathName, async (err, files) => {
              if (err) {
                throw err
              } else {
                for (let i = 0; i < files.length; i++) {
                  const flag = await fileInfo(path.join(pathName, files[i]))
                  if (flag.isFile() && files[i].indexOf(keyWords) !== -1) {
                    const filePath = path.join(_pathName, files[i]).replace(/\\/g, '/')
                    objArr.push(filePath)
                  }
                  if (flag.isDirectory()) {
                    const filePath = path.join(_pathName, files[i]).replace(/\\/g, '/')
                    if (files[i].indexOf(keyWords) !== -1) {
                      objArr.push(filePath)
                    }
                    await getDirAll(path.join(_pathName, files[i]), path.join(pathName, files[i]), keyWords)
                  }
                }
                resolve(objArr)
              }
            })
          })
        }
        files = await getDirAll(_pathName, pathName, req.body.search)
      } else { // 仅当前目录获取目录文件列表
        files = await GetDir(pathName)
      }
      if (files === false) {
        res.send({ status: false, msg: '指定目录不存在!' })
        return false
      }
      const rdata = {}
      const searchFiles = async (files, keyWords) => {
        return new Promise((resolve, reject) => {
          const newFiles = []
          for (let i = 0; i < files.length; i++) {
            if (files[i].indexOf(keyWords) !== -1) {
              newFiles.push(files[i])
            }
          }
          resolve(newFiles)
        })
      }
      // 默认分页
      rdata.PAGE = "<div><span class='Pcurrent'>1</span><span class='Pnumber'>1/1</span><span class='Pline'>从1-" + files.length + "条</span><span class='Pcount'>共" + files.length + '条数据</span></div>'
      if (req.query.tojs === 'GetFiles' && !req.body.search) { // 正常分页
        const pageStr = await pageInt(files, page, showRow)
        files = pageStr.files
        rdata.PAGE = pageStr.PAGE
      }
      if (req.body.search !== '' && req.body.search !== null && req.body.search !== undefined) {
        files = await searchFiles(files, req.body.search)
        rdata.PAGE = "<div><span class='Pcurrent'>1</span><span class='Pnumber'>1/1</span><span class='Pline'>从1-" + files.length + "条</span><span class='Pcount'>共" + files.length + '条数据</span></div>'
      }
      const filesTypeData = await filesType(files, pathName)
      rdata.DIR = filesTypeData.DIR
      rdata.FILES = filesTypeData.FILES
      rdata.PATH = _pathName
      res.send(rdata)
      break
    }
    case 'GetDirSize': // 获取当前目录大小
    {
      getDirSize(rootDir + req.body.path, (_err, size) => {
        if (_err) {
          res.send({ status: false, msg: '出错了！' })
          return false
        }
        const _size = toSize(size)
        res.json(_size)
      })
      break
    }
    case 'get_path_size': // 计算目录大小
    {
      getDirSize(rootDir + req.body.path, (_err, size) => {
        if (_err) {
          res.send({ status: false, msg: '出错了！' })
          return false
        }
        const rdata = {}
        rdata.path = _pathName
        rdata.size = size
        res.json(rdata)
      })
      break
    }
    case 'upload': // 上传文件接口
    {
      const form = new multiparty.Form()
      form.encoding = 'utf-8'
      form.uploadDir = './download'
      form.parse(req, function (err, fields, files) {
        if (err) {
          res.send({ status: false, msg: '上传出错' })
          return false
        }
        const inputFile = files.blob[0] // 文件对象
        const inputFilePath = inputFile.path
        // const newPath = form.uploadDir + '/' + fields.f_name[0] // 服务器存储路径
        const newPath = (rootDir + fields.f_path[0] + '/' + fields.f_name[0]).replace('///', '/').replace('//', '/') // 服务器存储路径
        const tmpPath = (newPath + fields.f_size[0] + '.upload.tmp').replace('///', '/').replace('//', '/') // 断点临时文件
        const fileStart = (fields.f_start[0]) * 1 // 分片接点
        const uploadSize = files.blob[0].size // 单次上传大小
        const fileSize = (fields.f_size[0]) * 1 // 总文件大小
        let resFileSize = fileStart + uploadSize // 返回临大小
        fs.stat(tmpPath, async(err, info) => { // 断点续传
          if (err) { // 断点文件不存在
            await dirExists(rootDir + fields.f_path[0])
            fileAppend(tmpPath, inputFilePath, resFileSize, fileSize)
          } else { // 断点文件已存在
            if (fileStart === info.size) {
              fileAppend(tmpPath, inputFilePath, resFileSize, fileSize)
            } else {
              if (info.size === fileSize) {
                sendSuccess(inputFilePath)
                return false
              }
              resFileSize = info.size
              sendNumber(resFileSize, inputFilePath)
            }
          }
        })
        const fileAppend = async(tmpPath, inputFilePath, resFileSize, fileSize) => { // 文件存放
          fs.appendFileSync(tmpPath, fs.readFileSync(inputFilePath))
          if (resFileSize < fileSize) {
            sendNumber(resFileSize, inputFilePath)
          } else {
            sendSuccess(inputFilePath)
          }
        }
        const sendSuccess = async(inputFilePath) => { // 文件上传成功
          fs.unlinkSync(inputFilePath)
          fs.renameSync(tmpPath, newPath)
          await msWait(0) // 延迟时间
          res.send({ status: true, msg: '上传成功!' })
        }
        const sendNumber = async(resFileSize, inputFilePath) => { // 分片接点返回
          fs.unlinkSync(inputFilePath)
          await msWait(0) // 延迟时间
          resFileSize += ''
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.send(resFileSize)
        }
      })
      break
    }
    case 'CreateFile': // 新建文件
    {
      fs.stat(pathName, (err, stats) => {
        if (!err) {
          res.json({ status: false, msg: '指定文件已存在！' })
          return false
        }
        fs.writeFile(pathName, '', { encoding: 'UTF-8' }, (err) => {
          if (err) {
            res.json({ status: false, msg: '文件创建失败!' })
            return false
          }
          res.json({ status: true, msg: '文件创建成功!' })
        })
      })
      break
    }
    case 'CreateDir': // 新建目录
    {
      fs.stat(pathName, (err, stats) => {
        if (!err) {
          res.json({ status: false, msg: '指定文件已存在！' })
          return false
        }
        fs.mkdir(pathName, { recursive: true }, (err) => {
          if (err) {
            res.json({ status: false, msg: '指定文件已存在!' })
            return false
          }
          res.json({ status: true, msg: '目录创建成功!' })
        })
      })
      break
    }
    case 'DeleteFile': // 删除文件
    {
      const recFileName = await recSaveName(_pathName, pathName)
      const flag = await cutFuc(pathName, path.join(recDir, recFileName))
      if (flag === true) {
        res.json({ status: true, msg: '已将文件移动到回收站!' })
      } else {
        res.json({ status: false, msg: '文件删除失败!' })
      }
      break
    }
    case 'DeleteDir': // 删除目录
    {
      const recFileName = await recSaveName(_pathName, pathName)
      const flag = await cutFuc(pathName, path.join(recDir, recFileName))
      if (flag === true) {
        res.json({ status: true, msg: '已将目录移动到回收站!' })
      } else {
        res.json({ status: false, msg: '目录删除失败!' })
      }
      break
    }
    case 'MvFile': // 重命名和剪切粘贴
    {
      const oldPath = rootDir + req.body.sfile
      const newPath = rootDir + req.body.dfile
      if (req.body.rename === true || req.body.rename === 'true') { // 仅重命名
        fs.stat(newPath, async(err, stats) => {
          if (!err) {
            res.json({ status: false, msg: '指定文件已存在！' })
            return false
          }
          const flag = await cutFuc(oldPath, newPath)
          if (flag) {
            res.json({ status: true, msg: '重命名成功!' })
          } else {
            res.json({ status: false, msg: '重命名失败!' })
          }
        })
      } else { // 剪切粘贴文件
        if (oldPath === newPath) {
          res.json({ status: false, msg: '无意义操作' })
        } else {
          const flag = await cutFuc(oldPath, newPath)
          if (flag) {
            res.json({ status: true, msg: '文件或目录移动成功!' })
          } else {
            res.json({ status: false, msg: '文件或目录移动失败!' })
          }
        }
      }
      break
    }
    case 'CheckExistsFiles': // 粘贴（判断有无文件，有返回信息）
    {
      if (req.body.filename) { // 单独一个文件或目录检测
        const _path = path.join(rootDir, req.body.dfile, req.body.filename)
        fs.stat(_path, (err, stats) => {
          if (err) {
            res.send([])
            return false
          }
          res.send([{ filename: req.body.filename, size: stats.size, mtime: stats.mtimeMs }])
        })
      } else { // 检测多个文件
        const rArr = []
        for (let i = 0; i < overData.length; i++) {
          const info = await fileInfo(path.join(rootDir, req.body.dfile, overData[i]))
          if (info) {
            rArr.push({ filename: overData[i], size: info.size, mtime: info.mtimeMs })
          }
        }
        res.send(rArr)
      }
      break
    }
    case 'CopyFile': // 复制粘贴（实际执行）
    {
      const oldP = path.join(rootDir, req.body.sfile)
      const newP = path.join(rootDir, req.body.dfile)
      const _this = await copyFuc(oldP, newP)
      if (_this === 'same') {
        res.send({ status: false, msg: '文件未修改，复制失败!' })
      } else if (_this === 'file') {
        res.send({ status: true, msg: '文件复制成功!' })
      } else {
        res.send({ status: true, msg: '目录复制成功!' })
      }
      break
    }
    case 'SetBatchData': // 批量操作
    {
      overOldP = path.join(rootDir, req.body.path)
      overData = JSON.parse(req.body.data)
      console.log('批量标记的文件：')
      console.log(overData)
      // res.send({ status: false, msg: '标记失败!' })
      // return false
      switch (req.body.type) {
        case '1':
        {
          res.send({ status: true, msg: '标记成功,请在目标目录点击粘贴所有按钮!' })
          break
        }
        case '2':
        {
          res.send({ status: true, msg: '标记成功,请在目标目录点击粘贴所有按钮!' })
          break
        }
        case '4':
        {
          for (let i = 0; i < overData.length; i++) {
            const oldP = path.join(rootDir, _pathName, overData[i])
            const recFileName = await recSaveName(path.join(_pathName, overData[i]), oldP)
            await cutFuc(oldP, path.join(recDir, recFileName))
          }
          res.send({ status: true, msg: '批量删除成功!' })
          break
        }
        case '5':
        {
          break
        }
      }
      break
    }
    case 'BatchPaste': { // 批量操作
      console.log('批量标记的文件：')
      console.log(overData)
      switch (req.body.type) {
        case '1':
        {
          let sNum = 0
          let fNum = 0
          for (let i = 0; i < overData.length; i++) {
            const oldP = path.join(overOldP, overData[i])
            const newP = path.join(pathName, overData[i])
            const result = await copyFuc(oldP, newP)
            if (result === false) {
              fNum++
            } else {
              sNum++
            }
          }
          res.send({ status: true, msg: '批量操作成功[' + sNum + '],失败[' + fNum + ']' })
          break
        }
        case '2':
        {
          let sNum = 0
          let fNum = 0
          for (let i = 0; i < overData.length; i++) {
            const oldP = path.join(overOldP, overData[i])
            const newP = path.join(pathName, overData[i])
            const result = await cutFuc(oldP, newP)
            if (result === false) {
              fNum++
            } else {
              sNum++
            }
          }
          res.send({ status: true, msg: '批量操作成功[' + sNum + '],失败[' + fNum + ']' })
          break
        }
      }
      break
    }
    case 'GetFileBody': // 获取编辑内容
    {
      const resJson = {}
      if (_pathName === 'ace_config/ace.editor.config.json') {
        const config = '{"supportedModes":{"Apache_Conf":["^htaccess|^htgroups|^htpasswd|^conf|htaccess|htgroups|htpasswd"],"BatchFile":["bat|cmd"],"C_Cpp":["cpp|c|cc|cxx|h|hh|hpp|ino"],"CSharp":["cs"],"CSS":["css"],"Dockerfile":["^Dockerfile"],"golang":["go"],"HTML":["html|htm|xhtml|vue|we|wpy"],"Java":["java"],"JavaScript":["js|jsm|jsx"],"JSON":["json"],"JSP":["jsp"],"LESS":["less"],"Lua":["lua"],"Makefile":["^Makefile|^GNUmakefile|^makefile|^OCamlMakefile|make"],"Markdown":["md|markdown"],"MySQL":["mysql"],"Nginx":["nginx|conf"],"INI":["ini|conf|cfg|prefs"],"ObjectiveC":["m|mm"],"Perl":["pl|pm"],"Perl6":["p6|pl6|pm6"],"pgSQL":["pgsql"],"PHP_Laravel_blade":["blade.php"],"PHP":["php|inc|phtml|shtml|php3|php4|php5|phps|phpt|aw|ctp|module"],"Powershell":["ps1"],"Python":["py"],"R":["r"],"Ruby":["rb|ru|gemspec|rake|^Guardfile|^Rakefile|^Gemfile"],"Rust":["rs"],"SASS":["sass"],"SCSS":["scss"],"SH":["sh|bash|^.bashrc"],"SQL":["sql"],"SQLServer":["sqlserver"],"Swift":["swift"],"Text":["txt"],"Typescript":["ts|typescript|str"],"VBScript":["vbs|vb"],"Verilog":["v|vh|sv|svh"],"XML":["xml|rdf|rss|wsdl|xslt|atom|mathml|mml|xul|xbl|xaml"],"YAML":["yaml|yml"],"Compress":["tar|zip|7z|rar|gz|arj|z"],"images":["icon|jpg|jpeg|png|bmp|gif|tif|emf"]},"nameOverrides":{"ObjectiveC":"Objective-C","CSharp":"C#","golang":"Go","C_Cpp":"C and C++","PHP_Laravel_blade":"PHP (Blade Template)","Perl6":"Perl 6"},"encodingList":["ASCII","UTF-8","GBK","GB2312","BIG5"],"themeList":["chrome","monokai"],"aceEditor":{"editorTheme":"monokai","fontSize":15,"softLabel":false,"useSoftTabs":true,"tabSize":4,"wrap":true,"enableSnippets":true,"enableLiveAutocompletion":true,"highlightActiveLine":true,"highlightSelectedWord":true,"animatedScroll":false,"showInvisibles":true,"showFoldWidgets":true,"showLineNumbers":true,"showGutter":true,"displayIndentGuides":false},"showUpdate":true}'
        resJson.status = true
        resJson.encoding = 'UTF-8'
        resJson.data = config
        res.json(resJson)
        return false
      }
      fs.stat(pathName, (err, stat) => {
        if (err) {
          res.json({ status: false, msg: '文件不存在!' })
          return false
        } else {
          const editList = ['html', 'htm', 'xhtml', 'xml', 'css', 'scss', 'less', 'sass', 'js', 'jsx', 'jsm', 'php', 'java', 'json', 'jsp', 'txt', '']
          const extName = path.extname(pathName).replace('.', '')
          if (!IndexOf(extName, editList)) {
            res.send({ status: false, msg: '该文件格式不支持在线编辑!' })
            return false
          }
          const str = fs.readFileSync(pathName)
          if (stat.size > 1024 * 1024 * 3) {
            res.json({ status: false, msg: '不能在线编辑大于3MB的文件!' })
          } else {
            resJson.status = true
            resJson.encoding = 'UTF-8'
            resJson.data = str.toString()
            res.json(resJson)
          }
        }
      })
      break
    }
    case 'SaveFileBody': // 保存编辑内容
    {
      if (_pathName === 'ace_config/ace.editor.config.json') {
        res.send({ status: true, msg: '文件已保存!' })
        return false
      }
      const qdata = req.body.data
      fs.writeFile(pathName, qdata, (err) => {
        if (err) {
          throw err
        }
        res.json({ status: true, msg: '文件已保存!' })
      })
      break
    }
    case 'get_videos': // 返回所有视频
    {
      fs.readdir(pathName, async(err, files) => {
        if (err) {
          res.send({ status: false, msg: '文件读取出错' })
          throw err
        }
        const rarr = []
        for (let i = 0; i < files.length; i++) {
          if (isVideo(files[i])) {
            const videoInfo = await getVideoInfo(pathName, files[i])
            rarr.push(videoInfo)
          }
        }
        res.send(rarr)
      })
      break
    }
    case 'Get_Recycle_bin': // 回收站
    {
      if (recTure === false) {
        res.send({ status: false, msg: '权限不足,请联系管理员!' })
        return false
      }
      const dirs = []
      const files = []
      fs.readdir(recDir, async(err, _files) => {
        if (err) throw err
        for (let i = 0; i < _files.length; i++) {
          const obj = recBaceName(_files[i])
          const info = await fileInfo(path.join(recDir, _files[i]))
          obj.size = info.size
          obj.rname = _files[i]
          if (info.isDirectory()) {
            dirs.push(obj)
          } else if (info.isFile()) {
            files.push(obj)
          }
        }
        res.send({ dirs, files })
      })
      break
    }
    case 'Re_Recycle_bin': // 恢复
    {
      fs.rename(path.join(recDir, _pathName), path.join(rootDir, recBaceName(_pathName).dname), (err) => {
        if (err) {
          res.send({ status: false, msg: '文件恢复失败!' })
        } else {
          res.send({ status: true, msg: '恢复成功!' })
        }
      })
      break
    }
    case 'Del_Recycle_bin': // 永久删除
    {
      const flag = await rmFuc(path.join(recDir, _pathName))
      if (flag === true) {
        res.send({ status: true, msg: '已彻底从回收站删除!' })
      } else {
        res.send({ status: false, msg: '删除出错了!' })
      }
      break
    }
    case 'Close_Recycle_bin': // 清空回收站
    {
      fs.readdir(recDir, async(err, files) => {
        if (err) throw err
        for (let i = 0; i < files.length; i++) {
          await rmFuc(path.join(recDir, files[i]))
        }
        res.send({ status: true, msg: '已清空回收站!' })
      })
      break
    }
    case 'Zip': // 压缩文件
    {
      console.log(req.body)
      if (req.body.z_type !== 'zip') {
        res.send({ status: false, msg: '暂不支持此格式!' })
        return false
      }
      await zipFuc(req.body, rootDir, zipDir)
      res.send({ status: true, msg: '压缩成功!' })
      break
    }
    case 'UnZip': // 解压文件
    {
      console.log(req.body)
      if (req.body.type !== 'zip') {
        res.send({ status: false, msg: '暂不支持此格式!' })
        return false
      }
      const flag = await unZipFuc(req.body, rootDir, zipDir)
      if (flag === true) {
        res.send({ status: true, msg: '解压成功!' })
      } else {
        res.send({ status: false, msg: '解压失败!' })
      }
      break
    }
  }
})
app.get('/download', (req, res) => { // 下载接口
  const fileName = req.query.filename
  const filePath = rootDir + fileName
  const name = encodeURI(path.parse(fileName).base)
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.send('文件不存在')
      return false
    }
    if (stats.isFile()) {
      res.set({
        'Content-Type': 'application/octet-stream', // 告诉浏览器这是一个二进制文件
        'Content-Disposition': 'attachment; filename=' + name, // 告诉浏览器这是一个需要下载的文件
        'Content-Length': stats.size // 文件大小
      })
      fs.createReadStream(filePath).pipe(res)
    }
  })
})
app.get('/system', async(req, res) => { // 获取磁盘信息
  switch (req.query.action) {
    case 'GetDiskInfo': {
      if (os.type() === 'Windows_NT') {
        const rdata = await GetDiskInfoA()
        res.status(200).send([rdata])
      } else if (os.type() === 'Linux') {
        console.log(222)
        const rdata = await GetDiskInfoB()
        res.status(200).send([rdata])
      } else {
        res.send({ status: true, msg: '系统不支持' })
      }

      break
    }
  }
})
app.get('/', (req, res) => { // 返回index首页
  fs.readFile(path.join(__dirname, 'index.html'), function(err, data) {
    if (!err) {
      res.end(data)
    } else {
      throw err
    }
  })
})

// 回收站读取命名
const recBaceName = (str) => {
  const timeCur = str.lastIndexOf('_t_')
  const time = str.substr(timeCur + 3)
  const dname = str.substr(0, timeCur).replace(/_bt_/g, '/')
  const name = path.parse(dname).base
  return { time, dname, name }
}
// 回收站文件命名
const recSaveName = async(_pathName, pathName) => {
  const info = await fileInfo(pathName)
  _pathName = _pathName.replace(/\//g, '_bt_').replace(/\\/g, '_bt_')
  _pathName += '_t_'
  _pathName += info.mtimeMs
  return _pathName
}
// 读取视频信息
const getVideoInfo = async(pathName, file) => {
  return new Promise((resolve, reject) => {
    fs.stat(pathName + '/' + file, (err, stats) => {
      if (err) {
        throw err
      } else {
        const obj = {}
        obj.name = file
        if (path.extname(file) === '.mov') {
          obj.type = 'video/quicktime'
        } else if (path.extname(file) === '.avi') {
          obj.type = 'video/x-msvideo'
        } else {
          obj.type = 'video/' + path.extname(file).replace('.', '')
        }
        obj.size = stats.size
        resolve(obj)
      }
    })
  })
}
// 判断是否是视频文件
const isVideo = (fileName) => {
  const exts = ['mp4', 'mpeg', 'mpg', 'mov', 'avi', 'webm', 'mkv']
  return isExts(fileName, exts)
}
const isExts = (fileName, exts) => {
  const ext = fileName.split('.')
  if (ext.length < 2) return false
  const extName = ext[ext.length - 1].toLowerCase()
  for (let i = 0; i < exts.length; i++) {
    if (extName === exts[i]) return true
  }
  return false
}
// 检测是否存在
const IndexOf = (item, items) => {
  if (items.indexOf(item) === -1) {
    return false
  } else {
    return true
  }
}
// 获取目录大小
const getDirSize = (dir, callback) => {
  let size = 0
  fs.stat(dir, (err, stats) => {
    if (err) return callback(err) // 出错
    if (stats.isFile()) {
      return callback(null, stats.size)
    } // 如果是文件
    fs.readdir(dir, (err, files) => {
      if (err) return callback(err) // 出错
      if (files.length === 0) return callback(null, 0) // 如果目录是空的
      let count = files.length // 哨兵变量
      for (let i = 0; i < files.length; i++) {
        getDirSize(path.join(dir, files[i]), (err, _size) => {
          if (err) return callback(err)
          size += _size
          if (--count <= 0) { // 如果目录中所有文件(或目录)都遍历完成
            return callback(null, size)
          }
        })
      }
    })
  })
}
// 大小单位转换
const toSize = (a) => {
  const d = [' B', ' KB', ' MB', ' GB', ' TB', ' PB']
  const e = 1024
  for (let b = 0; b < d.length; b += 1) {
    if (a < e) {
      const num = (b === 0 ? a : a.toFixed(2)) + d[b]
      return (!isNaN((b === 0 ? a : a.toFixed(2))) && typeof num !== 'undefined') ? num : '0B'
    }
    a /= e
  }
}
// 路径拼接
const rPath = (str) => {
  str = str.replace(/\\/g, '/')
  str = str.replace(/\/\/\//g, '/').replace(/\/\//g, '/')
  return str
}

const port = 8000
app.set('port', process.env.PORT || port) // 设定监听端口
const server = app.listen(app.get('port'), () => { // 启动监听
  console.log(`Example app listening on port http://127.0.0.1:${port}`)
  debug('Express server listening on port ' + server.address().port)
})
