package pdfrenderer

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	neturl "net/url"
	"strings"
	"time"
)

const maxRemoteImageRedirects = 5

var (
	errBlockedRemoteImageHost = errors.New("remote image host blocked by SSRF policy")
	cgnatPrefix               = netip.MustParsePrefix("100.64.0.0/10")
)

type netIPResolver interface {
	LookupNetIP(ctx context.Context, network, host string) ([]netip.Addr, error)
}

type dialContextFunc func(ctx context.Context, network, address string) (net.Conn, error)

type remoteImagePolicy struct {
	resolver netIPResolver
}

func newRemoteImagePolicy() *remoteImagePolicy {
	return &remoteImagePolicy{
		resolver: net.DefaultResolver,
	}
}

func newRemoteImageHTTPClient(policy *remoteImagePolicy) *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil

	baseDialer := &net.Dialer{
		Timeout:   15 * time.Second,
		KeepAlive: 30 * time.Second,
	}
	transport.DialContext = policy.secureDialContext(baseDialer.DialContext)

	return &http.Client{
		Timeout:   15 * time.Second,
		Transport: transport,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

func (p *remoteImagePolicy) validateURL(ctx context.Context, rawURL string) (*neturl.URL, error) {
	parsedURL, err := p.parseURL(rawURL)
	if err != nil {
		return nil, err
	}

	if err := p.validateResolvedHost(ctx, parsedURL.Hostname()); err != nil {
		return nil, err
	}

	return parsedURL, nil
}

func (p *remoteImagePolicy) parseURL(rawURL string) (*neturl.URL, error) {
	parsedURL, err := neturl.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid image URL %q: %w", rawURL, err)
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return nil, fmt.Errorf("unsupported image URL scheme %q", parsedURL.Scheme)
	}

	if parsedURL.User != nil {
		return nil, fmt.Errorf("image URL userinfo is not allowed")
	}

	if parsedURL.Host == "" || parsedURL.Hostname() == "" {
		return nil, fmt.Errorf("image URL host is required")
	}

	return parsedURL, nil
}

func (p *remoteImagePolicy) validateResolvedHost(ctx context.Context, host string) error {
	_, err := p.resolvePublicAddrs(ctx, host)
	return err
}

func (p *remoteImagePolicy) resolvePublicAddrs(ctx context.Context, host string) ([]netip.Addr, error) {
	normalizedHost := normalizeRemoteImageHost(host)
	if normalizedHost == "" {
		return nil, fmt.Errorf("image URL host is required")
	}

	if isLocalhostName(normalizedHost) {
		return nil, fmt.Errorf("%w: host %q is localhost", errBlockedRemoteImageHost, host)
	}

	if addr, err := netip.ParseAddr(normalizedHost); err == nil {
		addr = addr.Unmap()
		if reason, blocked := blockedAddrReason(addr); blocked {
			return nil, fmt.Errorf("%w: host %q resolves to %s address %s", errBlockedRemoteImageHost, host, reason, addr)
		}
		return []netip.Addr{addr}, nil
	}

	addrs, err := p.resolver.LookupNetIP(ctx, "ip", normalizedHost)
	if err != nil {
		return nil, fmt.Errorf("resolving host %q: %w", host, err)
	}
	if len(addrs) == 0 {
		return nil, fmt.Errorf("host %q resolved to no addresses", host)
	}

	publicAddrs := make([]netip.Addr, 0, len(addrs))
	for _, addr := range addrs {
		addr = addr.Unmap()
		if reason, blocked := blockedAddrReason(addr); blocked {
			return nil, fmt.Errorf("%w: host %q resolves to %s address %s", errBlockedRemoteImageHost, host, reason, addr)
		}
		publicAddrs = append(publicAddrs, addr)
	}

	return publicAddrs, nil
}

func (p *remoteImagePolicy) secureDialContext(baseDialContext dialContextFunc) dialContextFunc {
	return func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, fmt.Errorf("splitting remote image address %q: %w", address, err)
		}

		publicAddrs, err := p.resolvePublicAddrs(ctx, host)
		if err != nil {
			return nil, err
		}

		var lastErr error
		for _, addr := range publicAddrs {
			conn, err := baseDialContext(ctx, network, net.JoinHostPort(addr.String(), port))
			if err == nil {
				return conn, nil
			}
			lastErr = err
		}

		if lastErr != nil {
			return nil, lastErr
		}

		return nil, fmt.Errorf("no reachable public address for host %q", host)
	}
}

func normalizeRemoteImageHost(host string) string {
	host = strings.TrimSpace(strings.TrimSuffix(host, "."))
	if strings.HasPrefix(host, "[") && strings.HasSuffix(host, "]") {
		host = strings.TrimPrefix(strings.TrimSuffix(host, "]"), "[")
	}
	return strings.ToLower(host)
}

func isLocalhostName(host string) bool {
	return host == "localhost" || strings.HasSuffix(host, ".localhost")
}

func blockedAddrReason(addr netip.Addr) (string, bool) {
	switch {
	case !addr.IsValid():
		return "invalid", true
	case addr.IsLoopback():
		return "loopback", true
	case addr.IsPrivate():
		return "private", true
	case addr.IsLinkLocalUnicast():
		return "link-local unicast", true
	case addr.IsLinkLocalMulticast():
		return "link-local multicast", true
	case addr.IsUnspecified():
		return "unspecified", true
	case addr.IsMulticast():
		return "multicast", true
	case cgnatPrefix.Contains(addr):
		return "CGNAT", true
	default:
		return "", false
	}
}
