package cmd

import (
	"fmt"
	"os/exec"
)

func RunCommand(workDir string, name string, arg ...string) (string, error) {
	cmd := exec.Command(name, arg...)
	cmd.Dir = workDir
	//cmd.Stderr = os.Stderr
	msg, err := cmd.CombinedOutput()
	cmd.Run()
	if err != nil {
		fmt.Println(err.Error())
	}
	fmt.Println(string(msg))
	return string(msg), err
}
