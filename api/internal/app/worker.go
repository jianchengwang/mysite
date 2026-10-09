package app

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type Publisher interface {
	Token(context.Context) (string, error)
	Upload(context.Context, string, ImageData, bool) (string, error)
	AddDraft(context.Context, string, DraftRequest, string, string) (string, error)
}
type Worker struct {
	AccountID string
	Store     Store
	Publisher Publisher
	Images    *http.Client
	Logger    *slog.Logger
}
type Receipt struct {
	ImageSHA256 string `json:"image_sha256,omitempty"`
	Purpose     string `json:"purpose,omitempty"`
	Reused      bool   `json:"reused,omitempty"`
	Stage       string `json:"stage"`
	RemoteID    string `json:"remote_id"`
}
type TaskResult struct {
	Diagnostic      *DraftDiagnostic `json:"diagnostic,omitempty"`
	PreparedContent string           `json:"prepared_content,omitempty"`
	PreparedSHA256  string           `json:"prepared_sha256,omitempty"`
	MediaID         string           `json:"media_id,omitempty"`
	ArticleCount    int              `json:"article_count,omitempty"`
	Receipts        []Receipt        `json:"receipts"`
}

func prepareHTML(content string) ([]*html.Node, []*html.Node, error) {
	nodes, e := html.ParseFragment(strings.NewReader(content), &html.Node{Type: html.ElementNode, Data: "body", DataAtom: atom.Body})
	if e != nil {
		return nil, nil, errors.New("invalid article HTML")
	}
	var images []*html.Node
	forbidden := map[string]bool{"script": true, "iframe": true, "object": true, "embed": true, "link": true, "meta": true, "form": true, "input": true, "style": true, "svg": true, "math": true}
	var clean func(*html.Node)
	clean = func(n *html.Node) {
		for child := n.FirstChild; child != nil; {
			next := child.NextSibling
			if child.Type == html.ElementNode && forbidden[child.Data] {
				n.RemoveChild(child)
			} else {
				clean(child)
			}
			child = next
		}
		attrs := n.Attr[:0]
		for _, a := range n.Attr {
			key := strings.ToLower(a.Key)
			value := strings.ToLower(strings.TrimSpace(a.Val))
			if strings.HasPrefix(key, "on") || key == "srcset" || key == "background" || key == "formaction" {
				continue
			}
			if key == "href" && !(strings.HasPrefix(value, "https://") || strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "#")) {
				continue
			}
			if key == "style" && (strings.Contains(value, "url(") || strings.Contains(value, "expression") || strings.Contains(value, "@import")) {
				continue
			}
			attrs = append(attrs, a)
		}
		n.Attr = attrs
		if n.Type == html.ElementNode && n.Data == "img" {
			images = append(images, n)
		}
	}
	root := &html.Node{Type: html.ElementNode, Data: "div"}
	for _, n := range nodes {
		root.AppendChild(n)
	}
	clean(root)
	nodes = nil
	for n := root.FirstChild; n != nil; n = n.NextSibling {
		nodes = append(nodes, n)
	}
	if len(images) > 8 {
		return nil, nil, errors.New("maximum 8 article images")
	}
	return nodes, images, nil
}
func source(node *html.Node) string {
	for _, a := range node.Attr {
		if a.Key == "src" {
			return a.Val
		}
	}
	return ""
}
func setSource(node *html.Node, value string) {
	for i := range node.Attr {
		if node.Attr[i].Key == "src" {
			node.Attr[i].Val = value
			return
		}
	}
}
func (w *Worker) process(ctx context.Context, t Task) {
	ctx, cancel := context.WithTimeout(ctx, 4*time.Minute)
	defer cancel()
	result := TaskResult{Receipts: []Receipt{}, Diagnostic: &DraftDiagnostic{TaskID: t.ID, Stage: "preparing", Status: "processing", Attempt: 1, Time: time.Now().UTC()}}
	var request DraftRequest
	raw := func() json.RawMessage { b, _ := json.Marshal(result); return b }
	finish := func(status, message string) {
		result.Diagnostic.Status = status
		result.Diagnostic.RedactedMessage = message
		result.Diagnostic.Time = time.Now().UTC()
		finalCtx, c := context.WithTimeout(context.Background(), 10*time.Second)
		defer c()
		if e := w.Store.Finish(finalCtx, t.ID, status, raw(), message); e != nil {
			result.Diagnostic.Status = "needs_reconciliation"
			result.Diagnostic.Retryable = false
			result.Diagnostic.RedactedMessage = "Task finalization failed; lease expiry requires reconciliation"
		}
		logDraft(w.Logger, *result.Diagnostic)
	}
	fail := func(e error) {
		status := "failed"
		var remote *RemoteError
		if errors.As(e, &remote) && remote.Unknown {
			status = "needs_reconciliation"
		}
		message, code, httpStatus, retryable := diagnosticError(e)
		result.Diagnostic.ProviderErrcode = code
		result.Diagnostic.ProviderHTTPStatus = httpStatus
		result.Diagnostic.Retryable = retryable && status == "failed"
		finish(status, message)
	}
	checkpoint := func(stage string) error {
		result.Diagnostic.Stage = stage
		result.Diagnostic.Time = time.Now().UTC()
		if e := w.Store.Checkpoint(ctx, t.ID, stage, raw()); e != nil {
			return &RemoteError{true, "could not persist operation checkpoint; remote state must be inspected"}
		}
		logDraft(w.Logger, *result.Diagnostic)
		return nil
	}
	if e := checkpoint("preparing"); e != nil {
		fail(e)
		return
	}
	if w.AccountID == "" || t.DestinationAccountID != w.AccountID {
		finish("failed", "task destination does not match configured account; no remote operation attempted")
		return
	}
	if json.Unmarshal(t.Payload, &request) != nil {
		finish("failed", "stored request is invalid")
		return
	}
	nodes, images, e := prepareHTML(request.Content)
	if e != nil {
		fail(e)
		return
	}
	cover := request.CoverData
	if cover == "" {
		cover = request.CoverURL
	}
	if cover == "" && len(images) > 0 {
		cover = source(images[0])
	}
	if cover == "" {
		finish("failed", "a cover image is required")
		return
	}
	if e := checkpoint("prepare_images"); e != nil {
		fail(e)
		return
	}
	// Download/decode EVERY image before any remote write.
	loaded := map[string]ImageData{}
	for _, reference := range append(func() []string {
		refs := []string{}
		for _, n := range images {
			refs = append(refs, source(n))
		}
		return refs
	}(), cover) {
		if _, ok := loaded[reference]; ok {
			continue
		}
		image, e := LoadImage(ctx, w.Images, reference)
		if e != nil {
			fail(e)
			return
		}
		loaded[reference] = image
	}
	if e := checkpoint("token"); e != nil {
		fail(e)
		return
	}
	token, e := w.Publisher.Token(ctx)
	if e != nil {
		fail(e)
		return
	}
	mediaStore, ok := w.Store.(MediaStore)
	if !ok {
		finish("failed", "durable media store is required")
		return
	}
	upload := func(stage string, image ImageData, cover bool) (string, error) {
		if e := checkpoint(stage + "_reserve"); e != nil {
			return "", e
		}
		sum := sha256.Sum256(image.Data)
		hash := hex.EncodeToString(sum[:])
		purpose := "content"
		if cover {
			purpose = "cover"
		}
		value, fresh, e := mediaStore.ReserveMedia(ctx, hash, purpose, t.ID)
		if e != nil {
			var remote *RemoteError
			if errors.As(e, &remote) {
				return "", remote
			}
			return "", &RemoteError{true, "durable media store unavailable; no upload retried"}
		}
		if fresh {
			if e = checkpoint(stage + "_pending"); e != nil {
				return "", e
			}
			value, e = w.Publisher.Upload(ctx, token, image, cover)
			if e != nil {
				markCtx, c := context.WithTimeout(context.Background(), 5*time.Second)
				defer c()
				_ = mediaStore.MarkMediaUnknown(markCtx, hash, purpose, t.ID)
				return "", e
			}
			if e = mediaStore.ConfirmMedia(ctx, hash, purpose, t.ID, value); e != nil {
				return "", &RemoteError{true, "uploaded media receipt could not be persisted; reconcile remote state"}
			}
		}
		result.Receipts = append(result.Receipts, Receipt{Stage: stage, RemoteID: value, ImageSHA256: hash, Purpose: purpose, Reused: !fresh})
		if e = checkpoint(stage + "_confirmed"); e != nil {
			return "", e
		}
		return value, nil
	}
	uploaded := map[string]string{}
	for i, node := range images {
		ref := source(node)
		if value, ok := uploaded[ref]; ok {
			setSource(node, value)
			continue
		}
		stage := fmt.Sprintf("upload_content_image_%d", i+1)
		value, e := upload(stage, loaded[ref], false)
		if e != nil {
			fail(e)
			return
		}
		uploaded[ref] = value
		setSource(node, value)
	}
	coverID, e := upload("upload_cover", loaded[cover], true)
	if e != nil {
		fail(e)
		return
	}
	if e := checkpoint("prepare_draft"); e != nil {
		fail(e)
		return
	}
	var rendered bytes.Buffer
	for _, n := range nodes {
		if e = html.Render(&rendered, n); e != nil {
			fail(e)
			return
		}
	}
	result.PreparedContent = rendered.String()
	prepared, _ := json.Marshal(map[string]any{"request": request, "content": result.PreparedContent, "cover_media_id": coverID})
	sum := sha256.Sum256(prepared)
	result.PreparedSHA256 = hex.EncodeToString(sum[:])
	if e = checkpoint("draft_add_pending"); e != nil {
		fail(e)
		return
	}
	draftID, e := w.Publisher.AddDraft(ctx, token, request, rendered.String(), coverID)
	if e != nil {
		fail(e)
		return
	}
	if !validMediaID(draftID) {
		fail(&RemoteError{Unknown: true, Message: "WeChat draft identifier missing or invalid; reconcile remote drafts before retrying"})
		return
	}
	result.Diagnostic.Stage = "draft_add_confirmed"
	result.MediaID = draftID
	result.ArticleCount = 1
	result.Receipts = append(result.Receipts, Receipt{Stage: "draft_add", RemoteID: draftID})
	finish("succeeded", "")
}
func (w *Worker) Run(ctx context.Context) {
	tick := time.NewTicker(time.Second)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			if e := w.Store.ReconcileExpired(ctx); e != nil {
				slog.Warn("task lease reconciliation unavailable")
				continue
			}
			t, e := w.Store.Claim(ctx)
			if e != nil {
				slog.Warn("task claim unavailable")
				continue
			}
			if t != nil {
				w.process(ctx, *t)
			}
		}
	}
}
