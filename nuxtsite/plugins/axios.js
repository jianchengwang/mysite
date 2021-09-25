
export default function ({ $axios, redirect }) {
  $axios.onRequest(config => {
    console.log('Making request to ' + config.url)
  })

  $axios.onResponse(res => {
    // 返回数据逻辑处理
    console.log('test onResponse', res)
    if (res.data.code != 0) {
      alert(res.message || "客户端异常")
    }
  });


  $axios.onError(error => {
    alert(error.message || "服务端异常")
    const code = parseInt(error.response && error.response.status)
    switch (code) {
      case 403:
        // 重定向到 403 页
        redirect('/error/403')
        break;
      case 404:
        // 重定向到 404 页
        redirect('/error/404')
        break;
      case 500:
        // 重定向到 500 页
        redirect('/error/500')
        break;
      default:
        break;
    }
  })
}