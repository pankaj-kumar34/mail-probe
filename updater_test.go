package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

type handlerRoundTripper struct {
	handler http.HandlerFunc
}

func (h handlerRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	rec := httptest.NewRecorder()
	h.handler(rec, req)
	return rec.Result(), nil
}

func newTestHTTPClient(fn http.HandlerFunc) *http.Client {
	return &http.Client{
		Transport: handlerRoundTripper{handler: fn},
	}
}

func TestCompareSemver(t *testing.T) {
	cases := []struct {
		v1   string
		v2   string
		want int
	}{
		{"1.0.0", "v1.0.0", 0},
		{"1.0.0", "1.0.1", -1},
		{"1.0.0", "1.2.0", -1},
		{"0.9.9", "1.0.0", -1},
		{"2.0.0", "1.9.9", 1},
		{"1.0.0", "1.0.0-beta.1", 1},
		{"1.0.0-alpha.1", "1.0.0-beta.1", -1},
	}

	for _, tc := range cases {
		if got := CompareSemver(tc.v1, tc.v2); got != tc.want {
			t.Errorf("CompareSemver(%q, %q) = %d, want %d", tc.v1, tc.v2, got, tc.want)
		}
	}
}

func TestNormalizeRepoSlug(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"https://github.com/pankaj-kumar34/mail-probe.git", "pankaj-kumar34/mail-probe"},
		{"pankaj-kumar34/mail-probe", "pankaj-kumar34/mail-probe"},
		{"git@github.com:pankaj-kumar34/mail-probe.git", "pankaj-kumar34/mail-probe"},
	}

	for _, tc := range cases {
		if got := normalizeRepoSlug(tc.in); got != tc.want {
			t.Errorf("normalizeRepoSlug(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestCheckForUpdate_UpdateAvailable(t *testing.T) {
	updater := NewUpdaterService()
	updater.Version = "1.0.0"
	updater.TargetOS = "darwin"
	updater.TargetArch = "arm64"
	updater.HTTPClient = newTestHTTPClient(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/pankaj-kumar34/mail-probe/releases/latest" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		rel := githubRelease{
			TagName:     "v1.2.0",
			Name:        "Mail Probe v1.2.0",
			Body:        "### What's New\n- Added GitHub Releases Auto-Updater",
			HTMLURL:     "https://github.com/pankaj-kumar34/mail-probe/releases/tag/v1.2.0",
			PublishedAt: "2026-11-18T12:00:00Z",
			Assets: []githubAsset{
				{
					Name:               "mail-probe-darwin-arm64.dmg",
					Size:               42000000,
					BrowserDownloadURL: "https://example.com/mail-probe-darwin-arm64.dmg",
				},
				{
					Name:               "mail-probe-darwin-arm64.tar.gz",
					Size:               18500000,
					BrowserDownloadURL: "https://example.com/mail-probe-darwin-arm64.tar.gz",
				},
				{
					Name:               "checksums.txt",
					Size:               512,
					BrowserDownloadURL: "https://example.com/checksums.txt",
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(rel)
	})

	res, err := updater.CheckForUpdate()
	if err != nil {
		t.Fatalf("CheckForUpdate failed: %v", err)
	}
	if !res.HasUpdate {
		t.Fatalf("expected HasUpdate=true")
	}
	if res.LatestVersion != "1.2.0" {
		t.Fatalf("LatestVersion = %q, want 1.2.0", res.LatestVersion)
	}
	if res.AssetName != "mail-probe-darwin-arm64.tar.gz" {
		t.Fatalf("AssetName = %q, want mail-probe-darwin-arm64.tar.gz", res.AssetName)
	}
	if !res.CanSelfUpdate {
		t.Fatalf("expected CanSelfUpdate=true")
	}
	if res.ChecksumUrl != "https://example.com/checksums.txt" {
		t.Fatalf("ChecksumUrl = %q", res.ChecksumUrl)
	}
}

func TestCheckForUpdate_NoReleases404(t *testing.T) {
	updater := NewUpdaterService()
	updater.Version = "1.0.0"
	updater.HTTPClient = newTestHTTPClient(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})

	res, err := updater.CheckForUpdate()
	if err != nil {
		t.Fatalf("CheckForUpdate failed on 404: %v", err)
	}
	if res.HasUpdate {
		t.Fatalf("expected HasUpdate=false on 404")
	}
	if res.LatestVersion != "1.0.0" {
		t.Fatalf("LatestVersion = %q, want 1.0.0", res.LatestVersion)
	}
}

func TestDownloadAndInstallUpdate_TarGzAndChecksum(t *testing.T) {
	tmpDir := t.TempDir()
	fakeExe := filepath.Join(tmpDir, "mail-probe")
	if err := os.WriteFile(fakeExe, []byte("old-binary"), 0755); err != nil {
		t.Fatal(err)
	}

	newPayload := []byte("#!/bin/sh\necho new-mail-probe\n")
	var tarBuf bytes.Buffer
	gzw := gzip.NewWriter(&tarBuf)
	tw := tar.NewWriter(gzw)
	hdr := &tar.Header{
		Name: "mail-probe",
		Mode: 0755,
		Size: int64(len(newPayload)),
	}
	if err := tw.WriteHeader(hdr); err != nil {
		t.Fatal(err)
	}
	if _, err := tw.Write(newPayload); err != nil {
		t.Fatal(err)
	}
	_ = tw.Close()
	_ = gzw.Close()

	archiveBytes := tarBuf.Bytes()
	sum := sha256.Sum256(archiveBytes)
	checksumLine := fmt.Sprintf("%s  mail-probe-linux-amd64.tar.gz\n", hex.EncodeToString(sum[:]))

	updater := NewUpdaterService()
	updater.TargetOS = "linux"
	updater.TargetArch = "amd64"
	updater.ExecutableFn = func() (string, error) { return fakeExe, nil }
	updater.ProgressEmit = func(progress UpdateProgress) {}
	updater.HTTPClient = newTestHTTPClient(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/mail-probe-linux-amd64.tar.gz":
			_, _ = w.Write(archiveBytes)
		case "/checksums.txt":
			_, _ = w.Write([]byte(checksumLine))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	err := updater.DownloadAndInstallUpdate(
		"https://example.com/mail-probe-linux-amd64.tar.gz",
		"mail-probe-linux-amd64.tar.gz",
		"https://example.com/checksums.txt",
	)
	if err != nil {
		t.Fatalf("DownloadAndInstallUpdate failed: %v", err)
	}

	got, err := os.ReadFile(fakeExe)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(newPayload) {
		t.Fatalf("binary content mismatch: got %q, want %q", string(got), string(newPayload))
	}
}
