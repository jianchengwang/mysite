package tools

import (
	"fmt"
	"github.com/gin-gonic/gin"
	response "github.com/jianchengwang/my-site/pkg/app"
	"github.com/jianchengwang/my-site/pkg/cmd"
	"github.com/jianchengwang/my-site/pkg/file"
	"net"
	"net/url"
	"os"
	"path"
	"strings"
)

func DownGit(c *gin.Context) {
	var appGitPath = os.Getenv("APP_GIT_PATH")
	var appTmpPath = os.Getenv("APP_TMP_PATH")

	gitRep := c.Query("gitRep")
	u, err := url.Parse(gitRep)
	if err != nil {
		panic(err)
	}
	host, _, _ := net.SplitHostPort(u.Host)
	gitPath := u.Path
	fmt.Println(host)
	fmt.Println(gitPath)
	user := strings.Split(gitPath, "/")[1]
	rep := strings.Split(gitPath, "/")[2]
	branch := strings.Split(gitPath, "/")[4]
	dir := gitPath[strings.Index(gitPath, branch)+len(branch)+1:]
	gitUrl := "https://github.com/" + user + "/" + rep + ".git"
	fmt.Println(user, rep, branch, dir, gitUrl)

	var srcDir = path.Join(appGitPath, rep)
	if !file.Exists(srcDir) {
		fmt.Println(srcDir, "not existed")
		err = os.MkdirAll(srcDir, 0755)
		if err != nil {
			panic(err)
		}
		cmd.RunCommand(srcDir, "git", "init")
		cmd.RunCommand(srcDir, "git", "remote", "add", "origin", gitUrl)
		cmd.RunCommand(srcDir, "git", "config", "core.sparsecheckout", "true")
	} else {
		fmt.Println(srcDir, "existed")
	}
	cmd.RunCommand(srcDir, "/bin/sh", "-c", "echo \""+dir+"/*\">> .git/info/sparse-checkout")
	cmd.RunCommand(srcDir, "git", "pull", "origin", branch)
	cmd.RunCommand(srcDir, "git", "checkout")
	targetDir := path.Join(srcDir, dir)
	fmt.Println(targetDir)

	var zipFileName = fmt.Sprintf("%s.%s.%s.%s.zip", user, rep, branch, dir)
	var distDir = path.Join(appTmpPath, zipFileName)
	file.Zip(distDir, srcDir)

	response.Success(c, zipFileName)
}
