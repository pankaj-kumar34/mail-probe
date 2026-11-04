package main

import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// ── Types ────────────────────────────────────────────────────────────────────

type SMTPConfig struct {
	Server    string `json:"server"`
	Port      int    `json:"port"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	AuthType  string `json:"authType"`
	StartTLS  bool   `json:"startTLS"`
	SkipVerify bool  `json:"skipVerify"`
}

type EmailRequest struct {
	Config      SMTPConfig `json:"config"`
	From        string     `json:"from"`
	ReplyTo     string     `json:"replyTo"`
	To          []string   `json:"to"`
	CC          []string   `json:"cc"`
	BCC         []string   `json:"bcc"`
	Subject     string     `json:"subject"`
	Body        string     `json:"body"`
	HTML        string     `json:"html"`
	Attachments []string   `json:"attachments"`
}

type SMTPResult struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	ServerBanner string `json:"serverBanner"`
	QueueID      string `json:"queueId"`
	Duration     string `json:"duration"`
	Log          string `json:"log"`
}

// ── Data persistence ─────────────────────────────────────────────────────────

// dataDir returns ~/Library/Application Support/Mail Probe
func dataDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, "Library", "Application Support", "Mail Probe")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return dir, nil
}

func dataFile() (string, error) {
	dir, err := dataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "data.json"), nil
}

// LoadData reads the data file and returns its contents.
// Returns "" if the file doesn't exist yet (first run).
func (a *App) LoadData() string {
	path, err := dataFile()
	if err != nil {
		return ""
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return "" // file doesn't exist yet — first run
	}
	return string(b)
}

// SaveData writes data atomically to the data file using a temp file + rename.
func (a *App) SaveData(data string) error {
	path, err := dataFile()
	if err != nil {
		return err
	}
	// Write to temp file first
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(data), 0600); err != nil {
		return err
	}
	// Atomic rename
	return os.Rename(tmp, path)
}

// DataFilePath returns the path to the data file so the user can find it.
func (a *App) DataFilePath() string {
	path, _ := dataFile()
	return path
}

// ── App ──────────────────────────────────────────────────────────────────────

type App struct {
	app *application.App
}

func NewApp() *App { return &App{} }

func (a *App) setApp(app *application.App) { a.app = app }

// PickFiles opens a native file picker and returns selected file paths
func (a *App) PickFiles() []string {
	files, err := a.app.Dialog.OpenFile().
		SetTitle("Select Attachments").
		PromptForMultipleSelection()
	if err != nil || files == nil {
		return []string{}
	}
	return files
}

// ── SMTP Client ──────────────────────────────────────────────────────────────

type smtpSession struct {
	conn   net.Conn
	tp     *textproto.Conn
	log    strings.Builder
	debug  bool
}

func newSession(conn net.Conn, debug bool) *smtpSession {
	return &smtpSession{
		conn:  conn,
		tp:    textproto.NewConn(conn),
		debug: debug,
	}
}

func (s *smtpSession) logLine(dir, line string) {
	ts := time.Now().Format("15:04:05.000")
	s.log.WriteString(fmt.Sprintf("[%s] %s %s\n", ts, dir, line))
}

func (s *smtpSession) readLine() (string, error) {
	line, err := s.tp.ReadLine()
	if err != nil {
		return "", err
	}
	s.logLine("S:", line)
	return line, nil
}

func (s *smtpSession) readResponse() (int, string, error) {
	code, msg, err := s.tp.ReadResponse(0)
	if err != nil {
		s.logLine("S:", fmt.Sprintf("ERROR: %v", err))
		return 0, "", err
	}
	s.logLine("S:", fmt.Sprintf("%d %s", code, msg))
	return code, msg, nil
}

func (s *smtpSession) cmd(expectCode int, format string, args ...interface{}) (string, error) {
	line := fmt.Sprintf(format, args...)
	// Redact auth lines in log
	logLine := line
	if strings.HasPrefix(line, "AUTH ") {
		parts := strings.SplitN(line, " ", 3)
		if len(parts) >= 2 {
			logLine = parts[0] + " " + parts[1] + " [REDACTED]"
		}
	}
	s.logLine("C:", logLine)

	// Write command via textproto (handles buffering correctly)
	if err := s.tp.PrintfLine("%s", line); err != nil {
		return "", fmt.Errorf("write failed: %v", err)
	}

	code, msg, err := s.tp.ReadResponse(expectCode)
	if err != nil {
		s.logLine("S:", fmt.Sprintf("ERROR %d: %v", code, err))
		return "", fmt.Errorf("%d %v", code, err)
	}
	s.logLine("S:", fmt.Sprintf("%d %s", code, msg))
	return msg, nil
}

func (s *smtpSession) upgradeTLS(host string, skipVerify bool) error {
	tlsCfg := &tls.Config{
		ServerName:         host,
		InsecureSkipVerify: skipVerify,
		MinVersion:         tls.VersionTLS12,
	}
	tlsConn := tls.Client(s.conn, tlsCfg)
	if err := tlsConn.Handshake(); err != nil {
		return fmt.Errorf("TLS handshake failed: %v", err)
	}
	state := tlsConn.ConnectionState()
	s.logLine("TLS:", fmt.Sprintf("version=%s cipher=%s",
		tlsVersionStr(state.Version),
		tls.CipherSuiteName(state.CipherSuite)))
	s.conn = tlsConn
	s.tp = textproto.NewConn(tlsConn)
	return nil
}

func tlsVersionStr(v uint16) string {
	switch v {
	case tls.VersionTLS12:
		return "TLS1.2"
	case tls.VersionTLS13:
		return "TLS1.3"
	default:
		return fmt.Sprintf("0x%04x", v)
	}
}

func b64(s string) string {
	return base64.StdEncoding.EncodeToString([]byte(s))
}

// ehloHostname returns a clean hostname suitable for EHLO.
// Prefers a fully-qualified domain; falls back to "mail-probe.local".
func ehloHostname() string {
	h, err := os.Hostname()
	if err != nil || h == "" {
		return "mail-probe.local"
	}
	h = strings.ToLower(h)
	// If it already looks like an FQDN (has a dot), use it
	if strings.Contains(h, ".") {
		return h
	}
	// Bare names like "pankajs-macbook-pro" — append .local
	return h + ".local"
}

// ── Core connect + authenticate ──────────────────────────────────────────────

// implicitTLSPort returns true for ports that use implicit TLS (connect-time TLS).
// Port 465 = SMTPS. Port 25/587 = plain/STARTTLS.
func implicitTLSPort(port int) bool {
	return port == 465
}

func dialAndHandshake(cfg SMTPConfig) (*smtpSession, error) {
	addr := net.JoinHostPort(cfg.Server, fmt.Sprintf("%d", cfg.Port))

	var conn net.Conn
	var err error

	if implicitTLSPort(cfg.Port) {
		// Port 465: wrap in TLS immediately before any data
		tlsCfg := &tls.Config{
			ServerName:         cfg.Server,
			InsecureSkipVerify: cfg.SkipVerify,
			MinVersion:         tls.VersionTLS12,
		}
		dialer := &net.Dialer{Timeout: 15 * time.Second}
		rawConn, err := dialer.Dial("tcp", addr)
		if err != nil {
			return nil, fmt.Errorf("tcp connect failed: %v", err)
		}
		tlsConn := tls.Client(rawConn, tlsCfg)
		if err = tlsConn.Handshake(); err != nil {
			rawConn.Close()
			return nil, fmt.Errorf("TLS handshake failed: %v", err)
		}
		state := tlsConn.ConnectionState()
		s := newSession(tlsConn, true)
		s.logLine("TLS:", fmt.Sprintf("implicit TLS port=%d version=%s cipher=%s",
			cfg.Port, tlsVersionStr(state.Version), tls.CipherSuiteName(state.CipherSuite)))

		// Read greeting — must be 220
		greetCode, greeting, err := s.readResponse()
		s.logLine(">>", fmt.Sprintf("GREETING %d: %s (err=%v)", greetCode, greeting, err))
		if err != nil {
			tlsConn.Close()
			return s, fmt.Errorf("greeting failed: %v", err)
		}
		if greetCode != 220 {
			tlsConn.Close()
			return s, fmt.Errorf("unexpected greeting %d: %s", greetCode, greeting)
		}
		s.logLine(">>", "Server: "+greeting)

		hostname := ehloHostname()

		// EHLO
		if _, err = s.cmd(250, "EHLO %s", hostname); err != nil {
			tlsConn.Close()
			return s, fmt.Errorf("EHLO failed: %v", err)
		}

		// AUTH (no STARTTLS needed — already encrypted)
		if cfg.Username != "" {
			if err = authenticate(s, cfg); err != nil {
				tlsConn.Close()
				return s, err
			}
		}
		return s, nil
	}

	// Plain TCP connect (port 25, 587, etc.)
	conn, err = net.DialTimeout("tcp", addr, 15*time.Second)
	if err != nil {
		return nil, fmt.Errorf("connect failed: %v", err)
	}

	s := newSession(conn, true)

	// Read greeting — must be 220
	greetCode, greeting, err := s.readResponse()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("greeting failed: %v", err)
	}
	if greetCode != 220 {
		conn.Close()
		return nil, fmt.Errorf("unexpected greeting %d: %s", greetCode, greeting)
	}
	s.logLine(">>", "Server: "+greeting)

	hostname := ehloHostname()

	// EHLO
	if _, err = s.cmd(250, "EHLO %s", hostname); err != nil {
		conn.Close()
		return nil, fmt.Errorf("EHLO failed: %v", err)
	}

	// STARTTLS
	if cfg.StartTLS {
		if _, err = s.cmd(220, "STARTTLS"); err != nil {
			conn.Close()
			return nil, fmt.Errorf("STARTTLS failed: %v", err)
		}
		if err = s.upgradeTLS(cfg.Server, cfg.SkipVerify); err != nil {
			conn.Close()
			return nil, err
		}
		// Re-EHLO after TLS
		if _, err = s.cmd(250, "EHLO %s", hostname); err != nil {
			conn.Close()
			return nil, fmt.Errorf("EHLO after TLS failed: %v", err)
		}
	}

	// AUTH
	if cfg.Username != "" {
		if err = authenticate(s, cfg); err != nil {
			conn.Close()
			return nil, err
		}
	}

	return s, nil
}

func authenticate(s *smtpSession, cfg SMTPConfig) error {
	switch strings.ToLower(cfg.AuthType) {
	case "plain", "":
		creds := b64(fmt.Sprintf("\x00%s\x00%s", cfg.Username, cfg.Password))
		_, err := s.cmd(235, "AUTH PLAIN %s", creds)
		return err

	case "login":
		if _, err := s.cmd(334, "AUTH LOGIN"); err != nil {
			return err
		}
		if _, err := s.cmd(334, "%s", b64(cfg.Username)); err != nil {
			return fmt.Errorf("LOGIN username rejected: %v", err)
		}
		if _, err := s.cmd(235, "%s", b64(cfg.Password)); err != nil {
			return fmt.Errorf("LOGIN password rejected: %v", err)
		}
		return nil

	default:
		return fmt.Errorf("unsupported auth type: %s", cfg.AuthType)
	}
}

// ── sanitize ──────────────────────────────────────────────────────────────────

func trimStr(s string) string { return strings.TrimSpace(s) }

// trimConfig trims whitespace from all string fields in SMTPConfig.
func trimConfig(cfg SMTPConfig) SMTPConfig {
	cfg.Server   = trimStr(cfg.Server)
	cfg.Username = trimStr(cfg.Username)
	cfg.Password = trimStr(cfg.Password)
	cfg.AuthType = strings.ToLower(trimStr(cfg.AuthType))
	return cfg
}

// trimRequest trims whitespace from all string fields in EmailRequest.
func trimRequest(req EmailRequest) EmailRequest {
	req.Config  = trimConfig(req.Config)
	req.From    = strings.TrimSpace(req.From)
	req.ReplyTo = strings.TrimSpace(req.ReplyTo)
	req.Subject = strings.TrimSpace(req.Subject)
	req.Body    = strings.TrimSpace(req.Body)
	// trim each recipient, drop blanks
	clean := func(addrs []string) []string {
		out := make([]string, 0, len(addrs))
		for _, a := range addrs {
			if t := strings.TrimSpace(a); t != "" {
				out = append(out, t)
			}
		}
		return out
	}
	req.To  = clean(req.To)
	req.CC  = clean(req.CC)
	req.BCC = clean(req.BCC)
	// trim attachment paths
	atts := make([]string, 0, len(req.Attachments))
	for _, p := range req.Attachments {
		if t := strings.TrimSpace(p); t != "" {
			atts = append(atts, t)
		}
	}
	req.Attachments = atts
	return req
}

// ── Wails-bound methods ───────────────────────────────────────────────────────

func (a *App) TestConnection(cfg SMTPConfig) SMTPResult {
	cfg = trimConfig(cfg)
	if cfg.Server == "" {
		return SMTPResult{Success: false, Message: "Server address is required"}
	}
	start := time.Now()
	s, err := dialAndHandshake(cfg)
	dur := time.Since(start).Round(time.Millisecond).String()
	if err != nil {
		return SMTPResult{Success: false, Message: err.Error(), Duration: dur, Log: s.logSafe()}
	}
	defer s.conn.Close()
	s.cmd(221, "QUIT")
	return SMTPResult{
		Success:  true,
		Message:  fmt.Sprintf("Connected to %s:%d successfully", cfg.Server, cfg.Port),
		Duration: dur,
		Log:      s.log.String(),
	}
}

func (s *smtpSession) logSafe() string {
	if s == nil {
		return ""
	}
	return s.log.String()
}

func (a *App) SendEmail(req EmailRequest) SMTPResult {
	req = trimRequest(req)
	if req.Config.Server == "" {
		return SMTPResult{Success: false, Message: "Server address is required"}
	}
	if req.From == "" {
		return SMTPResult{Success: false, Message: "From address is required"}
	}
	if len(req.To) == 0 {
		return SMTPResult{Success: false, Message: "At least one recipient is required"}
	}
	start := time.Now()
	s, err := dialAndHandshake(req.Config)
	dur := func() string { return time.Since(start).Round(time.Millisecond).String() }

	if err != nil {
		return SMTPResult{Success: false, Message: err.Error(), Duration: dur(), Log: s.logSafe()}
	}
	defer s.conn.Close()

	// MAIL FROM — envelope address must be bare email, no display name
	if _, err = s.cmd(250, "MAIL FROM:<%s>", extractEmail(req.From)); err != nil {
		return SMTPResult{Success: false, Message: err.Error(), Duration: dur(), Log: s.log.String()}
	}

	// RCPT TO — all recipients
	allTo := append(append(req.To, req.CC...), req.BCC...)
	for _, rcpt := range allTo {
		rcpt = strings.TrimSpace(rcpt)
		if rcpt == "" {
			continue
		}
		if _, err = s.cmd(250, "RCPT TO:<%s>", rcpt); err != nil {
			return SMTPResult{Success: false, Message: fmt.Sprintf("RCPT TO <%s> failed: %v", rcpt, err), Duration: dur(), Log: s.log.String()}
		}
	}

	// DATA
	if _, err = s.cmd(354, "DATA"); err != nil {
		return SMTPResult{Success: false, Message: err.Error(), Duration: dur(), Log: s.log.String()}
	}

	// Build & send message
	msg := buildMessage(req)
	s.logLine("C:", fmt.Sprintf("[message body — %d bytes]", len(msg)))

	// Write body through DotWriter — this dot-stuffs and appends \r\n.\r\n on Close
	w := s.tp.DotWriter()
	if _, err = fmt.Fprint(w, msg); err != nil {
		w.Close() //nolint
		return SMTPResult{Success: false, Message: fmt.Sprintf("write body error: %v", err), Duration: dur(), Log: s.log.String()}
	}
	if err = w.Close(); err != nil {
		return SMTPResult{Success: false, Message: fmt.Sprintf("close dot-writer error: %v", err), Duration: dur(), Log: s.log.String()}
	}
	s.logLine("C:", fmt.Sprintf(". [end-of-data, total %d bytes]", len(msg)))

	// Read the 250 queue response — use ReadResponse(250) so we get proper error on non-250
	code, queueMsg, err := s.tp.ReadResponse(250)
	if err != nil {
		s.logLine("S:", fmt.Sprintf("ERROR after DATA: code=%d err=%v", code, err))
		return SMTPResult{Success: false, Message: fmt.Sprintf("DATA response: code=%d %v", code, err), Duration: dur(), Log: s.log.String()}
	}
	s.logLine("S:", fmt.Sprintf("%d %s", code, queueMsg))

	// Extract queue ID from response (e.g. "Ok: queued as ABC123")
	queueID := queueMsg
	if idx := strings.Index(strings.ToLower(queueMsg), "queued"); idx >= 0 {
		queueID = queueMsg[idx:]
	}

	s.cmd(221, "QUIT")
	return SMTPResult{
		Success:  true,
		Message:  fmt.Sprintf("%d %s", code, queueMsg),
		QueueID:  queueID,
		Duration: dur(),
		Log:      s.log.String(),
	}
}

// extractEmail pulls the bare email address out of "Name <email>" or "email".
func extractEmail(addr string) string {
	addr = strings.TrimSpace(addr)
	if i := strings.LastIndex(addr, "<"); i >= 0 {
		if j := strings.Index(addr[i:], ">"); j >= 0 {
			return strings.TrimSpace(addr[i+1 : i+j])
		}
	}
	return addr
}

// qpEncode writes body as quoted-printable into w, normalising \n → \r\n
func qpEncode(w interface{ Write([]byte) (int, error) }, body string) {
	// Normalise line endings before encoding
	body = strings.ReplaceAll(body, "\r\n", "\n")
	body = strings.ReplaceAll(body, "\r", "\n")
	qw := quotedprintable.NewWriter(w)
	qw.Write([]byte(body)) //nolint
	qw.Close()             //nolint
}

func buildMessage(req EmailRequest) string {
	now := time.Now().Format(time.RFC1123Z)
	msgID := fmt.Sprintf("<%d.mail-probe@local>", time.Now().UnixNano())

	hasPlain := strings.TrimSpace(req.Body) != ""
	hasHTML  := strings.TrimSpace(req.HTML) != ""
	hasAtt   := len(req.Attachments) > 0

	// writeTextPart adds a text/plain or text/html part to a multipart writer.
	// Normalises line endings to \r\n as required by RFC 5321.
	writeTextPart := func(mw *multipart.Writer, ctype, body string) {
		hdr := make(textproto.MIMEHeader)
		hdr.Set("Content-Type", ctype+"; charset=UTF-8")
		hdr.Set("Content-Transfer-Encoding", "quoted-printable")
		pw, _ := mw.CreatePart(hdr)
		// Encode as quoted-printable — handles long lines + binary-safe \r\n
		qpEncode(pw, body) //nolint
	}

	// buildBodyParts writes the body section (alt or single) into mw.
	buildBodyParts := func(mw *multipart.Writer) {
		if hasPlain && hasHTML {
			var altBuf bytes.Buffer
			altW := multipart.NewWriter(&altBuf)
			hdr := make(textproto.MIMEHeader)
			hdr.Set("Content-Type", "multipart/alternative; boundary=\""+altW.Boundary()+"\"")
			pw, _ := mw.CreatePart(hdr)
			writeTextPart(altW, "text/plain", req.Body)
			writeTextPart(altW, "text/html", req.HTML)
			altW.Close()
			pw.Write(altBuf.Bytes()) //nolint
		} else if hasHTML {
			writeTextPart(mw, "text/html", req.HTML)
		} else {
			writeTextPart(mw, "text/plain", req.Body)
		}
	}

	// ── Build headers + body into a final buffer ──────────────────────────────
	var out bytes.Buffer
	writeHeaders := func(contentTypeLine string) {
		fmt.Fprintf(&out, "From: %s\r\n", req.From)
		if req.ReplyTo != "" {
			fmt.Fprintf(&out, "Reply-To: %s\r\n", req.ReplyTo)
		}
		fmt.Fprintf(&out, "To: %s\r\n", strings.Join(req.To, ", "))
		if len(req.CC) > 0 {
			fmt.Fprintf(&out, "Cc: %s\r\n", strings.Join(req.CC, ", "))
		}
		fmt.Fprintf(&out, "Subject: %s\r\n", req.Subject)
		fmt.Fprintf(&out, "Date: %s\r\n", now)
		fmt.Fprintf(&out, "Message-ID: %s\r\n", msgID)
		out.WriteString("MIME-Version: 1.0\r\n")
		out.WriteString(contentTypeLine)
	}

	if hasAtt {
		var bodyBuf bytes.Buffer
		mw := multipart.NewWriter(&bodyBuf)
		buildBodyParts(mw)
		// Attachment parts
		for _, path := range req.Attachments {
			data, err := os.ReadFile(path)
			if err != nil {
				continue
			}
			filename := filepath.Base(path)
			mimeType := mime.TypeByExtension(filepath.Ext(path))
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}
			hdr := make(textproto.MIMEHeader)
			hdr.Set("Content-Type", fmt.Sprintf("%s; name=\"%s\"", mimeType, filename))
			hdr.Set("Content-Transfer-Encoding", "base64")
			hdr.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
			pw, err := mw.CreatePart(hdr)
			if err != nil {
				continue
			}
			encoded := base64.StdEncoding.EncodeToString(data)
			for len(encoded) > 76 {
				pw.Write([]byte(encoded[:76] + "\r\n")) //nolint
				encoded = encoded[76:]
			}
			if len(encoded) > 0 {
				pw.Write([]byte(encoded + "\r\n")) //nolint
			}
		}
		mw.Close()
		writeHeaders(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n\r\n", mw.Boundary()))
		out.Write(bodyBuf.Bytes())

	} else if hasPlain && hasHTML {
		var bodyBuf bytes.Buffer
		mw := multipart.NewWriter(&bodyBuf)
		writeTextPart(mw, "text/plain", req.Body)
		writeTextPart(mw, "text/html", req.HTML)
		mw.Close()
		writeHeaders(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n\r\n", mw.Boundary()))
		out.Write(bodyBuf.Bytes())

	} else if hasHTML {
		writeHeaders("Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n")
		qpEncode(&out, req.HTML)

	} else {
		writeHeaders("Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n")
		qpEncode(&out, req.Body)
	}

	return out.String()
}
