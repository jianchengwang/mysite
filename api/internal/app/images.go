package app

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"time"
)

const MaxImageBytes = 2 << 20

type ImageData struct {
	Data           []byte
	MIME, Filename string
}

func PublicIP(ip net.IP) bool {
	address, ok := netip.AddrFromSlice(ip)
	if !ok {
		return false
	}
	address = address.Unmap()
	if !address.IsGlobalUnicast() || address.IsPrivate() || address.IsLoopback() || address.IsLinkLocalUnicast() || address.IsUnspecified() {
		return false
	}
	for _, cidr := range []string{"0.0.0.0/8", "100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "2001:db8::/32", "2001::/32", "2002::/16", "64:ff9b::/96", "64:ff9b:1::/48"} {
		if netip.MustParsePrefix(cidr).Contains(address) {
			return false
		}
	}
	return true
}
func ValidateImageURL(value string) (*url.URL, error) {
	u, e := url.Parse(value)
	if e != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.Fragment != "" || (u.Port() != "" && u.Port() != "443") {
		return nil, errors.New("images require credential-free HTTPS URLs on port 443")
	}
	host := strings.ToLower(strings.TrimSuffix(u.Hostname(), "."))
	if host == "localhost" || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".internal") {
		return nil, errors.New("private image hostname is forbidden")
	}
	if ip := net.ParseIP(host); ip != nil && !PublicIP(ip) {
		return nil, errors.New("private or reserved image address is forbidden")
	}
	return u, nil
}
func SafeImageClient() *http.Client {
	dialer := &net.Dialer{Timeout: 5 * time.Second}
	transport := &http.Transport{Proxy: nil, TLSHandshakeTimeout: 5 * time.Second, ResponseHeaderTimeout: 10 * time.Second, MaxIdleConns: 4, MaxConnsPerHost: 2, IdleConnTimeout: 30 * time.Second,
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			host, port, e := net.SplitHostPort(address)
			if e != nil || port != "443" {
				return nil, errors.New("invalid image destination")
			}
			ips, e := net.DefaultResolver.LookupIPAddr(ctx, host)
			if e != nil {
				return nil, errors.New("image DNS lookup failed")
			}
			if len(ips) == 0 {
				return nil, errors.New("image DNS returned no addresses")
			}
			// Reject mixed public/private answers; pin the checked IP to the connection.
			for _, ip := range ips {
				if !PublicIP(ip.IP) {
					return nil, errors.New("image DNS points to a private or reserved address")
				}
			}
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].IP.String(), port))
		}}
	return &http.Client{Timeout: 20 * time.Second, Transport: transport, CheckRedirect: func(*http.Request, []*http.Request) error { return errors.New("image redirects are disabled") }}
}
func LoadImage(ctx context.Context, client *http.Client, reference string) (ImageData, error) {
	var data []byte
	if strings.HasPrefix(reference, "data:") {
		head, encoded, ok := strings.Cut(reference, ",")
		if !ok || (head != "data:image/png;base64" && head != "data:image/jpeg;base64") {
			return ImageData{}, errors.New("only PNG/JPEG base64 image data is supported")
		}
		if len(encoded) > base64.StdEncoding.EncodedLen(MaxImageBytes) {
			return ImageData{}, errors.New("image exceeds 2 MiB")
		}
		var e error
		data, e = base64.StdEncoding.Strict().DecodeString(encoded)
		if e != nil {
			return ImageData{}, errors.New("invalid image base64")
		}
	} else {
		u, e := ValidateImageURL(reference)
		if e != nil {
			return ImageData{}, e
		}
		request, e := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if e != nil {
			return ImageData{}, errors.New("invalid image request")
		}
		response, e := client.Do(request)
		if e != nil {
			return ImageData{}, errors.New("image download failed; private addresses and redirects are forbidden")
		}
		defer response.Body.Close()
		if response.StatusCode != 200 {
			return ImageData{}, errors.New("image server did not return HTTP 200")
		}
		if response.ContentLength > MaxImageBytes {
			return ImageData{}, errors.New("image exceeds 2 MiB")
		}
		data, e = io.ReadAll(io.LimitReader(response.Body, MaxImageBytes+1))
		if e != nil {
			return ImageData{}, errors.New("image download was interrupted")
		}
	}
	if len(data) == 0 || len(data) > MaxImageBytes {
		return ImageData{}, errors.New("image must be 1 byte to 2 MiB")
	}
	cfg, format, e := image.DecodeConfig(bytes.NewReader(data))
	if e != nil || (format != "png" && format != "jpeg") {
		return ImageData{}, errors.New("image bytes must be valid PNG or JPEG")
	}
	if cfg.Width < 1 || cfg.Height < 1 || int64(cfg.Width)*int64(cfg.Height) > 20_000_000 {
		return ImageData{}, errors.New("image pixel limit exceeded")
	}
	if _, _, e = image.Decode(bytes.NewReader(data)); e != nil {
		return ImageData{}, errors.New("image is incomplete or corrupt")
	}
	mime := "image/" + format
	ext := format
	if ext == "jpeg" {
		ext = "jpg"
	}
	return ImageData{data, mime, fmt.Sprintf("image.%s", ext)}, nil
}
