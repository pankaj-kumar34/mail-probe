# Mail Probe

A native macOS SMTP diagnostics tool. Test connections, send emails, inspect raw SMTP protocol logs — all from a clean desktop UI.

## Features

- **Multi-server profiles** — save and manage multiple SMTP servers with per-profile test status
- **Full SMTP diagnostics** — raw protocol log for every connection (EHLO, AUTH, MAIL FROM, DATA…)
- **Port 465 implicit TLS** + port 587/25 STARTTLS — both work correctly
- **File attachments** — native macOS file picker, multipart MIME encoding
- **Cc / Bcc** — recipient chips with drag support
- **Send-via picker** — only shows servers you've successfully tested
- **Snippets & templates** — save reusable subject/body combos
- **Sent history** — searchable log of every sent email
- **Autocomplete** — remembers addresses, subjects, and names across sessions
- **File-based storage** — all data in `~/Library/Application Support/Mail Probe/data.json` (atomic writes, Time Machine backed)

## Stack

- **Backend:** Go + [Wails v3](https://v3.wails.io/)
- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Theme:** Light zinc + emerald, native macOS light titlebar

## Build

Requires: Go, Node.js (via nvm), [Wails v3](https://v3.wails.io/), [Task](https://taskfile.dev/)

```sh
# Build + bundle as .app
wails3 task darwin:package

# Install to /Applications
cp -r "bin/Mail Probe.app" /Applications/

# Dev mode (hot reload)
wails3 dev
```

Output: `bin/Mail Probe.app`

## Project Structure

```
mail-probe/
├── main.go                  # App bootstrap, window config
├── app.go                   # SMTP client, file I/O, native dialogs
├── build/
│   ├── config.yml           # App metadata (name, version, bundle ID)
│   └── darwin/              # macOS icons, Info.plist
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Full UI — profiles, compose, history
│   │   ├── index.css        # Tailwind + shadcn CSS vars
│   │   └── components/ui/   # shadcn components
│   └── bindings/            # Auto-generated Wails v3 TS bindings
└── Taskfile.yml             # Build tasks (darwin:build, darwin:package, darwin:run)
```

## Data

All state is stored in a single JSON file:

```
~/Library/Application Support/Mail Probe/data.json
```

Includes: profiles, test status, sent history, snippets, templates, compose draft, autocomplete history.
