package route

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/jianchengwang/my-site/internal/tools"
	"net/http"
	"os"
)

func NewRoute() *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Content-type", "User-Agent"},
		AllowCredentials: true,
		AllowOrigins:     []string{os.Getenv("APP_URL")},
	}))

	// 工具接口
	run := r.Group("/tools")
	{
		run.GET("/downGit", tools.DownGit)
		run.GET("/portScan", tools.PortScan)
		run.POST("/tencentOcr", tools.TencentOcr)
	}
	r.NoRoute(func(c *gin.Context) {
		c.Redirect(http.StatusTemporaryRedirect, "/")
	})

	// 静态资源
	r.Use(static.Serve("/", static.LocalFile("./nuxtsite/dist/", false)))

	r.Run(":8081")
	return r
}
