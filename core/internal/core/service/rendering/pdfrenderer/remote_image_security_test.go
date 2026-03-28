package pdfrenderer

import (
	"context"
	"encoding/base64"
	"errors"
	"io"
	"net"
	"net/http"
	"net/netip"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type staticResolver struct {
	hosts map[string][]netip.Addr
}

func (r *staticResolver) LookupNetIP(_ context.Context, _ string, host string) ([]netip.Addr, error) {
	addrs, ok := r.hosts[host]
	if !ok {
		return nil, errors.New("host not found")
	}
	return addrs, nil
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestRemoteImagePolicyValidateResolvedHost(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name    string
		host    string
		wantErr bool
	}{
		{name: "allow public ipv4", host: "93.184.216.34"},
		{name: "block localhost name", host: "localhost", wantErr: true},
		{name: "block localhost ipv4", host: "127.0.0.1", wantErr: true},
		{name: "block localhost ipv6", host: "::1", wantErr: true},
		{name: "block RFC1918 10 slash 8", host: "10.0.0.1", wantErr: true},
		{name: "block RFC1918 172.16 slash 12", host: "172.16.0.1", wantErr: true},
		{name: "block RFC1918 192.168 slash 16", host: "192.168.1.10", wantErr: true},
		{name: "block link local ipv4", host: "169.254.1.1", wantErr: true},
		{name: "block ULA ipv6", host: "fc00::1", wantErr: true},
		{name: "block link local ipv6", host: "fe80::1", wantErr: true},
		{name: "block unspecified", host: "0.0.0.0", wantErr: true},
		{name: "block multicast", host: "224.0.0.1", wantErr: true},
		{name: "block cgnat", host: "100.64.0.1", wantErr: true},
	}

	policy := newRemoteImagePolicy()
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := policy.validateResolvedHost(context.Background(), tc.host)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error for host %q", tc.host)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error for host %q: %v", tc.host, err)
			}
		})
	}
}

func TestRemoteImagePolicyValidateResolvedHostRejectsMixedResolution(t *testing.T) {
	t.Parallel()

	policy := &remoteImagePolicy{
		resolver: &staticResolver{
			hosts: map[string][]netip.Addr{
				"mixed.example": {
					netip.MustParseAddr("93.184.216.34"),
					netip.MustParseAddr("127.0.0.1"),
				},
			},
		},
	}

	err := policy.validateResolvedHost(context.Background(), "mixed.example")
	if err == nil {
		t.Fatal("expected mixed host resolution to be blocked")
	}
}

func TestRemoteImagePolicyValidateResolvedHostAllowsPublicHostname(t *testing.T) {
	t.Parallel()

	policy := &remoteImagePolicy{
		resolver: &staticResolver{
			hosts: map[string][]netip.Addr{
				"public.example": {netip.MustParseAddr("93.184.216.34")},
			},
		},
	}

	if err := policy.validateResolvedHost(context.Background(), "public.example"); err != nil {
		t.Fatalf("expected public hostname to be allowed: %v", err)
	}
}

func TestRemoteImagePolicySecureDialContextDialsResolvedPublicAddress(t *testing.T) {
	t.Parallel()

	policy := &remoteImagePolicy{
		resolver: &staticResolver{
			hosts: map[string][]netip.Addr{
				"public.example": {netip.MustParseAddr("93.184.216.34")},
			},
		},
	}

	var gotAddress string
	dialContext := policy.secureDialContext(func(_ context.Context, _, address string) (net.Conn, error) {
		gotAddress = address
		client, server := net.Pipe()
		server.Close()
		return client, nil
	})

	conn, err := dialContext(context.Background(), "tcp", "public.example:443")
	if err != nil {
		t.Fatalf("unexpected dial error: %v", err)
	}
	conn.Close()

	if gotAddress != "93.184.216.34:443" {
		t.Fatalf("got dial address %q, want %q", gotAddress, "93.184.216.34:443")
	}
}

func TestRemoteImagePolicySecureDialContextRejectsUnsafeResolution(t *testing.T) {
	t.Parallel()

	policy := &remoteImagePolicy{
		resolver: &staticResolver{
			hosts: map[string][]netip.Addr{
				"mixed.example": {
					netip.MustParseAddr("93.184.216.34"),
					netip.MustParseAddr("10.0.0.1"),
				},
			},
		},
	}

	called := false
	dialContext := policy.secureDialContext(func(_ context.Context, _, _ string) (net.Conn, error) {
		called = true
		return nil, nil
	})

	_, err := dialContext(context.Background(), "tcp", "mixed.example:443")
	if err == nil {
		t.Fatal("expected dial to fail for mixed resolution")
	}
	if called {
		t.Fatal("base dialer should not be called for blocked host")
	}
}

func TestDownloadRemoteImageFollowsSafeRedirects(t *testing.T) {
	t.Parallel()

	var requests []string
	service := newRemoteImageTestService(
		roundTripFunc(func(req *http.Request) (*http.Response, error) {
			requests = append(requests, req.URL.String())
			switch req.URL.Host {
			case "origin.example":
				return redirectResponse(req, "https://cdn.example/image.png"), nil
			case "cdn.example":
				return imageResponse(req, getPlaceholderPNG()), nil
			default:
				t.Fatalf("unexpected host %q", req.URL.Host)
				return nil, nil
			}
		}),
		map[string][]netip.Addr{
			"origin.example": {netip.MustParseAddr("93.184.216.34")},
			"cdn.example":    {netip.MustParseAddr("93.184.216.35")},
		},
	)

	data, err := service.downloadRemoteImage(context.Background(), "https://origin.example/start.png")
	if err != nil {
		t.Fatalf("unexpected error following redirects: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected image data")
	}
	if len(requests) != 2 {
		t.Fatalf("got %d requests, want 2", len(requests))
	}
}

func TestDownloadRemoteImageBlocksUnsafeRedirectTarget(t *testing.T) {
	t.Parallel()

	var requests []string
	service := newRemoteImageTestService(
		roundTripFunc(func(req *http.Request) (*http.Response, error) {
			requests = append(requests, req.URL.String())
			return redirectResponse(req, "http://127.0.0.1/secret.png"), nil
		}),
		map[string][]netip.Addr{
			"origin.example": {netip.MustParseAddr("93.184.216.34")},
		},
	)

	_, err := service.downloadRemoteImage(context.Background(), "https://origin.example/start.png")
	if err == nil {
		t.Fatal("expected unsafe redirect target to be blocked")
	}
	if len(requests) != 1 {
		t.Fatalf("got %d requests, want 1", len(requests))
	}
}

func TestDownloadRemoteImageResolvesRelativeRedirect(t *testing.T) {
	t.Parallel()

	var requests []string
	service := newRemoteImageTestService(
		roundTripFunc(func(req *http.Request) (*http.Response, error) {
			requests = append(requests, req.URL.String())
			if strings.HasSuffix(req.URL.Path, "/start.png") {
				return redirectResponse(req, "/images/final.png"), nil
			}
			return imageResponse(req, getPlaceholderPNG()), nil
		}),
		map[string][]netip.Addr{
			"cdn.example": {netip.MustParseAddr("93.184.216.34")},
		},
	)

	_, err := service.downloadRemoteImage(context.Background(), "https://cdn.example/assets/start.png")
	if err != nil {
		t.Fatalf("unexpected error for relative redirect: %v", err)
	}

	if len(requests) != 2 {
		t.Fatalf("got %d requests, want 2", len(requests))
	}
	if requests[1] != "https://cdn.example/images/final.png" {
		t.Fatalf("got redirected URL %q, want %q", requests[1], "https://cdn.example/images/final.png")
	}
}

func TestDownloadRemoteImageRejectsRedirectLoop(t *testing.T) {
	t.Parallel()

	attempts := 0
	service := newRemoteImageTestService(
		roundTripFunc(func(req *http.Request) (*http.Response, error) {
			attempts++
			return redirectResponse(req, "https://loop.example/image.png"), nil
		}),
		map[string][]netip.Addr{
			"loop.example": {netip.MustParseAddr("93.184.216.34")},
		},
	)

	_, err := service.downloadRemoteImage(context.Background(), "https://loop.example/image.png")
	if err == nil {
		t.Fatal("expected redirect loop to be rejected")
	}
	if attempts != maxRemoteImageRedirects+1 {
		t.Fatalf("got %d attempts, want %d", attempts, maxRemoteImageRedirects+1)
	}
}

func TestDownloadImagesBlockedRemoteImageUsesPlaceholder(t *testing.T) {
	t.Parallel()

	service := &Service{}
	dir := t.TempDir()
	renames, err := service.downloadImages(context.Background(), map[string]string{
		"http://127.0.0.1/secret.png": "blocked.png",
	}, dir)
	if err == nil {
		t.Fatal("expected blocked remote image to produce an error")
	}
	if len(renames) != 0 {
		t.Fatalf("expected no renames, got %#v", renames)
	}

	data, readErr := os.ReadFile(filepath.Join(dir, "blocked.png"))
	if readErr != nil {
		t.Fatalf("expected placeholder file to exist: %v", readErr)
	}
	if ext := detectImageExt(data); ext != ".png" {
		t.Fatalf("expected placeholder to be png, got %q", ext)
	}
}

func TestDownloadFileDataURLBypassesRemotePolicy(t *testing.T) {
	t.Parallel()

	service := &Service{
		remotePolicy: &remoteImagePolicy{
			resolver: &staticResolver{hosts: map[string][]netip.Addr{}},
		},
	}

	dataURL := "data:image/png;base64," + base64.StdEncoding.EncodeToString(getPlaceholderPNG())
	actualName, err := service.downloadFile(context.Background(), dataURL, filepath.Join(t.TempDir(), "image.bin"))
	if err != nil {
		t.Fatalf("expected data URL download to succeed: %v", err)
	}
	if !strings.HasSuffix(actualName, ".png") {
		t.Fatalf("expected data URL file extension to be .png, got %q", actualName)
	}
}

func newRemoteImageTestService(rt http.RoundTripper, hosts map[string][]netip.Addr) *Service {
	return &Service{
		httpClient: &http.Client{
			Timeout:   15 * time.Second,
			Transport: rt,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
		remotePolicy: &remoteImagePolicy{
			resolver: &staticResolver{hosts: hosts},
		},
	}
}

func redirectResponse(req *http.Request, location string) *http.Response {
	return &http.Response{
		StatusCode: http.StatusFound,
		Header: http.Header{
			"Location": []string{location},
		},
		Body:    io.NopCloser(strings.NewReader("")),
		Request: req,
	}
}

func imageResponse(req *http.Request, data []byte) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(string(data))),
		Request:    req,
	}
}
