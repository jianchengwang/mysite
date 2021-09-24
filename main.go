package main

import (
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strings"
)

func sayHelloName(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()  // 解析参数，默认是不会解析的
	fmt.Println(r.Form)  // 这些信息是输出到服务器端的打印信息
	fmt.Println("path", r.URL.Path)
	fmt.Println("scheme", r.URL.Scheme)
	fmt.Println(r.Form["url_long"])
	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}
	fmt.Fprintf(w, "Hello astaxie!") // 这个写入到 w 的是输出到客户端的
}

func downGit(w http.ResponseWriter, r *http.Request) {
	gitRep := r.FormValue("gitRep")
	cmd := exec.Command("/root/_sh/downgit/downgit.sh " + gitRep + " | tail -n 1")
	msg, err := cmd.CombinedOutput()
	cmd.Run()
	if err != nil {
		fmt.Println(err.Error())
	}
	fmt.Fprintf(w, string(msg))
}

func kindlePush(w http.ResponseWriter, r *http.Request) {
	mailTo := r.FormValue("mailTo")
	book := r.FormValue("book")
	cmd := exec.Command("/root/_sh/kindlepush/kindlepush.sh s '" + mailTo + "' '" + book + "'")
	msg, err := cmd.CombinedOutput()
	cmd.Run()
	if err != nil {
		fmt.Println(err.Error())
	}
	fmt.Fprintf(w, string(msg))
}

func main() {
	http.Handle("/", http.FileServer(http.Dir("./nuxtsite/dist"))) // 个人站点静态目录映射
	http.HandleFunc("/sayHello", sayHelloName) // 设置访问的路由
	http.HandleFunc("/tools/downGit", downGit) // 下载git仓库指定文件夹
	http.HandleFunc("/tools/kindlePush", kindlePush) // 推送图书到kindle
	err := http.ListenAndServe(":8081", nil) // 设置监听的端口
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
