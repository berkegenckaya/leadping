-- ─────────────────────────────────────────────────────────────────────────────
-- 001_rls.sql
-- Row Level Security politikaları
--
-- Erişim mantığı:
--   authenticated kullanıcı → profiles.supabase_auth_id = auth.uid()
--   → profiles.tenant_id → yalnızca aynı tenant'a ait satırlar
--
-- service_role Supabase tarafından RLS'yi otomatik bypass eder;
-- ayrıca policy tanımlamak gerekmez.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── RLS Aktifleştir ─────────────────────────────────────────────────────────

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- ─── Yardımcı Fonksiyon ───────────────────────────────────────────────────────
-- auth.uid() üzerinden mevcut kullanıcının tenant_id'sini döner.
-- SECURITY DEFINER: fonksiyon profiles'a yüksek yetkiyle erişir,
-- çağıran kullanıcının RLS'si burada devreye girmez.

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM   profiles
  WHERE  supabase_auth_id = auth.uid()::text
  LIMIT  1;
$$;


-- ─── profiles ─────────────────────────────────────────────────────────────────
-- Kullanıcı yalnızca kendi profilini görebilir.

CREATE POLICY "profiles: kendi profilini gör"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (supabase_auth_id = auth.uid()::text);


-- ─── widgets ──────────────────────────────────────────────────────────────────

CREATE POLICY "widgets: tenant erişimi (select)"
  ON widgets
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "widgets: tenant erişimi (insert)"
  ON widgets
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "widgets: tenant erişimi (update)"
  ON widgets
  FOR UPDATE
  TO authenticated
  USING     (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "widgets: tenant erişimi (delete)"
  ON widgets
  FOR DELETE
  TO authenticated
  USING (tenant_id = auth_tenant_id());


-- ─── leads ────────────────────────────────────────────────────────────────────

CREATE POLICY "leads: tenant erişimi (select)"
  ON leads
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "leads: tenant erişimi (insert)"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "leads: tenant erişimi (update)"
  ON leads
  FOR UPDATE
  TO authenticated
  USING     (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "leads: tenant erişimi (delete)"
  ON leads
  FOR DELETE
  TO authenticated
  USING (tenant_id = auth_tenant_id());


-- ─── conversations ────────────────────────────────────────────────────────────
-- Direkt tenant_id yok; leads üzerinden kontrol edilir.

CREATE POLICY "conversations: tenant erişimi (select)"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = conversations.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY "conversations: tenant erişimi (insert)"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = conversations.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY "conversations: tenant erişimi (update)"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = conversations.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = conversations.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY "conversations: tenant erişimi (delete)"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = conversations.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  );


-- ─── notifications ────────────────────────────────────────────────────────────
-- Direkt tenant_id yok; leads üzerinden kontrol edilir.

CREATE POLICY "notifications: tenant erişimi (select)"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = notifications.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY "notifications: tenant erişimi (insert)"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = notifications.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY "notifications: tenant erişimi (update)"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = notifications.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = notifications.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY "notifications: tenant erişimi (delete)"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE  leads.id        = notifications.lead_id
        AND  leads.tenant_id = auth_tenant_id()
    )
  );
