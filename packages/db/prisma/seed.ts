import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name:     "Demo Ajans",
        slug:     "demo-ajans",
        sector:   "EMLAK",
        plan:     "PRO",
        isActive: true,
      },
    });
    console.log(`✓  Tenant oluşturuldu: ${tenant.name} (${tenant.id})`);
  } else {
    console.log(`✓  Tenant: ${tenant.name} (${tenant.id})`);
  }

  // ─── Temizlik ────────────────────────────────────────────────────────────────
  await prisma.conversation.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.lead.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.widget.deleteMany({ where: { tenantId: tenant.id } });

  // ─── Widget'lar ───────────────────────────────────────────────────────────────
  const [wHukuk, wEmlak, wSigorta] = await Promise.all([
    prisma.widget.create({
      data: {
        tenantId:       tenant.id,
        name:           "Hukuk Danışma",
        sector:         "HUKUK",
        isActive:       true,
        primaryColor:   "#18181b",
        welcomeMessage: "Hukuki sorununuzu kısaca anlatın, sizi yönlendirelim.",
        systemPrompt:   "Sen bir hukuk bürosunun ön görüşme asistanısın.",
        allowedDomain:  "hukukburo.com",
      },
    }),
    prisma.widget.create({
      data: {
        tenantId:       tenant.id,
        name:           "Emlak Danışma",
        sector:         "EMLAK",
        isActive:       true,
        primaryColor:   "#18181b",
        welcomeMessage: "Mülk alım/satım ihtiyacınızı paylaşın.",
        systemPrompt:   "Sen bir emlak ofisinin ön görüşme asistanısın.",
        allowedDomain:  "emlakofis.com",
      },
    }),
    prisma.widget.create({
      data: {
        tenantId:       tenant.id,
        name:           "Sigorta Danışma",
        sector:         "SIGORTA",
        isActive:       false,
        primaryColor:   "#18181b",
        welcomeMessage: "Sigorta ihtiyacınızı belirtin.",
        systemPrompt:   "Sen bir sigorta acentesinin ön görüşme asistanısın.",
        allowedDomain:  "sigortacentem.com",
      },
    }),
  ]);
  console.log("✓  3 widget oluşturuldu");

  // ─── Lead'ler + Görüşmeler ────────────────────────────────────────────────────
  const leadsData: Parameters<typeof prisma.lead.create>[0]["data"][] = [
    {
      tenantId: tenant.id, widgetId: wHukuk.id,
      name: "Ahmet Yılmaz", contact: "ahmet@email.com",
      summary: "Müvekkil boşanma davası açmak istiyor. Anlaşmalı boşanma şartları ve nafaka konusunda bilgi almak üzere başvurdu. Çocuk velayeti için endişeli görünüyor.",
      score: 8, urgency: "HIGH", status: "NEW",
      sectorData: { davaType: "Anlaşmalı Boşanma" },
    },
    {
      tenantId: tenant.id, widgetId: wHukuk.id,
      name: "Fatma Kaya", contact: "0532 111 2233",
      summary: "İş kazası sonrası tazminat talebi. İşveren kusurlu olduğunu düşünüyor. Yaklaşık 3 aydır çalışamamaktadır.",
      score: 9, urgency: "HIGH", status: "CONTACTED",
      sectorData: { davaType: "İş Kazası Tazminatı" },
    },
    {
      tenantId: tenant.id, widgetId: wHukuk.id,
      name: "Mehmet Demir", contact: "mehmet.demir@sirket.com",
      summary: "Kira sözleşmesi ihlali nedeniyle kiracısını tahliye ettirmek istiyor. Kira bedelini 4 aydır ödemeyen kiracıyla sorun yaşıyor.",
      score: 6, urgency: "MED", status: "CONVERTED",
      sectorData: { davaType: "Tahliye Davası" },
    },
    {
      tenantId: tenant.id, widgetId: wHukuk.id,
      name: "Ayşe Şahin", contact: "ayse.sahin@gmail.com",
      summary: "Miras paylaşımı konusunda danışmak istiyor. Kardeşleriyle anlaşmazlık var. Dava açılıp açılmayacağından emin değil.",
      score: 5, urgency: "LOW", status: "LOST",
      sectorData: { davaType: "Miras Hukuku" },
    },
    {
      tenantId: tenant.id, widgetId: wEmlak.id,
      name: "Burak Arslan", contact: "burak@arslan.com",
      summary: "İstanbul Kadıköy'de 2+1 daire arıyor. Bütçesi 3.5 milyon TL. Okula yakın, ulaşımı kolay bir lokasyon istiyor. Nakit ödeme yapabilir.",
      score: 9, urgency: "HIGH", status: "NEW",
      sectorData: { budget: "3.500.000 TL", location: "İstanbul / Kadıköy" },
    },
    {
      tenantId: tenant.id, widgetId: wEmlak.id,
      name: "Zeynep Öztürk", contact: "0542 333 4455",
      summary: "Ankara Çankaya'da satılık villa arıyor. Bahçeli, müstakil ev istiyor. Bütçesi 8 milyon TL. Önümüzdeki 3 ay içinde taşınmayı planlıyor.",
      score: 10, urgency: "HIGH", status: "CONTACTED",
      sectorData: { budget: "8.000.000 TL", location: "Ankara / Çankaya" },
    },
    {
      tenantId: tenant.id, widgetId: wEmlak.id,
      name: "Can Yıldız", contact: "can.yildiz@outlook.com",
      summary: "Kiralık ofis arıyor. 100-150 m² arası, merkezi konumda. Aylık 25.000 TL bütçesi var. Hemen tutmak istiyor.",
      score: 7, urgency: "MED", status: "NEW",
      sectorData: { budget: "25.000 TL/ay", location: "İstanbul / Levent" },
    },
    {
      tenantId: tenant.id, widgetId: wEmlak.id,
      name: "Selin Aktaş", contact: "selin@aktas.net",
      summary: "3+1 dairesini satmak istiyor. Beşiktaş'ta konumlu. Piyasa değeri araştırıyor, acele etmiyor.",
      score: 4, urgency: "LOW", status: "CONTACTED",
      sectorData: { budget: "Belirsiz", location: "İstanbul / Beşiktaş" },
    },
    {
      tenantId: tenant.id, widgetId: wSigorta.id,
      name: "Emre Çelik", contact: "emre.celik@gmail.com",
      summary: "Aracı için kasko ve trafik sigortası yaptırmak istiyor. 2022 model BMW 320i. Sıfır hasarlı. En kapsamlı paketi istiyor.",
      score: 8, urgency: "MED", status: "NEW",
      sectorData: { policyType: "Kasko + Trafik" },
    },
    {
      tenantId: tenant.id, widgetId: wSigorta.id,
      name: "Hande Koç", contact: "0555 666 7788",
      summary: "İşyeri yangın sigortası için fiyat almak istiyor. 200 m² tekstil mağazası. Aylık prim konusunda hassas.",
      score: 6, urgency: "LOW", status: "CONVERTED",
      sectorData: { policyType: "İşyeri Yangın" },
    },
  ];

  // Gerçekçi görüşme mesajları
  const conversationData: Record<number, { messages: object[]; durationSeconds: number }> = {
    0: {
      durationSeconds: 247,
      messages: [
        { role: "assistant", content: "Merhaba! Hukuk büromuza hoş geldiniz. Size nasıl yardımcı olabilirim?", timestamp: "2026-05-06T09:01:00.000Z" },
        { role: "user",      content: "Merhaba, boşanma davası açmak istiyorum. Ne yapmam gerekiyor?", timestamp: "2026-05-06T09:01:45.000Z" },
        { role: "assistant", content: "Anlıyorum. Öncelikle anlaşmalı mı yoksa çekişmeli boşanma mı düşündüğünüzü öğrenebilir miyim?", timestamp: "2026-05-06T09:02:10.000Z" },
        { role: "user",      content: "Anlaşmalı olmasını istiyorum ama çocuk velayeti konusunda sorun çıkabilir.", timestamp: "2026-05-06T09:03:00.000Z" },
        { role: "assistant", content: "Anlıyorum. Çocuk velayeti meselesinde anlaşmazlık varsa, anlaşmalı boşanma süreci biraz daha karmaşık hale gelebilir. Avukatımız sizi tüm süreç hakkında bilgilendirecektir. Sizi ne zaman arayalım?", timestamp: "2026-05-06T09:03:40.000Z" },
        { role: "user",      content: "Bu hafta içinde uygun olurum, öğleden sonraları tercih ederim.", timestamp: "2026-05-06T09:04:20.000Z" },
        { role: "assistant", content: "Harika! İletişim bilgilerinizi alabilir miyim?", timestamp: "2026-05-06T09:04:35.000Z" },
        { role: "user",      content: "ahmet@email.com veya 0533 111 2233", timestamp: "2026-05-06T09:05:00.000Z" },
      ],
    },
    1: {
      durationSeconds: 183,
      messages: [
        { role: "assistant", content: "Merhaba! Hukuk danışma hattına hoş geldiniz.", timestamp: "2026-05-05T14:20:00.000Z" },
        { role: "user",      content: "İş kazası geçirdim, tazminat alabilir miyim?", timestamp: "2026-05-05T14:20:30.000Z" },
        { role: "assistant", content: "Üzgünüm bunu duyduğuma. Kazanın nasıl gerçekleştiğini kısaca anlatır mısınız?", timestamp: "2026-05-05T14:21:00.000Z" },
        { role: "user",      content: "Fabrikada çalışırken makine arızası yüzünden sol koluma ciddi hasar geldi. 3 aydır çalışamıyorum.", timestamp: "2026-05-05T14:22:10.000Z" },
        { role: "assistant", content: "Bu çok ciddi bir durum. İş kazası kaynaklı tazminat talepleri için güçlü bir hukuki zemin mevcut. Avukatımız en kısa sürede sizinle iletişime geçecek. Telefon numaranızı alabilir miyim?", timestamp: "2026-05-05T14:22:55.000Z" },
        { role: "user",      content: "0532 111 2233", timestamp: "2026-05-05T14:23:15.000Z" },
      ],
    },
    4: {
      durationSeconds: 312,
      messages: [
        { role: "assistant", content: "Merhaba! Emlak danışmanlığına hoş geldiniz. Bugün size nasıl yardımcı olabilirim?", timestamp: "2026-05-04T11:00:00.000Z" },
        { role: "user",      content: "Kadıköy'de daire arıyorum, bütçem 3.5 milyon TL civarında.", timestamp: "2026-05-04T11:00:40.000Z" },
        { role: "assistant", content: "Harika bir bölge seçimi! Kaç odalı bir daire düşünüyorsunuz? Ve kat tercihiniz var mı?", timestamp: "2026-05-04T11:01:10.000Z" },
        { role: "user",      content: "2+1 yeterli, orta veya üst katlar olsun. Okula yakın olması önemli, 8 yaşında çocuğum var.", timestamp: "2026-05-04T11:02:00.000Z" },
        { role: "assistant", content: "Anlıyorum. Ayrıca ulaşım konusunda bir tercihiz var mı? Metro veya deniz ulaşımına yakın mı olsun?", timestamp: "2026-05-04T11:02:40.000Z" },
        { role: "user",      content: "Metro yakını olursa harika olur. Nakit ödeme yapabilirim, kredi kullanmayacağım.", timestamp: "2026-05-04T11:03:20.000Z" },
        { role: "assistant", content: "Mükemmel! Nakit alımda çok daha iyi fiyatlar elde edilebilir. Portföyümüzde Kadıköy Moda ve Fenerbahçe'de uygun seçenekler mevcut. Danışmanımız sizi arayarak detaylı bilgi versin mi?", timestamp: "2026-05-04T11:03:55.000Z" },
        { role: "user",      content: "Evet, lütfen. burak@arslan.com adresine de bilgi gönderebilirsiniz.", timestamp: "2026-05-04T11:04:30.000Z" },
      ],
    },
    5: {
      durationSeconds: 198,
      messages: [
        { role: "assistant", content: "Merhaba! Emlak danışmanlık hizmetimize hoş geldiniz.", timestamp: "2026-05-03T16:15:00.000Z" },
        { role: "user",      content: "Ankara Çankaya'da villa bakıyorum, müstakil bahçeli olsun.", timestamp: "2026-05-03T16:15:30.000Z" },
        { role: "assistant", content: "Çankaya gerçekten prestijli bir tercih! Bütçenizi ve kaç metrekare düşündüğünüzü öğrenebilir miyim?", timestamp: "2026-05-03T16:16:00.000Z" },
        { role: "user",      content: "8 milyon TL bütçem var, en az 300-400 m² olsun. 3 ay içinde taşınmam lazım.", timestamp: "2026-05-03T16:17:10.000Z" },
        { role: "assistant", content: "Bütçeniz ve zaman çizelgeniz için elimizdeki uygun villa seçeneklerini hemen aktarabiliriz. Bu konuda çok ciddi olduğunuz anlaşılıyor. Sizi yarın öğleden önce arayabilir miyiz?", timestamp: "2026-05-03T16:17:45.000Z" },
        { role: "user",      content: "Tabii, 0542 333 4455 numaramdan ulaşabilirsiniz.", timestamp: "2026-05-03T16:18:00.000Z" },
      ],
    },
    8: {
      durationSeconds: 156,
      messages: [
        { role: "assistant", content: "Merhaba! Sigorta danışmanlığına hoş geldiniz. Size nasıl yardımcı olabilirim?", timestamp: "2026-05-02T10:30:00.000Z" },
        { role: "user",      content: "2022 model BMW'me kasko yaptırmak istiyorum.", timestamp: "2026-05-02T10:30:45.000Z" },
        { role: "assistant", content: "BMW 320i için harika bir seçim! Sıfır hasarlı mı araç? Kasko ile birlikte trafik sigortanızı da yenilemek ister misiniz?", timestamp: "2026-05-02T10:31:20.000Z" },
        { role: "user",      content: "Evet, sıfır hasar, hiç kaza yapmadım. Hem kasko hem trafik istiyorum, en kapsamlı paket ne?", timestamp: "2026-05-02T10:32:00.000Z" },
        { role: "assistant", content: "Sıfır hasarlı sürücüler için özel indirimli paketlerimiz mevcut. Uzmanımız size en uygun teklifi hazırlasın. E-posta adresinizi alabilir miyim?", timestamp: "2026-05-02T10:32:40.000Z" },
        { role: "user",      content: "emre.celik@gmail.com", timestamp: "2026-05-02T10:33:00.000Z" },
      ],
    },
  };

  // Lead'leri oluştur
  const createdLeads = await Promise.all(
    leadsData.map((data, i) => {
      const daysAgo = Math.floor(Math.random() * 14);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      return prisma.lead.create({ data: { ...data, createdAt } as any });
    })
  );
  console.log(`✓  ${createdLeads.length} lead oluşturuldu`);

  // Görüşmeleri oluştur
  const convEntries = Object.entries(conversationData);
  await Promise.all(
    convEntries.map(([idx, conv]) => {
      const lead = createdLeads[Number(idx)];
      if (!lead) return null;
      return prisma.conversation.create({
        data: {
          sessionId:       `seed-${lead.id}`,
          widgetId:        lead.widgetId,
          tenantId:        lead.tenantId,
          leadId:          lead.id,
          messages:        conv.messages,
          durationSeconds: conv.durationSeconds,
        },
      });
    }).filter(Boolean)
  );
  console.log(`✓  ${convEntries.length} görüşme oluşturuldu`);

  console.log("\n🎉  Seed tamamlandı! Dashboard'u yenileyin.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
