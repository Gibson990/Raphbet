// Package auth verifies Firebase ID tokens using only the standard library:
// it validates the RS256 signature against Google's public x509 certs and
// checks the issuer/audience/expiry claims. No service-account secret needed —
// only the (public) project id.
package auth

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

const certsURL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

// FirebaseVerifier verifies Firebase ID tokens for one project.
type FirebaseVerifier struct {
	projectID string
	http      *http.Client

	mu     sync.RWMutex
	certs  map[string]*rsa.PublicKey
	expiry time.Time
}

// NewFirebaseVerifier builds a verifier for the given Firebase project id.
func NewFirebaseVerifier(projectID string) *FirebaseVerifier {
	return &FirebaseVerifier{
		projectID: projectID,
		http:      &http.Client{Timeout: 10 * time.Second},
		certs:     map[string]*rsa.PublicKey{},
	}
}

// Verify validates the token and returns the user's uid and email.
func (v *FirebaseVerifier) Verify(ctx context.Context, idToken string) (uid, email string, err error) {
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return "", "", errors.New("malformed token")
	}

	var hdr struct {
		Kid string `json:"kid"`
		Alg string `json:"alg"`
	}
	hb, err := decode(parts[0])
	if err != nil {
		return "", "", err
	}
	if err := json.Unmarshal(hb, &hdr); err != nil {
		return "", "", err
	}
	if hdr.Alg != "RS256" {
		return "", "", errors.New("unexpected signing algorithm")
	}

	pb, err := decode(parts[1])
	if err != nil {
		return "", "", err
	}
	var claims struct {
		Iss   string `json:"iss"`
		Aud   string `json:"aud"`
		Sub   string `json:"sub"`
		Exp   int64  `json:"exp"`
		Email string `json:"email"`
	}
	if err := json.Unmarshal(pb, &claims); err != nil {
		return "", "", err
	}
	if claims.Aud != v.projectID {
		return "", "", errors.New("token audience mismatch")
	}
	if claims.Iss != "https://securetoken.google.com/"+v.projectID {
		return "", "", errors.New("token issuer mismatch")
	}
	if claims.Sub == "" {
		return "", "", errors.New("token has no subject")
	}
	if time.Now().Unix() >= claims.Exp {
		return "", "", errors.New("token expired")
	}

	key, err := v.keyFor(ctx, hdr.Kid)
	if err != nil {
		return "", "", err
	}
	sig, err := decode(parts[2])
	if err != nil {
		return "", "", err
	}
	hashed := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, hashed[:], sig); err != nil {
		return "", "", errors.New("invalid token signature")
	}
	return claims.Sub, claims.Email, nil
}

func decode(s string) ([]byte, error) { return base64.RawURLEncoding.DecodeString(s) }

func (v *FirebaseVerifier) keyFor(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	if time.Now().Before(v.expiry) {
		if k, ok := v.certs[kid]; ok {
			v.mu.RUnlock()
			return k, nil
		}
	}
	v.mu.RUnlock()
	if err := v.refresh(ctx); err != nil {
		return nil, err
	}
	v.mu.RLock()
	defer v.mu.RUnlock()
	if k, ok := v.certs[kid]; ok {
		return k, nil
	}
	return nil, errors.New("unknown key id")
}

func (v *FirebaseVerifier) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, certsURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var raw map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return err
	}
	keys := make(map[string]*rsa.PublicKey, len(raw))
	for kid, certPEM := range raw {
		block, _ := pem.Decode([]byte(certPEM))
		if block == nil {
			continue
		}
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			continue
		}
		if pk, ok := cert.PublicKey.(*rsa.PublicKey); ok {
			keys[kid] = pk
		}
	}
	if len(keys) == 0 {
		return errors.New("no usable signing certs")
	}

	ttl := time.Hour
	if cc := resp.Header.Get("Cache-Control"); strings.Contains(cc, "max-age=") {
		if i := strings.Index(cc, "max-age="); i >= 0 {
			var secs int
			if _, e := fmt.Sscanf(cc[i+len("max-age="):], "%d", &secs); e == nil && secs > 0 {
				ttl = time.Duration(secs) * time.Second
			}
		}
	}
	v.mu.Lock()
	v.certs = keys
	v.expiry = time.Now().Add(ttl)
	v.mu.Unlock()
	return nil
}
