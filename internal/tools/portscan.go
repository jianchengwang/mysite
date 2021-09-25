package tools

import (
	"fmt"
	"github.com/gin-gonic/gin"
	response "github.com/jianchengwang/my-site/pkg/app"
	"github.com/jianchengwang/my-site/pkg/errcode"
	"net"
	"strings"
	"sync"
	"time"
)

func PortScan(c *gin.Context) {
	ip := c.Query("ip")
	ports := c.Query("ports")

	var scanPorts []string
	if len(ports) != 0 {
		scanPorts = strings.Split(ports, ",")
	} else {
		response.Error(c, errcode.ErrInvalidParam.WithDetails("port cant be empty"))
	}

	openPorts := ""
	gonum := 20
	taskschan := make(chan string, len(scanPorts))
	reschan := make(chan string, len(scanPorts))
	exitchan := make(chan bool, gonum)
	var wgp sync.WaitGroup
	for _, value := range scanPorts {
		taskschan <- value
	}
	close(taskschan)
	start := time.Now()
	for i := 0; i < gonum; i++ {
		wgp.Add(1)
		go Scan(ip, taskschan, reschan, exitchan, &wgp)
	}
	wgp.Wait()
	for i := 0; i < gonum; i++ {
		<-exitchan
	}
	end := time.Since(start)
	close(exitchan)
	close(reschan)
	for {
		openport, ok := <-reschan
		if !ok {
			break
		}
		fmt.Println("开放的端口：", openport)
		openPorts = openPorts + openport + ","

	}
	fmt.Println("花费的时间：", end)
	response.Success(c, openPorts)
}

func Scan(ip string, taskschan chan string, reschan chan string, exitchan chan bool, wgscan *sync.WaitGroup) {
	defer func() {
		exitchan <- true
		wgscan.Done()
	}()
	for {
		port, ok := <-taskschan
		if !ok {
			break
		}
		_, err := net.DialTimeout("tcp", ip+":"+port, 5*time.Second)
		fmt.Println(ip, port, err)
		if err == nil {
			reschan <- port
		}
	}
}
