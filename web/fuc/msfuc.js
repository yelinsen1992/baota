
// 延迟函数
const msWait = async(time) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true)
    }, time)
  })
}
module.exports = { msWait }
