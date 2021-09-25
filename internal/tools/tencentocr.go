package tools

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	response "github.com/jianchengwang/my-site/pkg/app"
	"github.com/jianchengwang/my-site/pkg/errcode"
	"os"
	"path"

	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/errors"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
	ocr "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/ocr/v20181119"
)

func TencentOcr(c *gin.Context) {
	var appTmpPath = os.Getenv("APP_TMP_PATH")
	file, _ := c.FormFile("file")
	tmpFileName := fmt.Sprintf("%s%s", uuid.New().String(), path.Ext(file.Filename))
	c.SaveUploadedFile(file, path.Join(appTmpPath, tmpFileName))
	tmpImgUrl := fmt.Sprintf("https://tmp.jianchengwang.info/%s", tmpFileName)

	secretId := os.Getenv("TENCENT_SECRET_ID")
	secretKey := os.Getenv("TENCENT_SECRET_KEY")
	credential := common.NewCredential(
		secretId,
		secretKey,
	)
	cpf := profile.NewClientProfile()
	cpf.HttpProfile.Endpoint = "ocr.tencentcloudapi.com"
	client, _ := ocr.NewClient(credential, "ap-guangzhou", cpf)

	request := ocr.NewGeneralEfficientOCRRequest()

	request.ImageUrl = common.StringPtr(tmpImgUrl)

	res, err := client.GeneralEfficientOCR(request)
	if _, ok := err.(*errors.TencentCloudSDKError); ok {
		response.Error(c, errcode.ErrInternalServer.WithDetails(fmt.Sprintf("An API error has returned: %s", err)))
	}
	if err != nil {
		response.Error(c, errcode.ErrInternalServer.WithDetails(err.Error()))
	}
	response.Success(c, res.ToJsonString())
}
