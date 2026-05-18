"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DEFAULT_PROMPTS } from "@/lib/admin/default-prompts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WidgetFormData {
  id?:            string;
  name:           string;
  sector:         string;
  allowedDomain:  string;
  systemPrompt:   string;
  skillsConfig:   Record<string, unknown>;
  maxTurns:       number;
  primaryColor:   string;
  welcomeMessage: string;
  logoUrl:        string;
  tenantId:       string;
}

interface Tenant { id: string; name: string }
interface ChatMessage { role: "user" | "assistant"; content: string }

interface SkillMeta {
  id:          string;
  name:        string;
  description: string;
  alwaysOn:    boolean;
}

const STEPS = ["Temel", "AI Prompt", "Skill'ler", "Görünüm", "Atama"];

const SECTOR_OPTIONS = [
  { value: "HUKUK",   label: "Hukuk",   emoji: "⚖️" },
  { value: "EMLAK",   label: "Emlak",   emoji: "🏠" },
  { value: "SIGORTA", label: "Sigorta", emoji: "🛡️" },
  { value: "SAGLIK",  label: "Sağlık",  emoji: "🏥" },
];

// ─── Widget Form ──────────────────────────────────────────────────────────────

export function WidgetForm({
  initial,
  tenants,
  skills,
}: {
  initial?: Partial<WidgetFormData>;
  tenants: Tenant[];
  skills: SkillMeta[];
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState<WidgetFormData>({
    name:           initial?.name           ?? "",
    sector:         initial?.sector         ?? "",
    allowedDomain:  initial?.allowedDomain  ?? "",
    systemPrompt:   initial?.systemPrompt   ?? "",
    skillsConfig:   initial?.skillsConfig   ?? {},
    maxTurns:       initial?.maxTurns       ?? 5,
    primaryColor:   initial?.primaryColor   ?? "#000000",
    welcomeMessage: initial?.welcomeMessage ?? "",
    logoUrl:        initial?.logoUrl        ?? "",
    tenantId:       initial?.tenantId       ?? "",
  });

  // Yasaklı konular (tag input)
  const [forbiddenTopics, setForbiddenTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput]           = useState("");

  // skill toggle helpers
  function isSkillEnabled(id: string): boolean {
    const cfg = form.skillsConfig[id] as Record<string, unknown> | undefined;
    return cfg?.["enabled"] === true;
  }

  function toggleSkill(id: string, enabled: boolean) {
    setForm((prev) => {
      const existing = (prev.skillsConfig[id] as Record<string, unknown>) ?? {};
      return {
        ...prev,
        skillsConfig: {
          ...prev.skillsConfig,
          [id]: { ...existing, enabled },
        },
      };
    });
  }

  function setSkillConfig(id: string, key: string, value: string) {
    setForm((prev) => {
      const existing = (prev.skillsConfig[id] as Record<string, unknown>) ?? {};
      return {
        ...prev,
        skillsConfig: {
          ...prev.skillsConfig,
          [id]: { ...existing, [key]: value },
        },
      };
    });
  }

  function getSkillConfigValue(id: string, key: string): string {
    const cfg = form.skillsConfig[id] as Record<string, unknown> | undefined;
    return (cfg?.[key] as string) ?? "";
  }

  // Soru akışı
  const [questions, setQuestions] = useState<string[]>([""]);

  // Test chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState("");
  const [chatLoading, setChatLoading]   = useState(false);

  function setField(key: keyof WidgetFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function loadDefaultPrompt() {
    const prompt = DEFAULT_PROMPTS[form.sector];
    if (prompt) setField("systemPrompt", prompt);
  }

  function addQuestion() {
    if (questions.length < 7) setQuestions((q) => [...q, ""]);
  }

  function setQuestion(i: number, v: string) {
    setQuestions((q) => q.map((x, idx) => (idx === i ? v : x)));
  }

  function removeQuestion(i: number) {
    setQuestions((q) => q.filter((_, idx) => idx !== i));
  }

  function moveQuestion(i: number, dir: -1 | 1) {
    setQuestions((q) => {
      const next = [...q];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      const tmp = next[i] as string;
    next[i]   = next[j] as string;
    next[j]   = tmp;
      return next;
    });
  }

  function addTopic() {
    const t = topicInput.trim();
    if (t && !forbiddenTopics.includes(t)) {
      setForbiddenTopics((prev) => [...prev, t]);
    }
    setTopicInput("");
  }

  function removeTopic(t: string) {
    setForbiddenTopics((prev) => prev.filter((x) => x !== t));
  }

  function buildFinalPrompt(): string {
    let prompt = form.systemPrompt;

    const validQuestions = questions.filter((q) => q.trim());
    if (validQuestions.length > 0) {
      prompt += "\n\nSORU AKIŞI:\n";
      validQuestions.forEach((q, i) => {
        prompt += `${i + 1}. ${q}\n`;
      });
    }

    if (forbiddenTopics.length > 0) {
      prompt += "\n\nYASAKLI KONULAR — Bu konulardan kesinlikle bahsetme:\n";
      forbiddenTopics.forEach((t) => { prompt += `- ${t}\n`; });
    }

    return prompt;
  }

  async function sendTestMessage() {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/widget/chat/preview", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          systemPrompt: buildFinalPrompt(),
          skillsConfig: form.skillsConfig,
          messages:     newMessages,
        }),
      });
      const data = await res.json();
      if (data.text) {
        setChatMessages((m) => [...m, { role: "assistant", content: data.text }]);
      }
    } finally {
      setChatLoading(false);
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    const payload = {
      ...form,
      systemPrompt: buildFinalPrompt(),
      skillsConfig: form.skillsConfig,
      maxTurns:     form.maxTurns,
      logoUrl:      form.logoUrl || undefined,
      tenantId:     form.tenantId || undefined,
    };

    try {
      const url    = isEdit ? `/api/admin/widgets/${initial!.id}` : "/api/admin/widgets";
      const method = isEdit ? "PATCH" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Bir hata oluştu.");
        return;
      }

      router.push("/admin/widgets");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // ─── Step 1: Temel ──────────────────────────────────────────────────────────

  const step1 = (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label className="text-[12px]">Widget Adı</Label>
        <Input
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Örn: Hukuk Bürosu Ön Görüşme"
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px]">Sektör</Label>
        <div className="grid grid-cols-2 gap-2">
          {SECTOR_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setField("sector", s.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                form.sector === s.value
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              <span className="text-lg">{s.emoji}</span>
              <span className="text-[13px] font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px]">İzin Verilen Domain</Label>
        <Input
          value={form.allowedDomain}
          onChange={(e) => setField("allowedDomain", e.target.value)}
          placeholder="Örn: hukukburosu.com"
          className="h-9 text-sm"
        />
        <p className="text-[11px] text-zinc-400">
          Widget yalnızca bu domain üzerinden çalışır.
        </p>
      </div>
    </div>
  );

  // ─── Step 2: AI Prompt ──────────────────────────────────────────────────────

  const step2 = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Sol: Prompt editörü */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[12px]">System Prompt</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={loadDefaultPrompt}
              disabled={!form.sector}
            >
              Sektör Promptu Yükle
            </Button>
          </div>
          <Textarea
            value={form.systemPrompt}
            onChange={(e) => setField("systemPrompt", e.target.value)}
            placeholder="AI asistanının nasıl davranacağını tanımlayın..."
            className="min-h-[200px] text-[13px] font-mono resize-y"
          />
          <p className="text-[11px] text-zinc-400 text-right">
            {form.systemPrompt.length} karakter
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[12px]">
              Soru Akışı ({questions.length}/7)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              onClick={addQuestion}
              disabled={questions.length >= 7}
            >
              + Soru Ekle
            </Button>
          </div>
          <div className="space-y-1.5">
            {questions.map((q, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 w-4 shrink-0">{i + 1}.</span>
                <Input
                  value={q}
                  onChange={(e) => setQuestion(i, e.target.value)}
                  placeholder={`Soru ${i + 1}`}
                  className="h-8 text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => moveQuestion(i, -1)}
                  disabled={i === 0}
                  className="text-zinc-300 hover:text-zinc-600 disabled:opacity-30 text-[13px] px-0.5"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(i, 1)}
                  disabled={i === questions.length - 1}
                  className="text-zinc-300 hover:text-zinc-600 disabled:opacity-30 text-[13px] px-0.5"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  disabled={questions.length === 1}
                  className="text-zinc-300 hover:text-red-500 disabled:opacity-30 text-[13px] px-0.5"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Max Turns */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[12px]">Maks. Görüşme Turu</Label>
            <span className="text-[12px] font-medium text-zinc-900">
              {form.maxTurns}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={form.maxTurns}
            onChange={(e) => setForm((p) => ({ ...p, maxTurns: Number(e.target.value) }))}
            className="w-full h-1.5 cursor-pointer accent-zinc-900"
          />
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>1</span><span>10</span>
          </div>
        </div>

        {/* Yasaklı Konular */}
        <div className="space-y-2">
          <Label className="text-[12px]">Yasaklı Konular</Label>
          <div className="flex gap-1.5">
            <Input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addTopic(); }
              }}
              placeholder="Konu ekle, Enter'a bas"
              className="h-8 text-[12px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[12px] shrink-0"
              onClick={addTopic}
              disabled={!topicInput.trim()}
            >
              Ekle
            </Button>
          </div>
          {forbiddenTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {forbiddenTopics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-700"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTopic(t)}
                    className="text-zinc-400 hover:text-zinc-700 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sağ: Test Chat */}
      <div className="flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="border-b border-zinc-100 px-4 py-2.5">
          <p className="text-[12px] font-medium text-zinc-700">Canlı Test</p>
          <p className="text-[11px] text-zinc-400">Mevcut prompt ile sohbet et</p>
        </div>

        <div className="flex-1 min-h-[280px] max-h-[400px] overflow-y-auto space-y-3 p-4">
          {chatMessages.length === 0 && (
            <p className="text-[12px] text-zinc-400 text-center mt-8">
              Bir mesaj göndererek promptu test et.
            </p>
          )}
          {chatMessages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-zinc-100 px-3 py-2">
                <span className="text-[12px] text-zinc-400">Yanıt yazılıyor...</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-100 p-3 flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTestMessage(); } }}
            placeholder="Mesaj yaz..."
            className="h-8 text-[12px]"
            disabled={chatLoading || !form.systemPrompt}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 text-[12px] shrink-0"
            onClick={sendTestMessage}
            disabled={chatLoading || !chatInput.trim() || !form.systemPrompt}
          >
            Gönder
          </Button>
        </div>
      </div>
    </div>
  );

  // ─── Step 3: Skill'ler ──────────────────────────────────────────────────────

  const step3 = (
    <div className="space-y-3 max-w-lg">
      {skills.map((skill) => (
        <div
          key={skill.id}
          className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-zinc-900">{skill.name}</p>
              <p className="text-[11px] text-zinc-500">{skill.description}</p>
            </div>
            {skill.alwaysOn ? (
              <Badge className="mt-0.5 shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                Her zaman aktif
              </Badge>
            ) : (
              <Switch
                checked={isSkillEnabled(skill.id)}
                onCheckedChange={(v) => toggleSkill(skill.id, v)}
              />
            )}
          </div>

          {/* Calendly URL input */}
          {skill.id === "calendly" && isSkillEnabled("calendly") && (
            <Input
              value={getSkillConfigValue("calendly", "url")}
              onChange={(e) => setSkillConfig("calendly", "url", e.target.value)}
              placeholder="https://calendly.com/kullanici/30min"
              className="h-8 text-[12px]"
            />
          )}
        </div>
      ))}
    </div>
  );

  // ─── Step 4: Görünüm ────────────────────────────────────────────────────────

  const stepGorunum = (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label className="text-[12px]">Ana Renk</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={form.primaryColor}
            onChange={(e) => setField("primaryColor", e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-zinc-200 p-1"
          />
          <Input
            value={form.primaryColor}
            onChange={(e) => setField("primaryColor", e.target.value)}
            placeholder="#000000"
            className="h-9 font-mono text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px]">Karşılama Mesajı</Label>
        <Input
          value={form.welcomeMessage}
          onChange={(e) => setField("welcomeMessage", e.target.value)}
          placeholder="Merhaba! Size nasıl yardımcı olabiliriz?"
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px]">Logo URL</Label>
        <Input
          value={form.logoUrl}
          onChange={(e) => setField("logoUrl", e.target.value)}
          placeholder="https://sirket.com/logo.png"
          className="h-9 text-sm"
        />
        <p className="text-[11px] text-zinc-400">
          Müşteri sonradan değiştirebilir.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-[11px] text-zinc-400 mb-3">Önizleme</p>
        <div className="flex items-start gap-2">
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoUrl}
              alt="logo"
              className="h-8 w-8 shrink-0 rounded-full object-cover border border-zinc-200"
            />
          ) : (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-bold"
              style={{ backgroundColor: form.primaryColor || "#000" }}
            >
              AI
            </div>
          )}
          <div className="rounded-lg bg-white border border-zinc-200 px-3 py-2 text-[12px] text-zinc-700 shadow-sm">
            {form.welcomeMessage || "Karşılama mesajı..."}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Step 5: Atama ──────────────────────────────────────────────────────────

  const stepAtama = (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label className="text-[12px]">Müşteri Seç</Label>
        <Select value={form.tenantId} onValueChange={(v) => setField("tenantId", v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Müşteri seçin..." />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-zinc-400">
          Seçmeden kaydedebilirsiniz — widget sonradan atanabilir.
        </p>
      </div>

      <div className={`rounded-lg border px-4 py-3 ${
        form.tenantId
          ? "border-emerald-200 bg-emerald-50"
          : "border-zinc-200 bg-zinc-50"
      }`}>
        <p className={`text-[12px] ${form.tenantId ? "text-emerald-700" : "text-zinc-500"}`}>
          {form.tenantId
            ? `✓ Widget "${tenants.find((t) => t.id === form.tenantId)?.name}" müşterisine atanacak.`
            : "Widget atasız olarak kaydedilecek. Müşteriler sayfasından sonradan atayabilirsiniz."}
        </p>
      </div>

      {/* Özet */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-1.5">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Özet
        </p>
        <SummaryRow label="Ad"     value={form.name || "—"} />
        <SummaryRow label="Sektör" value={form.sector || "—"} />
        <SummaryRow label="Domain" value={form.allowedDomain || "—"} />
        <SummaryRow label="Renk"   value={form.primaryColor} />
      </div>
    </div>
  );

  const STEP_CONTENT = [step1, step2, step3, stepGorunum, stepAtama];

  const canNext =
    step === 0
      ? form.name && form.sector && form.allowedDomain
      : step === 1
      ? form.systemPrompt.length > 0
      : true; // Steps 2-4: always allow advancing; Step 5: save without tenant

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] transition-colors ${
                i === step
                  ? "bg-zinc-900 text-white font-medium"
                  : i < step
                  ? "text-zinc-500 hover:text-zinc-900 cursor-pointer"
                  : "text-zinc-300 cursor-default"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  i === step
                    ? "bg-white text-zinc-900"
                    : i < step
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <span className="mx-1 text-zinc-200">›</span>
            )}
          </div>
        ))}
      </div>

      {/* İçerik */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        {STEP_CONTENT[step]}
      </div>

      {/* Navigasyon */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-[12px]"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          ← Geri
        </Button>

        <div className="flex items-center gap-3">
          {error && <p className="text-[12px] text-red-500">{error}</p>}

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              size="sm"
              className="h-8 text-[12px]"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
            >
              İleri →
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-8 text-[12px]"
              onClick={handleSave}
              disabled={saving || !canNext}
            >
              {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Widget Oluştur"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[11px] text-zinc-400">{label}</span>
      <span className="text-[12px] text-zinc-700">{value}</span>
    </div>
  );
}
