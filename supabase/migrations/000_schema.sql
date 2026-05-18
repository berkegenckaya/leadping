-- ─────────────────────────────────────────────────────────────────────────────
-- 000_schema.sql
-- Tablo ve enum tanımları — Prisma schema.prisma ile birebir eşleşir.
-- Bu dosya 001_rls.sql'den önce çalışmalıdır.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "Sector" AS ENUM ('HUKUK', 'EMLAK', 'SIGORTA', 'SAGLIK');
CREATE TYPE "Plan"   AS ENUM ('FREE', 'PRO', 'AGENCY');
CREATE TYPE "Role"   AS ENUM ('ADMIN', 'MEMBER');

CREATE TYPE "LeadUrgency" AS ENUM ('LOW', 'MED', 'HIGH');
CREATE TYPE "LeadStatus"  AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'LOST');

CREATE TYPE "NotifType"   AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "NotifStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');


-- ─── tenants ─────────────────────────────────────────────────────────────────

CREATE TABLE tenants (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  sector     "Sector"    NOT NULL,
  plan       "Plan"      NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── profiles ────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_auth_id  TEXT        NOT NULL UNIQUE,
  role              "Role"      NOT NULL DEFAULT 'MEMBER',
  full_name         TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);


-- ─── widgets ─────────────────────────────────────────────────────────────────

CREATE TABLE widgets (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token           TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  name            TEXT        NOT NULL,
  sector          "Sector"    NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  primary_color   TEXT        NOT NULL DEFAULT '#000000',
  welcome_message TEXT        NOT NULL,
  system_prompt   TEXT        NOT NULL,
  allowed_domain  TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_widgets_tenant_id ON widgets(tenant_id);
CREATE INDEX idx_widgets_token     ON widgets(token);


-- ─── leads ───────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id          TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  widget_id   TEXT          NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  name        TEXT          NOT NULL,
  contact     TEXT          NOT NULL,
  summary     TEXT          NOT NULL,
  score       INTEGER       NOT NULL,
  urgency     "LeadUrgency" NOT NULL DEFAULT 'MED',
  status      "LeadStatus"  NOT NULL DEFAULT 'NEW',
  sector_data JSONB         NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_tenant_id  ON leads(tenant_id);
CREATE INDEX idx_leads_widget_id  ON leads(widget_id);
CREATE INDEX idx_leads_status     ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);


-- ─── conversations ───────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id          TEXT        NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  messages         JSONB       NOT NULL DEFAULT '[]',
  duration_seconds INTEGER     NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── notifications ───────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id      TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT          NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type    "NotifType"   NOT NULL,
  status  "NotifStatus" NOT NULL DEFAULT 'PENDING',
  sent_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_lead_id ON notifications(lead_id);
CREATE INDEX idx_notifications_status  ON notifications(status);


-- ─── updated_at otomatik güncelleme ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_widgets_updated_at
  BEFORE UPDATE ON widgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
