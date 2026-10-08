package app

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// Opt-in integration with the actual Mini client against a Go HTTP server and mocked MiMo transport.
// No database, production service or external provider is contacted.
func TestTTSWorkflowAdapterIntegration(t *testing.T) {
	adapter := os.Getenv("MYSITE_TTS_ADAPTER_PATH")
	if adapter == "" {
		t.Skip("set MYSITE_TTS_ADAPTER_PATH to the Mini mysite_tts.py file")
	}
	python, e := exec.LookPath("python3")
	if e != nil {
		t.Fatal(e)
	}
	m := NewMiMoTTS("synthetic-mimo-test-key").(*mimoTTS)
	m.client.Transport = ttsTransport(func(r *http.Request) (*http.Response, error) { return mimoResponse(200, mimoAudioJSON(mockWAV())), nil })
	server := httptest.NewServer(ttsHandler(m))
	defer server.Close()
	root := t.TempDir()
	text := filepath.Join(root, "script.txt")
	output := filepath.Join(root, "mock-only.wav")
	if e := os.WriteFile(text, []byte("仅本地 mock 测试"), 0600); e != nil {
		t.Fatal(e)
	}
	cmd := exec.Command(python, adapter, "synthesize", "--text-file", text, "--output", output, "--voice", "冰糖")
	cmd.Env = []string{"MYSITE_BASE_URL=" + server.URL, "MYSITE_BACKEND_ACCESS_KEY=" + testKey, "PYTHONDONTWRITEBYTECODE=1"}
	if log, e := cmd.CombinedOutput(); e != nil {
		t.Fatalf("mock integration: %v: %s", e, log)
	}
	data, e := os.ReadFile(output)
	if e != nil || !bytes.Equal(data, mockWAV()) {
		t.Fatal("adapter did not persist mock bytes", e)
	}
	info, e := os.Stat(output)
	if e != nil || info.Mode().Perm() != 0600 {
		t.Fatal("output must be private", e)
	}
}
