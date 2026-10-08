package app

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"io"
	"net/http"
)

const mimoTTSEndpoint = "https://api.xiaomimimo.com/v1/chat/completions"
const mimoTTSModel = "mimo-v2.5-tts"

type mimoTTS struct {
	key    string
	client *http.Client
}

func NewMiMoTTS(key string) TTSProvider {
	if key == "" {
		return nil
	}
	return &mimoTTS{key: key, client: &http.Client{
		Timeout: TTSTimeout,
		// Do not forward credentials through redirects, even to the same origin.
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}}
}

func (m *mimoTTS) Synthesize(ctx context.Context, req TTSRequest) ([]byte, error) {
	messages := []map[string]string{}
	if req.StyleInstruction != "" {
		messages = append(messages, map[string]string{"role": "user", "content": req.StyleInstruction})
	}
	messages = append(messages, map[string]string{"role": "assistant", "content": req.Text})
	body, _ := json.Marshal(map[string]any{
		"model": mimoTTSModel, "messages": messages, "stream": false,
		"audio": map[string]string{"format": req.Format, "voice": req.Voice},
	})
	r, e := http.NewRequestWithContext(ctx, "POST", mimoTTSEndpoint, bytes.NewReader(body))
	if e != nil {
		return nil, errTTSUpstream
	}
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("api-key", m.key)
	resp, e := m.client.Do(r)
	if e != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, errTTSUpstream
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case 401, 403:
		return nil, errTTSCredentials
	case 429:
		return nil, errTTSQuota
	case 200:
	default:
		return nil, errTTSUpstream
	}
	const maxResponse = 12 << 20
	data, e := io.ReadAll(io.LimitReader(resp.Body, maxResponse+1))
	if e != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, errTTSUpstream
	}
	if len(data) > maxResponse {
		return nil, errTTSResponse
	}
	var result struct {
		Error   json.RawMessage `json:"error"`
		Choices []struct {
			FinishReason string `json:"finish_reason"`
			Message      struct {
				Audio struct {
					Data   string `json:"data"`
					Format string `json:"format"`
				} `json:"audio"`
			} `json:"message"`
		} `json:"choices"`
	}
	if json.Unmarshal(data, &result) != nil || (len(result.Error) > 0 && string(result.Error) != "null") || len(result.Choices) == 0 {
		return nil, errTTSResponse
	}
	if reason := result.Choices[0].FinishReason; reason != "stop" {
		return nil, errTTSResponse
	}
	a := result.Choices[0].Message.Audio
	if a.Format != "" && a.Format != "wav" {
		return nil, errTTSResponse
	}
	if len(a.Data) > base64.StdEncoding.EncodedLen(TTSMaxAudio) {
		return nil, errTTSResponse
	}
	wav, e := base64.StdEncoding.Strict().DecodeString(a.Data)
	if e != nil || len(wav) > TTSMaxAudio || !validWAV(wav) {
		return nil, errTTSResponse
	}
	return wav, nil
}

// Require a complete RIFF/WAVE container with fmt and nonempty data chunks.
func validWAV(b []byte) bool {
	if len(b) < 44 || string(b[:4]) != "RIFF" || string(b[8:12]) != "WAVE" || uint64(binary.LittleEndian.Uint32(b[4:8]))+8 != uint64(len(b)) {
		return false
	}
	fmtFound, dataFound := false, false
	blockAlign := uint16(0)
	dataBytes := uint64(0)
	for offset := 12; offset < len(b); {
		if len(b)-offset < 8 {
			return false
		}
		n := uint64(binary.LittleEndian.Uint32(b[offset+4 : offset+8]))
		end := uint64(offset) + 8 + n
		if end > uint64(len(b)) {
			return false
		}
		switch string(b[offset : offset+4]) {
		case "fmt ":
			if n < 16 {
				return false
			}
			f := b[offset+8 : int(end)]
			format, channels := binary.LittleEndian.Uint16(f), binary.LittleEndian.Uint16(f[2:])
			rate, byteRate := binary.LittleEndian.Uint32(f[4:]), binary.LittleEndian.Uint32(f[8:])
			blockAlign = binary.LittleEndian.Uint16(f[12:])
			bits := binary.LittleEndian.Uint16(f[14:])
			if format != 1 || channels == 0 || channels > 8 || rate == 0 || rate > 192000 ||
				(bits != 8 && bits != 16 && bits != 24 && bits != 32) || blockAlign != channels*(bits/8) || byteRate != rate*uint32(blockAlign) {
				return false
			}
			fmtFound = true
		case "data":
			dataFound = n > 0
			dataBytes = n
		}
		offset = int(end + n%2)
		if offset > len(b) {
			return false
		}
	}
	return fmtFound && dataFound && dataBytes%uint64(blockAlign) == 0
}
