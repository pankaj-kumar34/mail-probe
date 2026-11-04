import { useState, useEffect, useRef, useCallback } from 'react'
import { TestConnection, SendEmail, PickFiles, LoadData, SaveData } from '../bindings/mail-probe/app'
import { SMTPConfig } from '../bindings/mail-probe/models'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Server, Mail, ClipboardList, Plus, Trash2, Zap, Send, Paperclip, X,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, Save,
  NotebookPen, Copy, Check, GripVertical, History, BookmarkPlus, FileText, RotateCcw,
} from 'lucide-react'

// ── Wails bridge ─────────────────────────────────────────────────────────────
const toSMTPConfig = (p: ServerProfile): SMTPConfig => ({
  server: p.server, port: p.port, username: p.username, password: p.password,
  authType: p.authType, startTLS: p.startTLS, skipVerify: p.skipVerify,
})

// ── Types ─────────────────────────────────────────────────────────────────────
interface ServerProfile {
  id: string; name: string; server: string; port: number
  username: string; password: string; authType: string
  startTLS: boolean; skipVerify: boolean
}
interface EmailReq {
  from: string; fromName: string; replyTo: string; to: string[]; cc: string[]; bcc: string[]
  subject: string; body: string; html: string; attachments: string[]
}
interface Result {
  success: boolean; message: string; queueId?: string; duration?: string; log?: string
}
type View = 'servers' | 'compose' | 'snippets' | 'log' | 'history' | 'templates'

// ── Snippets ──────────────────────────────────────────────────────────────────
interface SnippetItem {
  id: string; value: string
}
interface SnippetGroup {
  id: string; name: string; items: SnippetItem[]; createdAt: number
  x?: number; y?: number; width?: number
}

// ── Templates ─────────────────────────────────────────────────────────────────
interface EmailTemplate {
  id: string; name: string; createdAt: number
  email: EmailReq
}

// ── Send History ──────────────────────────────────────────────────────────────
interface SentEmail {
  id: string; sentAt: number; server: string
  email: EmailReq; result: Result
}

// ── Persistent store (file-based via Go) ─────────────────────────────────────
interface AppData {
  profiles:    ServerProfile[]
  activeId:    string
  snippets:    SnippetGroup[]
  templates:   EmailTemplate[]
  sentHistory: SentEmail[]
  draft:       Partial<EmailReq>
  testStatus:  Record<string, boolean>
  history:     Record<string, string[]>
}

const EMPTY_DATA: AppData = {
  profiles: [], activeId: '', snippets: [], templates: [],
  sentHistory: [], draft: {}, testStatus: {}, history: {},
}

function parseAppData(raw: string): AppData {
  try {
    if (!raw) return EMPTY_DATA
    const d = JSON.parse(raw)
    return { ...EMPTY_DATA, ...d }
  } catch { return EMPTY_DATA }
}

const t = (s: string) => s.trim()

const newProfile = (o?: Partial<ServerProfile>): ServerProfile => ({
  id: crypto.randomUUID(), name: 'New Server',
  server: '', port: 587, username: '', password: '',
  authType: 'plain', startTLS: true, skipVerify: false, ...o,
})

const trimProfile = (p: ServerProfile): ServerProfile => ({
  ...p, name: t(p.name) || 'Unnamed', server: t(p.server),
  username: t(p.username), password: t(p.password),
  authType: t(p.authType).toLowerCase() || 'plain',
})

// ── ResultPane ────────────────────────────────────────────────────────────────
function ResultPane({ r, label }: { r: Result; label: string }) {
  const [showLog, setShowLog] = useState(false)
  const ok = r.success
  return (
    <div className={cn('rounded-lg border mt-4 overflow-hidden text-sm bg-card animate-fade-up',
      ok ? 'border-emerald-200' : 'border-red-200')}>
      <div className={cn('flex items-center justify-between px-4 py-2.5 border-b',
        ok ? 'border-emerald-100' : 'border-red-100')}>
        <div className="flex items-center gap-2">
          {ok
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
          <span className={cn('font-semibold text-sm', ok ? 'text-emerald-700' : 'text-red-700')}>
            {ok ? `${label} successful` : `${label} failed`}
          </span>
        </div>
        {r.log && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground"
            onClick={() => setShowLog(o => !o)}>
            SMTP log {showLog ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        )}
      </div>
      <p className="px-4 py-3 text-xs font-mono leading-relaxed text-foreground">
        {r.message || (ok ? 'Success' : 'Unknown error')}
      </p>
      {(r.queueId || r.duration) && (
        <div className="flex gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {r.queueId  && <span><span className="font-medium text-foreground">Queue: </span>{r.queueId}</span>}
          {r.duration && <span><span className="font-medium text-foreground">Time: </span>{r.duration}</span>}
        </div>
      )}
      {showLog && r.log && (
        <div className="border-t border-border max-h-48 overflow-y-auto">
          <pre className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{r.log}</pre>
        </div>
      )}
    </div>
  )
}

// ── FieldRow ──────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  )
}

// ── History autocomplete ──────────────────────────────────────────────────────
type HistoryMap = Record<string, string[]>

function recordHistory(field: string, value: string, history: HistoryMap, setHistory: (h: HistoryMap) => void) {
  if (!value?.trim()) return
  const prev = history[field] || []
  if (prev[0] === value) return
  const next = { ...history, [field]: [value, ...prev.filter(v => v !== value)].slice(0, 20) }
  setHistory(next)
}

function AutoInput({ value, onChange, onPaste, placeholder, type = 'text', historyItems = [] }: {
  value: string; onChange: (v: string) => void
  onPaste?: (v: string) => void
  placeholder?: string; type?: string; historyItems?: string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = historyItems.filter(v => v !== value && v.toLowerCase().includes(value.toLowerCase()))

  return (
    <div ref={ref} className="relative">
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onPaste={onPaste ? e => {
          const text = e.clipboardData.getData('text')
          if (text.includes(',') || text.includes(';') || text.includes('\n')) {
            e.preventDefault()
            onPaste(text)
          }
        } : undefined}
      />
      {open && history.length > 0 && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-fade-up">
          {suggestions.map((v, i) => (
            <button key={i} type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors truncate text-foreground"
              onMouseDown={() => { onChange(v); setOpen(false) }}>
              {type === 'password' ? '••••••••' : v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ServerForm ────────────────────────────────────────────────────────────────
function ServerForm({ profile, onChange, onTest, onSave, loading, result, historyMap = {} }: {
  profile: ServerProfile; onChange: (p: ServerProfile) => void
  onTest: () => void; onSave: () => void; loading: boolean; result: Result | null
  historyMap?: HistoryMap
}) {
  const upd = (k: keyof ServerProfile, v: unknown) => onChange({ ...profile, [k]: v })
  return (
    <div className="space-y-5">
      <FieldRow label="Profile Name">
        <AutoInput value={profile.name} onChange={v => upd('name', v)} placeholder="e.g. Work SMTP, Gmail…" historyItems={historyMap['profile_name']} />
      </FieldRow>

      <div className="grid grid-cols-[1fr_130px] gap-4">
        <FieldRow label="SMTP Server">
          <AutoInput value={profile.server} onChange={v => upd('server', v)} placeholder="smtp.example.com" historyItems={historyMap['smtp_server']} />
        </FieldRow>
        <FieldRow label="Port">
          <AutoInput value={String(profile.port)} onChange={v => upd('port', parseInt(v) || 587)} placeholder="587" historyItems={historyMap['smtp_port']} />
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Username">
          <AutoInput value={profile.username} onChange={v => upd('username', v)} placeholder="user@example.com" historyItems={historyMap['smtp_username']} />
        </FieldRow>
        <FieldRow label="Password">
          <AutoInput value={profile.password} onChange={v => upd('password', v)} placeholder="••••••••" type="password" historyItems={historyMap['smtp_password']} />
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Auth Method">
          <select
            value={profile.authType}
            onChange={e => upd('authType', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground">
            <option value="plain">PLAIN</option>
            <option value="login">LOGIN</option>
          </select>
        </FieldRow>
        <FieldRow label="Security">
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {profile.port === 465 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Implicit TLS
              </span>
            ) : (
              <button
                onClick={() => upd('startTLS', !profile.startTLS)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                  profile.startTLS
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600'
                )}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                STARTTLS
              </button>
            )}
            <button
              onClick={() => upd('skipVerify', !profile.skipVerify)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                profile.skipVerify
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600'
              )}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Skip Verify
            </button>
          </div>
        </FieldRow>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onSave}>
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save
        </Button>
        <Button size="sm" onClick={onTest} disabled={loading || !profile.server}>
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Testing…</>
            : <><Zap className="w-3.5 h-3.5 mr-1.5" /> Test Connection</>}
        </Button>
      </div>

      {result && <ResultPane r={result} label="Connection" />}
    </div>
  )
}

// ── DraggableCard ─────────────────────────────────────────────────────────────
const palette = [
  { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  { bar: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-400' },
  { bar: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-400' },
  { bar: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400' },
  { bar: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-400' },
  { bar: 'bg-cyan-500',    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',          dot: 'bg-cyan-400' },
]

function DraggableCard({ g, gi, copiedId, onUpdate, onDelete, onCopy }: {
  g: SnippetGroup; gi: number
  copiedId: string | null
  onUpdate: (id: string, changes: Partial<SnippetGroup>) => void
  onDelete: (id: string) => void
  onCopy: (itemId: string, value: string) => void
}) {
  const color = palette[gi % palette.length]
  const dragging = useRef(false)
  const origin   = useRef({ mx: 0, my: 0, cx: 0, cy: 0 })
  const cardRef  = useRef<HTMLDivElement>(null)

  const onMouseDown = (e: React.MouseEvent) => {
    // only drag from the header bar, not inputs/buttons
    if ((e.target as HTMLElement).closest('input,button,textarea')) return
    e.preventDefault()
    dragging.current = true
    origin.current = { mx: e.clientX, my: e.clientY, cx: g.x ?? 0, cy: g.y ?? 0 }

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      onUpdate(g.id, {
        x: origin.current.cx + ev.clientX - origin.current.mx,
        y: origin.current.cy + ev.clientY - origin.current.my,
      })
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // width stored in group, default 260
  const cardWidth = g.width ?? 260

  const onResizeDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = cardWidth
    const onMove = (ev: MouseEvent) => {
      const newW = Math.min(520, Math.max(200, startW + ev.clientX - startX))
      onUpdate(g.id, { width: newW })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={cardRef}
      style={{ position: 'absolute', left: g.x ?? 0, top: g.y ?? 0, width: cardWidth, zIndex: 1 }}
      className="rounded-xl border border-border bg-card overflow-hidden shadow-md select-none"
    >
      <div className={cn('h-1 w-full', color.bar)} />
      {/* Header — drag zone */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0', color.badge)}>
            {g.items.filter(i => i.value).length}
          </span>
          <input
            value={g.name}
            onChange={e => onUpdate(g.id, { name: e.target.value })}
            className="text-sm font-semibold bg-transparent focus:outline-none min-w-0 flex-1 border-b border-transparent focus:border-primary transition-colors cursor-text"
            placeholder="Group name…"
          />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => onUpdate(g.id, { items: [...g.items, { id: crypto.randomUUID(), value: '' }] })}>
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
            onClick={() => onDelete(g.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {/* Items */}
      <div className="divide-y divide-border border-t border-border">
        {g.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 px-4 py-2.5 group/item hover:bg-muted/20 transition-colors">
            <span className={cn('w-1 h-4 rounded-full shrink-0', color.dot)} />
            <input
              value={item.value}
              onChange={e => onUpdate(g.id, { items: g.items.map((x, i) => i === idx ? { ...x, value: e.target.value } : x) })}
              placeholder="type or paste value…"
              className="flex-1 text-sm font-mono text-foreground bg-transparent focus:outline-none min-w-0 cursor-text"
            />
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <button
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-muted hover:bg-accent transition-colors"
                onClick={() => onCopy(item.id, item.value)}>
                {copiedId === item.id
                  ? <><Check className="w-2.5 h-2.5 text-emerald-500" /><span className="text-emerald-600">Copied</span></>
                  : <><Copy className="w-2.5 h-2.5" /><span>Copy</span></>}
              </button>
              <button className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => onUpdate(g.id, { items: g.items.filter((_, i) => i !== idx) })}>
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Resize handle */}
      <div
        onMouseDown={onResizeDown}
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize group/resize"
        style={{ zIndex: 2 }}
      >
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-0.5 rounded-full bg-border opacity-0 group-hover/resize:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}

// ── LoadTemplateButton ────────────────────────────────────────────────────────
function LoadTemplateButton({ templates, onLoad }: {
  templates: EmailTemplate[]
  onLoad: (t: EmailTemplate) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (templates.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)}>
        <FileText className="w-3.5 h-3.5 mr-1.5" /> Templates
        <ChevronDown className="w-3 h-3 ml-1.5 text-muted-foreground" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Load Template</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {templates.map(tmpl => (
              <button key={tmpl.id}
                className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors group"
                onClick={() => { onLoad(tmpl); setOpen(false) }}>
                <p className="text-sm font-medium truncate">{tmpl.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {tmpl.email.subject || '(no subject)'}
                  {tmpl.email.html ? ' · HTML' : tmpl.email.body ? ' · Plain' : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── SaveTemplateButton ────────────────────────────────────────────────────────
function SaveTemplateButton({ onSave }: { onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  if (!editing) return (
    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
      <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" /> Save as Template
    </Button>
  )
  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && name.trim()) { onSave(name.trim()); setName(''); setEditing(false) }
          if (e.key === 'Escape') { setEditing(false); setName('') }
        }}
        placeholder="Template name…"
        className="h-8 w-44 text-sm"
      />
      <Button size="sm" disabled={!name.trim()} onClick={() => { onSave(name.trim()); setName(''); setEditing(false) }}>
        <Check className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setName('') }}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

// ── HtmlEditor ────────────────────────────────────────────────────────────────
function HtmlEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<'code' | 'preview'>('code')

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
        <span className="text-[11px] text-muted-foreground font-medium">HTML Body</span>
        <div className="flex items-center gap-0.5 bg-background border border-border rounded-md p-0.5">
          <button
            onClick={() => setMode('code')}
            className={cn(
              'px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors',
              mode === 'code' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
            Code
          </button>
          <button
            onClick={() => setMode('preview')}
            className={cn(
              'px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors',
              mode === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
            Preview
          </button>
        </div>
      </div>

      {/* Code */}
      {mode === 'code' && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="<p>Your <strong>HTML</strong> message…</p>"
          rows={10}
          className="w-full px-3 py-2.5 text-xs font-mono bg-background text-foreground resize-y focus:outline-none min-h-40"
          style={{ display: 'block' }}
        />
      )}

      {/* Preview */}
      {mode === 'preview' && (
        <div className="bg-white" style={{ minHeight: 200 }}>
          {value.trim() ? (
            <iframe
              srcDoc={value}
              sandbox="allow-same-origin"
              className="w-full border-0"
              style={{ minHeight: 280, display: 'block' }}
              onLoad={e => {
                // auto-resize to content
                const f = e.currentTarget
                try { f.style.height = f.contentDocument!.body.scrollHeight + 32 + 'px' } catch {}
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Nothing to preview yet — write some HTML in Code mode.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── RightPanel ────────────────────────────────────────────────────────────────
// Single collapsible panel with tabs: Snippets | Templates
// Icons show in the topbar; clicking one opens that tab, clicking again closes.
function RightPanel({ snippets, copiedId, onCopy, templates, onLoad, tab, onTabChange }: {
  snippets: SnippetGroup[]; copiedId: string | null; onCopy: (id: string, v: string) => void
  templates: EmailTemplate[]; onLoad: (t: EmailTemplate) => void
  tab: 'snippets' | 'templates' | null
  onTabChange: (t: 'snippets' | 'templates' | null) => void
}) {
  const panelPalette = [
    { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-700 border-violet-200' },
    { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { dot: 'bg-rose-400',    badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    { dot: 'bg-cyan-400',    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  ]
  const tmplColors = ['bg-emerald-400','bg-violet-400','bg-blue-400','bg-amber-400','bg-rose-400','bg-cyan-400']
  const open = tab !== null

  return (
    <div className={cn(
      'shrink-0 border-l border-border flex flex-col overflow-hidden bg-zinc-50/60',
      'transition-[width] duration-200 ease-in-out',
      open ? 'w-72' : 'w-0 border-l-0'
    )}>
      {/* Content */}
      <div className={cn(
        'flex-1 overflow-hidden w-72',
        open ? 'animate-slide-in-right' : 'opacity-0 pointer-events-none'
      )}>
        {/* Tab header */}
        {open && (
          <div className="h-14 border-b border-border flex items-center px-3 gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground flex-1">
              {tab === 'snippets' ? 'Snippets' : 'Templates'}
            </span>
            <button onClick={() => onTabChange(null)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <ScrollArea className="h-[calc(100%-3.5rem)]">
          {/* Snippets content */}
          {tab === 'snippets' && (
            <div className="p-2 space-y-2">
              {snippets.length === 0
                ? <p className="text-[11px] text-muted-foreground text-center py-6 px-2">No snippets yet.<br/>Add some in the Snippets tab.</p>
                : snippets.map((g, gi) => {
                  const color = panelPalette[gi % panelPalette.length]
                  return (
                    <div key={g.id} className="rounded-lg border border-border bg-card overflow-hidden">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border">
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', color.dot)} />
                        <span className="text-[11px] font-semibold truncate flex-1 text-foreground">{g.name}</span>
                        <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded-full border shrink-0', color.badge)}>
                          {g.items.filter(i => i.value).length}
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {g.items.filter(i => i.value).map(item => (
                          <button key={item.id} onClick={() => onCopy(item.id, item.value)}
                            className="w-full text-left px-2.5 py-1.5 text-[11px] font-mono text-foreground hover:bg-accent transition-colors flex items-center gap-1.5 group/si">
                            <span className="flex-1 min-w-0 break-all leading-relaxed">{item.value}</span>
                            <span className="shrink-0 opacity-0 group-hover/si:opacity-100 transition-opacity ml-1">
                              {copiedId === item.id
                                ? <Check className="w-3 h-3 text-emerald-500" />
                                : <Copy className="w-3 h-3 text-muted-foreground" />}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
          {/* Templates content */}
          {tab === 'templates' && (
            <div className="p-2 space-y-1.5">
              {templates.length === 0
                ? <p className="text-[11px] text-muted-foreground text-center py-6 px-2">No templates yet.<br/>Save one from Compose.</p>
                : templates.map((tmpl, ti) => (
                  <button key={tmpl.id} onClick={() => onLoad(tmpl)}
                    className="w-full text-left rounded-lg border border-border bg-card overflow-hidden hover:shadow-sm transition-shadow">
                    <div className={cn('h-1 w-full', tmplColors[ti % tmplColors.length])} />
                    <div className="px-2.5 py-2">
                      <p className="text-[11px] font-semibold truncate text-foreground">{tmpl.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{tmpl.email.subject || '(no subject)'}</p>
                      <div className="flex gap-1 mt-1.5">
                        {tmpl.email.html && <span className="text-[9px] font-bold bg-violet-50 text-violet-600 border border-violet-200 px-1.5 py-0.5 rounded-full">HTML</span>}
                        {tmpl.email.body && <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">Plain</span>}
                        {tmpl.email.attachments.length > 0 && <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">📎{tmpl.email.attachments.length}</span>}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

export default function App() {

  const [view, setView]         = useState<View>('servers')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [profiles, setProfiles] = useState<ServerProfile[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [editingId, setEditingId] = useState<string>('')

  const [email, setEmail] = useState<EmailReq>({
    from: '', fromName: '', replyTo: '', to: [''], cc: [], bcc: [],
    subject: '', body: '', html: '', attachments: [],
  })
  const [bodyTab, setBodyTab] = useState<'plain' | 'html'>('plain')

  const [testResults, setTestResults]     = useState<Record<string, Result>>({})
  const [testLoading, setTestLoading]     = useState<string | null>(null)
  const [testStatus, setTestStatus]       = useState<Record<string, boolean>>({})
  const [sendResult, setSendResult]   = useState<Result | null>(null)
  const [sendLoading, setSendLoading] = useState(false)
  const [sendProfileId, setSendProfileId] = useState<string>('')
  const [logs, setLogs] = useState<{ time: string; msg: string; ok: boolean }[]>([])
  const [snippets, setSnippets]   = useState<SnippetGroup[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [sentHistory, setSentHistory] = useState<SentEmail[]>([])
  const [autoHistory, setAutoHistory] = useState<HistoryMap>({})
  const [copiedId, setCopiedId]             = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [rightPanelTab, setRightPanelTab]   = useState<'snippets' | 'templates' | null>(null)

  // ── Load data on startup ─────────────────────────────────────────────────────
  useEffect(() => {
    LoadData().then((raw: string) => {
      const data = parseAppData(raw)
      const profs = (data.profiles?.length ? data.profiles : [newProfile({ name: 'Default' })])
      setProfiles(profs)
      const aid = (data.activeId && profs.find(p => p.id === data.activeId)) ? data.activeId : profs[0]?.id ?? ''
      setActiveId(aid)
      setEditingId(aid)
      setSendProfileId(aid)
      setSnippets(data.snippets || [])
      setTemplates(data.templates || [])
      setSentHistory(data.sentHistory || [])
      setAutoHistory(data.history || {})
      setTestStatus(data.testStatus || {})
      setEmail(prev => ({ ...prev, ...data.draft }))
      setDataLoaded(true)
    })
  }, [])

  // ── Save all data whenever any state changes ──────────────────────────────────
  const saveAll = useCallback(() => {
    const data: AppData = {
      profiles, activeId, snippets, templates,
      sentHistory, draft: email, testStatus, history: autoHistory,
    }
    SaveData(JSON.stringify(data, null, 2))
  }, [profiles, activeId, snippets, templates, sentHistory, email, testStatus, autoHistory])

  // Debounced save — triggers whenever any of these change (but only after first load)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!dataLoaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveAll(), 500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [dataLoaded, profiles, activeId, snippets, templates, sentHistory, email, testStatus, autoHistory])

  useEffect(() => {
    if (!profiles.find(p => p.id === sendProfileId)) setSendProfileId(profiles[0]?.id ?? '')
  }, [profiles])

  // ── Template helpers ────────────────────────────────────────────────────────
  const saveAsTemplate = (name: string) => {
    const tmpl: EmailTemplate = { id: crypto.randomUUID(), name, createdAt: Date.now(), email: { ...email } }
    setTemplates(ts => [tmpl, ...ts])
  }
  const loadTemplate = (tmpl: EmailTemplate) => {
    setEmail({ ...tmpl.email })
    setView('compose')
  }
  const deleteTemplate = (id: string) => setTemplates(ts => ts.filter(t => t.id !== id))

  // ── History helpers ─────────────────────────────────────────────────────────
  const resendEmail = (sent: SentEmail) => {
    setEmail({ ...sent.email })
    setSendProfileId(profiles.find(p => p.name === sent.server)?.id ?? sendProfileId)
    setView('compose')
  }
  const clearHistory = () => setSentHistory([])

  const addGroup = () => {
    const offset = snippets.length * 24
    const newG: SnippetGroup = {
      id: crypto.randomUUID(),
      name: 'New Group',
      items: [{ id: crypto.randomUUID(), value: '' }],
      createdAt: Date.now(),
      x: 16 + offset,
      y: 16 + offset,
    }
    setSnippets(s => [...s, newG])
  }
  const deleteGroup = (id: string) => setSnippets(s => s.filter(g => g.id !== id))
  const updateGroup = (id: string, changes: Partial<SnippetGroup>) =>
    setSnippets(s => s.map(g => g.id === id ? { ...g, ...changes } : g))
  const copyItem = (itemId: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedId(itemId)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const addLog = (msg: string, ok: boolean) =>
    setLogs(p => [{ time: new Date().toLocaleTimeString(), msg, ok }, ...p].slice(0, 200))

  const editingProfile = profiles.find(p => p.id === editingId) ?? profiles[0]
  const sendProfile    = profiles.find(p => p.id === sendProfileId) ?? profiles[0]

  const updateProfile = (u: ServerProfile) => setProfiles(ps => ps.map(p => p.id === u.id ? u : p))
  const addProfile    = () => { const p = newProfile(); setProfiles(ps => [...ps, p]); setEditingId(p.id) }
  const deleteProfile = (id: string) => {
    if (profiles.length === 1) return
    setProfiles(ps => ps.filter(p => p.id !== id))
    if (editingId === id) setEditingId(profiles.find(p => p.id !== id)!.id)
    if (activeId  === id) setActiveId(profiles.find(p => p.id !== id)!.id)
  }

  const rec = (field: string, value: string) => recordHistory(field, value, autoHistory, setAutoHistory)

  const testProfile = async (profile: ServerProfile) => {
    const clean = trimProfile(profile); updateProfile(clean); setTestLoading(clean.id)
    try {
      const r = await TestConnection(toSMTPConfig(clean)) as Result
      setTestResults(prev => ({ ...prev, [clean.id]: r }))
      setTestStatus(prev => ({ ...prev, [clean.id]: r.success }))
      if (r.success) {
        setActiveId(clean.id)
        rec('smtp_server', clean.server)
        rec('smtp_username', clean.username)
        rec('smtp_port', String(clean.port))
      }
      addLog(r.success ? `[${clean.name}] ✓ ${clean.server}:${clean.port} (${r.duration})` : `[${clean.name}] ✗ ${r.message}`, r.success)
    } catch (e) {
      const r = { success: false, message: `Error: ${e}` }
      setTestResults(prev => ({ ...prev, [clean.id]: r }))
      setTestStatus(prev => ({ ...prev, [clean.id]: false }))
      addLog(`[${clean.name}] Error: ${e}`, false)
    }
    setTestLoading(null)
  }

  const saveProfile = (p: ServerProfile) => {
    const clean = trimProfile(p)
    updateProfile(clean)
    rec('profile_name', clean.name)
    rec('smtp_server', clean.server)
    rec('smtp_port', String(clean.port))
    rec('smtp_username', clean.username)
    if (clean.password) rec('smtp_password', clean.password)
    addLog(`[${clean.name}] Saved`, true)
  }

  const updE = (k: keyof EmailReq, v: unknown) => setEmail(p => ({ ...p, [k]: v }))
  const updA = (k: 'to'|'cc'|'bcc', i: number, v: string) =>
    setEmail(p => ({ ...p, [k]: (p[k] as string[]).map((x, j) => j === i ? v : x) }))
  const appendA = (k: 'to'|'cc'|'bcc', v: string) => {
    const trimmed = v.trim()
    if (!trimmed) return
    setEmail(p => {
      const existing = (p[k] as string[]).filter(s => s.trim())
      if (existing.includes(trimmed)) return p
      return { ...p, [k]: [...existing, trimmed] }
    })
  }
  const delA = (k: 'to'|'cc'|'bcc', i: number) =>
    setEmail(p => ({ ...p, [k]: (p[k] as string[]).filter((_, j) => j !== i) }))
  // Paste: split on comma/semicolon/newline and append all non-empty unique parts
  const pasteA = (k: 'to'|'cc'|'bcc', _i: number, raw: string) => {
    const parts = raw.split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean)
    if (!parts.length) return
    setEmail(p => {
      const existing = (p[k] as string[]).filter(v => v.trim())
      const deduped = parts.filter(v => !existing.includes(v))
      return { ...p, [k]: [...existing, ...deduped] }
    })
  }
  const pickFiles = async () => {
    const files = await PickFiles() as string[]
    if (files?.length) setEmail(p => ({ ...p, attachments: [...p.attachments, ...files] }))
  }

  const doSend = async () => {
    setSendLoading(true); setSendResult(null)
    const cp = trimProfile(sendProfile)
    const toList = email.to.map(t).filter(Boolean)
    const fromAddr = t(email.from)
    const fromName = t(email.fromName)
    const fromFull = fromName ? `${fromName} <${fromAddr}>` : fromAddr
    try {
      const r = await SendEmail({
        config: toSMTPConfig(cp), from: fromFull, replyTo: t(email.replyTo),
        to: toList, cc: email.cc.map(t).filter(Boolean), bcc: email.bcc.map(t).filter(Boolean),
        subject: t(email.subject), body: email.body, html: email.html,
        attachments: email.attachments.map(t).filter(Boolean),
      }) as Result
      setSendResult(r)
      if (r.success) {
        rec('email_from', fromAddr)
        if (fromName) rec('email_from_name', fromName)
        toList.forEach(v => rec('email_to', v))
        email.cc.map(t).filter(Boolean).forEach(v => rec('email_cc', v))
        email.bcc.map(t).filter(Boolean).forEach(v => rec('email_bcc', v))
        if (t(email.subject)) rec('email_subject', t(email.subject))
        // Save to sent history
        const sent: SentEmail = {
          id: crypto.randomUUID(), sentAt: Date.now(),
          server: cp.name, email: { ...email }, result: r,
        }
        setSentHistory(h => [sent, ...h].slice(0, 200))
      }
      addLog(r.success ? `[${cp.name}] Sent → ${r.queueId || r.message} (${r.duration})` : `[${cp.name}] ✗ ${r.message}`, r.success)
    } catch (e) {
      const m = `Error: ${e}`; setSendResult({ success: false, message: m }); addLog(m, false)
    }
    setSendLoading(false)
  }

  const navItems: [View, React.ReactNode, string][] = [
    ['servers',   <Server className="w-4 h-4" />,      'Servers'],
    ['compose',   <Mail className="w-4 h-4" />,         'Compose'],
    ['snippets',  <NotebookPen className="w-4 h-4" />,  'Snippets'],
    ['templates', <FileText className="w-4 h-4" />,     'Templates'],
    ['history',   <History className="w-4 h-4" />,      'Sent History'],
    ['log',       <ClipboardList className="w-4 h-4" />, 'Activity Log'],
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100 text-foreground antialiased p-3 gap-3">

      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 flex flex-col bg-zinc-900 text-zinc-100 rounded-2xl overflow-hidden">
        {/* Logo box */}
        <div className="mx-3 mt-3 mb-1 rounded-xl bg-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-tight text-white">Mail Probe</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <p className="text-[10px] font-medium text-zinc-500 mt-0.5 uppercase tracking-widest">SMTP Diagnostics</p>
        </div>

        {/* Nav boxes */}
        <nav className="px-3 py-2 space-y-1">
          {navItems.map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                view === v
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              )}>
              {icon}{label}
              {v === 'log' && logs.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">{logs.length}</span>
              )}
              {v === 'history' && sentHistory.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">{sentHistory.length}</span>
              )}
              {v === 'templates' && templates.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full">{templates.length}</span>
              )}
              {v === 'snippets' && snippets.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{snippets.reduce((n, g) => n + g.items.filter(i => i.value).length, 0)}</span>
              )}
              {v === 'servers' && profiles.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-zinc-500/30 text-zinc-400 px-1.5 py-0.5 rounded-full">{profiles.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-3 my-1 h-px bg-zinc-800" />

        {/* Server list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Servers</span>
            <button onClick={addProfile}
              className="text-[11px] font-semibold text-zinc-300 hover:text-emerald-400 transition-colors flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-1">
            {profiles.map(p => {
              const r = testResults[p.id]
              const dotColor = p.id in testStatus
                ? (testStatus[p.id] ? 'bg-emerald-400' : 'bg-red-400')
                : 'bg-zinc-600'
              const isEditing = editingId === p.id && view === 'servers'
              return (
                <div key={p.id}
                  onClick={() => { setEditingId(p.id); setView('servers') }}
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2.5 rounded-xl cursor-pointer transition-colors group',
                    isEditing ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
                  <span className="font-medium flex-1 truncate text-[13px]">{p.name}</span>
                  <button onClick={e => { e.stopPropagation(); deleteProfile(p.id) }}
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-zinc-600 hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex overflow-hidden min-w-0 bg-background rounded-2xl border border-border">

        {/* Center content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {view === 'servers'   ? (editingProfile?.name ?? 'Servers')
                : view === 'compose'   ? 'Compose Email'
                : view === 'snippets'  ? 'Snippets'
                : view === 'templates' ? 'Templates'
                : view === 'history'   ? 'Sent History'
                : 'Activity Log'}
            </span>
            {view === 'history' && sentHistory.length > 0 && (
              <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200 px-1.5 py-0.5 rounded-full">{sentHistory.length}</span>
            )}
            {view === 'templates' && templates.length > 0 && (
              <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200 px-1.5 py-0.5 rounded-full">{templates.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Right panel toggle icons — servers & compose */}
            {(view === 'servers' || view === 'compose') && (
              <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                <button onClick={() => setRightPanelTab(t => t === 'snippets' ? null : 'snippets')}
                  title="Snippets"
                  className={cn('p-1.5 rounded-lg transition-colors',
                    rightPanelTab === 'snippets' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
                  <NotebookPen className="w-3.5 h-3.5" />
                </button>
                {view === 'compose' && (
                  <button onClick={() => setRightPanelTab(t => t === 'templates' ? null : 'templates')}
                    title="Templates"
                    className={cn('p-1.5 rounded-lg transition-colors',
                      rightPanelTab === 'templates' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {view === 'compose' && (
              <>
                <SaveTemplateButton onSave={saveAsTemplate} />
                <Button size="sm" onClick={doSend}
                  disabled={sendLoading || !email.from || !email.to.some(s => s.trim())}>
                  {sendLoading
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                    : <><Send className="w-3.5 h-3.5 mr-1.5" />Send Email</>}
                </Button>
              </>
            )}
            {view === 'history' && sentHistory.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearHistory}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
              </Button>
            )}
            {view === 'log' && logs.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setLogs([])}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">

            {/* ── Servers ── */}
            {view === 'servers' && editingProfile && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{editingProfile.name}</span>
                  </div>
                  {activeId !== editingProfile.id && testResults[editingProfile.id]?.success && (
                    <Button variant="ghost" size="sm" className="text-xs h-7"
                      onClick={() => setActiveId(editingProfile.id)}>
                      Set as active →
                    </Button>
                  )}
                </div>
                <div className="p-5">
                  <ServerForm
                    profile={editingProfile}
                    onChange={updateProfile}
                    onTest={() => testProfile(editingProfile)}
                    onSave={() => saveProfile(editingProfile)}
                    loading={testLoading === editingProfile.id}
                    result={testResults[editingProfile.id] ?? null}
                    historyMap={autoHistory}
                  />
                </div>
              </div>
            )}

            {/* ── Compose ── */}
            {view === 'compose' && <>

              {/* Server picker */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Send via</span>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {profiles.filter(p => testStatus[p.id] === true).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">No tested servers yet — go to Servers and run a connection test.</p>
                  ) : profiles.filter(p => testStatus[p.id] === true).map(p => {
                    const isSel = sendProfileId === p.id
                    return (
                      <button key={p.id} onClick={() => setSendProfileId(p.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors',
                          isSel
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                        )}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className={isSel ? 'text-emerald-800 font-medium' : 'text-zinc-500'}>
                          {p.name}
                        </span>
                        <span className={cn('text-[10px] font-semibold px-1 py-0.5 rounded',
                          isSel ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400')}>
                          {p.port}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Recipients */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Recipients</span>
                </div>
                {/* From row */}
                <div className="grid grid-cols-3 gap-0 border-b border-border">
                  {[
                    { label: 'Name',     field: 'email_from_name', val: email.fromName, key: 'fromName', ph: 'Sender name' },
                    { label: 'From',     field: 'email_from',      val: email.from,     key: 'from',     ph: 'sender@example.com' },
                    { label: 'Reply-To', field: 'email_reply_to',  val: email.replyTo,  key: 'replyTo',  ph: 'replies@example.com' },
                  ].map(({ label, val, key, ph }, ci) => (
                    <div key={key} className={cn('flex items-center gap-3 px-4 py-2.5', ci < 2 && 'border-r border-border')}>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-14 shrink-0">{label}</span>
                      <input
                        value={val} onChange={e => updE(key as keyof EmailReq, e.target.value)}
                        placeholder={ph}
                        className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
                {/* To / Cc / Bcc stacked rows */}
                {(['to','cc','bcc'] as const).map((field) => {
                  const vals = email[field]
                  const labels: Record<string,string> = { to: 'To', cc: 'Cc', bcc: 'Bcc' }
                  const phs:    Record<string,string> = { to: 'Add recipient…', cc: 'Add CC…', bcc: 'Add BCC…' }
                  const isLast = field === 'bcc'
                  return (
                    <div key={field} className={cn('flex items-start gap-3 px-4 py-2.5 min-h-[42px]', !isLast && 'border-b border-border')}>
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider w-7 shrink-0 mt-2',
                        field === 'to' ? 'text-primary' : 'text-muted-foreground'
                      )}>{labels[field]}</span>
                      {/* Chips + inline input */}
                      <div className="flex flex-wrap gap-1.5 flex-1 items-center pt-1">
                        {vals.filter(v => v.trim()).map((v, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-md px-2 py-0.5 text-xs font-medium">
                            {v}
                            <button onClick={() => delA(field, i)} className="text-zinc-400 hover:text-zinc-600 ml-0.5 leading-none">×</button>
                          </span>
                        ))}
                        <input
                          className="text-sm outline-none bg-transparent placeholder:text-muted-foreground flex-1 min-w-[120px] py-0.5"
                          placeholder={vals.filter(v => v.trim()).length === 0 ? phs[field] : ''}
                          onKeyDown={e => {
                            if ((e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') && (e.target as HTMLInputElement).value.trim()) {
                              e.preventDefault()
                              const v = (e.target as HTMLInputElement).value.trim().replace(/[,;]$/, '')
                              if (v) { appendA(field, v); (e.target as HTMLInputElement).value = '' }
                            } else if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value && vals.filter(v => v.trim()).length > 0) {
                              delA(field, vals.filter(v => v.trim()).length - 1)
                            }
                          }}
                          onBlur={e => {
                            const v = e.target.value.trim()
                            if (v) { appendA(field, v); e.target.value = '' }
                          }}
                          onPaste={e => {
                            e.preventDefault()
                            const text = e.clipboardData.getData('text')
                            pasteA(field, vals.length, text)
                          }}
                        />
                      </div>
                      {/* nothing on To row right side */}
                      {field === 'to' && <div />}
                    </div>
                  )
                })}
              </div>

              {/* Message */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Message</span>
                </div>
                <div className="p-5 space-y-4">
                  <FieldRow label="Subject">
                    <AutoInput value={email.subject} onChange={v => updE('subject', v)} placeholder="Test from MailProbe" historyItems={autoHistory['email_subject']} />
                  </FieldRow>
                  <Tabs value={bodyTab} onValueChange={v => setBodyTab(v as 'plain'|'html')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="plain" className="text-xs">Plain Text</TabsTrigger>
                      <TabsTrigger value="html"  className="text-xs">HTML</TabsTrigger>
                    </TabsList>
                    <TabsContent value="plain" className="mt-3">
                      <Textarea rows={7} value={email.body}
                        onChange={e => updE('body', e.target.value)}
                        placeholder="Your message…" className="resize-y min-h-28" />
                    </TabsContent>
                    <TabsContent value="html" className="mt-3 space-y-2">
                      <HtmlEditor value={email.html} onChange={v => updE('html', v)} />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Attachments */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Attachments</span>
                    {email.attachments.length > 0 && (
                      <span className="text-xs text-muted-foreground">{email.attachments.length} file{email.attachments.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="border-dashed" onClick={pickFiles}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Files
                  </Button>
                </div>
                <div className="p-4">
                  {email.attachments.length === 0 ? (
                    <button onClick={pickFiles}
                      className="w-full py-8 rounded-md border-2 border-dashed border-border text-muted-foreground text-sm font-medium flex flex-col items-center gap-2 hover:border-primary/50 hover:text-foreground transition-colors">
                      <Paperclip className="w-6 h-6" />
                      Click to attach files
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {email.attachments.map((path, i) => {
                        const name = path.split('/').pop() || path
                        const ext  = name.split('.').pop()?.toUpperCase() || 'FILE'
                        return (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-secondary/30">
                            <Badge variant="outline" className="text-[10px] shrink-0">{ext}</Badge>
                            <span className="text-sm flex-1 truncate">{name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setEmail(p => ({ ...p, attachments: p.attachments.filter((_, j) => j !== i) }))}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {sendResult && <ResultPane r={sendResult} label="Send" />}
            </>}

            {/* ── Snippets ── */}
            {view === 'snippets' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{snippets.length} group{snippets.length !== 1 ? 's' : ''}</p>
                  <Button size="sm" onClick={addGroup}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> New Group
                  </Button>
                </div>
                {snippets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
                    <NotebookPen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No groups yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Click "New Group" to create one</p>
                  </div>
                ) : (
                  <div className="relative w-full" style={{ height: '600px' }}>
                    {snippets.map((g, gi) => (
                      <DraggableCard key={g.id} g={g} gi={gi}
                        copiedId={copiedId}
                        onUpdate={updateGroup}
                        onDelete={deleteGroup}
                        onCopy={copyItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Send History ── */}
            {view === 'history' && (
              <div className="space-y-3">
                {sentHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
                    <History className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No sent emails yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Successful sends will appear here</p>
                  </div>
                ) : sentHistory.map(sent => (
                  <div key={sent.id} className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{sent.email.subject || '(no subject)'}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            To: {sent.email.to.filter(Boolean).join(', ')} · via {sent.server}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(sent.sentAt).toLocaleString()}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => resendEmail(sent)}>
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Re-send
                        </Button>
                      </div>
                    </div>
                    <div className="px-4 py-2.5 flex gap-6 text-xs text-muted-foreground flex-wrap">
                      {sent.email.fromName && <span><span className="font-medium text-foreground">From:</span> {sent.email.fromName} &lt;{sent.email.from}&gt;</span>}
                      {!sent.email.fromName && sent.email.from && <span><span className="font-medium text-foreground">From:</span> {sent.email.from}</span>}
                      {sent.email.cc.some(Boolean) && <span><span className="font-medium text-foreground">CC:</span> {sent.email.cc.filter(Boolean).join(', ')}</span>}
                      {sent.email.html && <span className="text-violet-500 font-medium">HTML</span>}
                      {sent.email.body && <span className="text-blue-500 font-medium">Plain</span>}
                      {sent.email.attachments.length > 0 && <span className="text-amber-500 font-medium">{sent.email.attachments.length} attachment{sent.email.attachments.length !== 1 ? 's' : ''}</span>}
                      <span className="text-emerald-600 font-medium">{sent.result.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Templates ── */}
            {view === 'templates' && (
              <div>
                {templates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No templates yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">In Compose, click "Save as Template" to save one</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 items-start">
                    {templates.map((tmpl, ti) => {
                      const colors = [
                        'from-emerald-400 to-teal-500',
                        'from-violet-400 to-purple-500',
                        'from-blue-400 to-cyan-500',
                        'from-amber-400 to-orange-500',
                        'from-rose-400 to-pink-500',
                        'from-indigo-400 to-blue-500',
                      ]
                      const grad = colors[ti % colors.length]
                      const hasHTML = !!tmpl.email.html.trim()
                      const hasPlain = !!tmpl.email.body.trim()
                      const toList = tmpl.email.to.filter(Boolean)
                      return (
                        <div key={tmpl.id}
                          className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm group hover:shadow-md transition-shadow animate-fade-up"
                          style={{ animationDelay: `${ti * 40}ms`, animationFillMode: 'both' }}>
                          {/* Gradient header */}
                          <div className={`bg-gradient-to-r ${grad} px-4 pt-4 pb-8 relative`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="text-white font-bold text-sm leading-tight truncate drop-shadow">
                                  {tmpl.name}
                                </p>
                                <p className="text-white/70 text-xs mt-0.5 truncate">
                                  {tmpl.email.subject || '(no subject)'}
                                </p>
                              </div>
                              <span className="text-white/60 text-[10px] shrink-0">
                                {new Date(tmpl.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {/* Floating badges */}
                            <div className="absolute bottom-2 left-4 flex gap-1.5">
                              {hasHTML && <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">HTML</span>}
                              {hasPlain && <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">Plain</span>}
                              {tmpl.email.attachments.length > 0 && <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">📎 {tmpl.email.attachments.length}</span>}
                            </div>
                          </div>

                          {/* Preview — click to expand */}
                          <div className="relative -mt-4 cursor-zoom-in" onClick={() => setPreviewTemplate(tmpl)}>
                            <div className="mx-3 rounded-xl bg-white border border-border overflow-hidden shadow-sm" style={{ minHeight: 80 }}>
                              {hasHTML ? (
                                <div className="relative overflow-hidden" style={{ height: 120 }}>
                                  <iframe
                                    srcDoc={`<style>*{margin:0;padding:0;box-sizing:border-box;}body{transform:scale(0.6);transform-origin:top left;width:166%;overflow:hidden;}</style>` + tmpl.email.html}
                                    sandbox="allow-same-origin"
                                    scrolling="no"
                                    className="w-full border-0 pointer-events-none"
                                    style={{ height: 200, display: 'block' }}
                                  />
                                  <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/20 to-transparent">
                                    <span className="text-[10px] font-semibold text-white bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">Click to preview</span>
                                  </div>
                                </div>
                              ) : hasPlain ? (
                                <p className="px-3 py-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-4 font-mono">
                                  {tmpl.email.body}
                                </p>
                              ) : (
                                <div className="flex items-center justify-center h-20">
                                  <p className="text-xs text-muted-foreground/40">No body</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="px-4 pt-3 pb-3">
                            {toList.length > 0 && (
                              <p className="text-[11px] text-muted-foreground truncate mb-2">
                                <span className="font-medium">To:</span> {toList.join(', ')}
                              </p>
                            )}
                            {tmpl.email.from && (
                              <p className="text-[11px] text-muted-foreground truncate mb-2">
                                <span className="font-medium">From:</span> {tmpl.email.fromName ? `${tmpl.email.fromName} <${tmpl.email.from}>` : tmpl.email.from}
                              </p>
                            )}
                            {/* Actions — always visible */}
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" className="flex-1" onClick={() => loadTemplate(tmpl)}>
                                <Mail className="w-3.5 h-3.5 mr-1.5" /> Use Template
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => deleteTemplate(tmpl.id)}
                                className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/60 hover:bg-destructive/5">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Log ── */}
            {view === 'log' && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Activity Log</span>
                  <span className="text-xs text-muted-foreground">{logs.length} events</span>
                </div>
                {logs.length === 0
                  ? <p className="text-center text-muted-foreground text-sm py-16">No activity yet.</p>
                  : logs.map((l, i) => (
                    <div key={i} className="flex gap-3 px-5 py-2.5 border-b border-border/50 font-mono text-xs last:border-0">
                      <span className="text-muted-foreground/60 shrink-0">{l.time}</span>
                      {l.ok
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-px" />
                        : <XCircle     className="w-3.5 h-3.5 text-destructive shrink-0 mt-px" />}
                      <span className={cn('break-all', l.ok ? 'text-green-400' : 'text-red-400')}>{l.msg}</span>
                    </div>
                  ))
                }
              </div>
            )}

          </div>
        </ScrollArea>
        </div>{/* end center content */}

        {/* Right panel — snippets & templates, toggled from topbar */}
        {(view === 'servers' || view === 'compose') && (
          <RightPanel
            snippets={snippets} copiedId={copiedId} onCopy={copyItem}
            templates={templates} onLoad={t => { loadTemplate(t); setRightPanelTab(null) }}
            tab={rightPanelTab}
            onTabChange={setRightPanelTab}
          />
        )}

      </div>

      {/* ── Template Preview Modal ── */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
            style={{ width: '680px', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div>
                <p className="font-semibold text-sm">{previewTemplate.name}</p>
                <p className="text-xs text-muted-foreground">{previewTemplate.email.subject || '(no subject)'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { loadTemplate(previewTemplate); setPreviewTemplate(null) }}>
                  <Mail className="w-3.5 h-3.5 mr-1.5" /> Use Template
                </Button>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Scrollable preview */}
            <div className="flex-1 overflow-y-auto bg-zinc-50">
              {previewTemplate.email.html ? (
                <iframe
                  srcDoc={previewTemplate.email.html}
                  sandbox="allow-same-origin"
                  className="w-full border-0"
                  style={{ minHeight: '500px', display: 'block' }}
                  onLoad={e => {
                    try {
                      const f = e.currentTarget
                      f.style.height = f.contentDocument!.body.scrollHeight + 40 + 'px'
                    } catch {}
                  }}
                />
              ) : (
                <pre className="p-5 text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                  {previewTemplate.email.body}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
