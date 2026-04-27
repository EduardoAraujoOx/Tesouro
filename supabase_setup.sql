-- ================================================================
-- TESOURO-ES: Schema + Seed para Supabase (PostgreSQL)
-- Cole tudo no SQL Editor do Supabase e clique em RUN
-- ================================================================

-- 1. ENUM
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN','SUBSET','SEFAZ','SEP','CONSULTA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. TABELAS
CREATE TABLE IF NOT EXISTS "User" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"         TEXT NOT NULL,
  "email"        TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role"         "Role" NOT NULL DEFAULT 'CONSULTA',
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SigefesUpload" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "monthRef"      TEXT NOT NULL,
  "referenceDate" TEXT,
  "fileName"      TEXT NOT NULL,
  "isLatest"      BOOLEAN NOT NULL DEFAULT true,
  "uploadedById"  TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "FinancialLine" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "rowOrder"      INTEGER NOT NULL,
  "rowLabel"      TEXT NOT NULL,
  "groupKey"      TEXT,
  "isGroup"       BOOLEAN NOT NULL DEFAULT false,
  "isSubtotal"    BOOLEAN NOT NULL DEFAULT false,
  "isTotal"       BOOLEAN NOT NULL DEFAULT false,
  "level"         INTEGER NOT NULL DEFAULT 0,
  "colI"          FLOAT8 NOT NULL DEFAULT 0,
  "colII"         FLOAT8 NOT NULL DEFAULT 0,
  "colIII"        FLOAT8 NOT NULL DEFAULT 0,
  "colIV"         FLOAT8 NOT NULL DEFAULT 0,
  "colV"          FLOAT8 NOT NULL DEFAULT 0,
  "colVI"         FLOAT8 NOT NULL DEFAULT 0,
  "colVII"        FLOAT8 NOT NULL DEFAULT 0,
  "colVIII"       FLOAT8 NOT NULL DEFAULT 0,
  "colIX"         FLOAT8 NOT NULL DEFAULT 0,
  "colX"          FLOAT8 NOT NULL DEFAULT 0,
  "colXI"         FLOAT8 NOT NULL DEFAULT 0,
  "colXII"        FLOAT8 NOT NULL DEFAULT 0,
  "colVIAdjusted" FLOAT8,
  "colVINote"     TEXT,
  "colIXAdjusted" FLOAT8,
  "colIXNote"     TEXT,
  "uploadId"      TEXT NOT NULL REFERENCES "SigefesUpload"("id") ON DELETE CASCADE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SubsetInput" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "uploadId"    TEXT NOT NULL REFERENCES "SigefesUpload"("id"),
  "monthRef"    TEXT NOT NULL,
  "isLatest"    BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SepInput" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "uploadId"    TEXT NOT NULL REFERENCES "SigefesUpload"("id"),
  "monthRef"    TEXT NOT NULL,
  "isLatest"    BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entityType" TEXT NOT NULL,
  "entityId"   TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "fieldName"  TEXT,
  "oldValue"   TEXT,
  "newValue"   TEXT,
  "userId"     TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PdfExport" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "monthRef"      TEXT NOT NULL,
  "generatedById" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LIMPAR dados anteriores (se existirem)
TRUNCATE "AuditLog","SubsetInput","SepInput","PdfExport","FinancialLine","SigefesUpload","User" CASCADE;

-- 4. USUÁRIOS (senha: Sistema@2026)
INSERT INTO "User"("id","name","email","passwordHash","role","active") VALUES
  ('usr-admin','Administrador','admin@sefaz.es.gov.br','$2b$12$xBFvj1NOvh8lBYVle7rwE.noiuC195J4TVfuHKj7QKDrJvYQmkAC.','ADMIN',true),
  ('usr-subset','Eduardo Araújo','subset@sefaz.es.gov.br','$2b$12$xBFvj1NOvh8lBYVle7rwE.noiuC195J4TVfuHKj7QKDrJvYQmkAC.','SUBSET',true),
  ('usr-sefaz','Ana Lima','sefaz@sefaz.es.gov.br','$2b$12$xBFvj1NOvh8lBYVle7rwE.noiuC195J4TVfuHKj7QKDrJvYQmkAC.','SEFAZ',true),
  ('usr-sep','Carlos Pereira','sep@sefaz.es.gov.br','$2b$12$xBFvj1NOvh8lBYVle7rwE.noiuC195J4TVfuHKj7QKDrJvYQmkAC.','SEP',true),
  ('usr-consulta','Consulta','consulta@sefaz.es.gov.br','$2b$12$xBFvj1NOvh8lBYVle7rwE.noiuC195J4TVfuHKj7QKDrJvYQmkAC.','CONSULTA',true);

-- 5. UPLOADS
INSERT INTO "SigefesUpload"("id","monthRef","referenceDate","fileName","isLatest","uploadedById","createdAt") VALUES
  ('ABR','2026-04','22/04/2026','controle_art42_reestruturado_v2.xlsx',true,'usr-subset','2026-04-23 08:41:00+00');

-- 6. FINANCIAL LINES — colunas: uploadId,rowOrder,level,rowLabel,groupKey,isGroup,isSubtotal,isTotal,
--    colI,colII,colIII,colIV,colV,colVI,colVII,colVIII,colIX,colX,colXI,colXII,createdAt,updatedAt
INSERT INTO "FinancialLine"("uploadId","rowOrder","level","rowLabel","groupKey","isGroup","isSubtotal","isTotal",
  "colI","colII","colIII","colIV","colV","colVI","colVII","colVIII","colIX","colX","colXI","colXII","createdAt","updatedAt") VALUES
  ('ABR',0,0,'RECURSOS ADMINISTRADOS PELO TESOURO (I)','TESOURO',true,false,false,2347935168.15,498399075.96,0,8252103740.53,-6402567648.34,0,0,2291431263.08,0,0,593307401.24,121359760.58,NOW(),NOW()),
  ('ABR',1,1,'Recursos Não Vinculados de Impostos','TESOURO',false,false,false,1211139238.42,343900015.22,0,7275603611.63,-6408364388.43,0,0,1233510730.23,0,0,391605482.72,114772385.58,NOW(),NOW()),
  ('ABR',2,1,'Outros Recursos Não Vinculados - Administração Direta','TESOURO',false,false,false,484332635.18,26755205.41,0,559043565.22,-101466135.45,0,0,404616081.8,0,0,129844941,0,NOW(),NOW()),
  ('ABR',3,1,'Outros Recursos Não Vinculados - Precatórios - Ação Civil Originária 2178','TESOURO',false,false,false,221456287.08,54724440.19,0,20140348.2,146591498.69,0,0,0,0,0,0,0,NOW(),NOW()),
  ('ABR',4,1,'Recursos Não Vinculados da Compesação de Impostos','TESOURO',false,false,false,90186294.13,8960426.89,0,15457786.45,65768080.79,0,0,2382246.59,0,0,0,0,NOW(),NOW()),
  ('ABR',5,1,'Royalties do Petróleo - Destinação Não Vinculada','TESOURO',false,false,false,290914330.67,62940352.09,0,381858429.03,-153884450.45,0,0,648287918.46,0,0,71856977.52,6587375,NOW(),NOW()),
  ('ABR',6,1,'Recursos de Operações de Crédito - Reembolso de Despesas Executadas com Recurso do Tesouro','TESOURO',false,false,false,48898241.18,618636.16,0,0,48279605.02,0,0,2634286,0,0,0,0,NOW(),NOW()),
  ('ABR',7,0,'DEMAIS RECURSOS - PODER EXECUTIVO (II)','DEMAIS',true,false,false,8169984509.36,926194616.24,0,4676054219.73,2567735673.39,0,0,6011148984.77,0,0,77882374,31515352.69,NOW(),NOW()),
  ('ABR',8,1,'FEFIN','DEMAIS',false,false,false,125371173.05,30266504.36,0,62516593.49,32588075.2,0,0,67460077.1,0,0,0,0,NOW(),NOW()),
  ('ABR',9,1,'FUNSES','DEMAIS',false,false,false,2146284413.2,166629.05,0,27219570.05,2118898214.1,0,0,233213673.28,0,0,77717374,0,NOW(),NOW()),
  ('ABR',10,1,'ROYALTIES DO PETRÓLEO - DESTINAÇÃO VINCULADA','DEMAIS',false,false,false,159442857.1,3208164.95,0,9261688.77,146973003.38,0,0,47674066.16,0,0,0,0,NOW(),NOW()),
  ('ABR',11,1,'OUTROS RECURSOS NÃO VINCULADOS - ADMINISTRAÇÃO INDIRETA','DEMAIS',false,false,false,263597468.31,16626212.11,0,230064779.88,16906476.32,0,0,175672708.39,0,0,0,0,NOW(),NOW()),
  ('ABR',12,1,'RECURSOS VINCULADOS A FUNDOS','DEMAIS',false,false,false,387057152.96,19677978.16,0,138960436.94,228418737.86,0,0,103329153.2,0,0,165000,0,NOW(),NOW()),
  ('ABR',13,1,'RECURSOS VINCULADOS À EDUCAÇÃO','DEMAIS',false,false,false,702221850.02,151220650.55,0,1699166864.58,-1148165665.11,0,0,1712235548.29,0,0,0,22029289.82,NOW(),NOW()),
  ('ABR',14,1,'RECURSOS VINCULADOS À SAUDE','DEMAIS',false,false,false,452117830.14,111450518.94,0,2003123497.39,-1662456186.19,0,0,1320416010.47,0,0,0,967865.87,NOW(),NOW()),
  ('ABR',15,1,'RECURSOS DE OPERAÇÕES DE CRÉDITO','DEMAIS',false,false,false,322882280.13,36222381.71,0,356783086.29,-70123187.87,0,0,712946595.34,0,0,0,0,NOW(),NOW()),
  ('ABR',16,1,'RECURSOS VINCULADOS À ASSISTÊNCIA SOCIAL','DEMAIS',false,false,false,6773432.01,163600.27,0,190501.99,6419329.75,0,0,2691155.67,0,0,0,0,NOW(),NOW()),
  ('ABR',17,1,'DEMAIS VINCULAÇÕES DECORRENTES DE TRANSFERÊNCIAS','DEMAIS',false,false,false,481071101.12,35816103.52,0,28205496.16,417049501.44,0,0,322871562.97,0,0,0,0,NOW(),NOW()),
  ('ABR',18,1,'RECURSOS DA CONTRIBUIÇÃO DE INTERVENÇÃO NO DOMÍNIO ECONÔMICO - CIDE','DEMAIS',false,false,false,32406555.94,121453.28,0,0,32285102.66,0,0,0,0,0,0,0,NOW(),NOW()),
  ('ABR',19,1,'RECURSOS VINCULADOS AO TRÂNSITO - MULTAS','DEMAIS',false,false,false,160359780.68,3861821.92,0,41810662.88,114687295.88,0,0,58150609.22,0,0,0,0,NOW(),NOW()),
  ('ABR',20,1,'RECURSOS PROVENIENTES DE TAXAS DE CONTROLE E FISCALIZAÇÃO AMBIENTAL DO ES','DEMAIS',false,false,false,43158946.12,4261880.75,0,6310853.45,32586211.92,0,0,10545478.81,0,0,0,0,NOW(),NOW()),
  ('ABR',21,1,'RECURSOS DE ALIENAÇÃO DE BENS','DEMAIS',false,false,false,47618690.18,3751535.73,0,0,43867154.45,0,0,16351727,0,0,0,0,NOW(),NOW()),
  ('ABR',22,1,'RECURSOS VINCULADOS AO FUNDO DE COMBATE E ERRADICAÇÃO DA POBREZA','DEMAIS',false,false,false,183087801.18,14750533.15,0,12927322.22,155409945.81,0,0,45726690.12,0,0,0,8518197,NOW(),NOW()),
  ('ABR',23,1,'DEMAIS RECURSOS VINCULADOS - ROMPIMENTO DA BARRAGEM DE FUNDÃO/MARIANA','DEMAIS',false,false,false,2124304461.54,44863999.69,0,59512865.64,2019927596.21,0,0,1171179922.75,0,0,0,0,NOW(),NOW()),
  ('ABR',24,1,'DEMAIS RECURSOS VINCULADOS','DEMAIS',false,false,false,87839284.56,5375216.98,0,0,82464067.58,0,0,10684006,0,0,0,0,NOW(),NOW()),
  ('ABR',25,1,'RECURSOS EXTRAORÇAMENTÁRIOS','DEMAIS',false,false,false,444389431.12,444389431.12,0,0,0,0,0,0,0,0,0,0,NOW(),NOW()),
  ('ABR',26,0,'SUBTOTAL (III=I+II)','SUBTOTAL',false,true,false,10517919677.51,1424593692.2,0,12928157960.26,-3834831974.95,0,0,8302580247.85,0,0,671189775.24,152875113.27,NOW(),NOW()),
  ('ABR',27,0,'RECURSOS VINCULADOS À PREVIDÊNCIA SOCIAL (IV)','PREVIDENCIA',true,false,false,10315675622.62,39050757.21,0,699302944.75,9577321920.66,0,0,92946650.61,0,0,813977240,0,NOW(),NOW()),
  ('ABR',28,0,'TOTAL (V=III+IV)','TOTAL',false,false,true,20833595300.13,1463644449.41,0,13627460905.01,5742489945.71,0,0,8395526898.46,0,0,1485167015.24,152875113.27,NOW(),NOW());

-- ================================================================
-- OPCIONAL: pré-preencher VI e IX com 0 para mostrar farois coloridos
-- (equivale a confirmar manualmente "sem arrecadação adicional prevista"
--  e "sem pressões SEP identificadas")
-- Execute este bloco separadamente após o seed acima.
-- ================================================================
UPDATE "FinancialLine"
SET "colVIAdjusted" = 0, "colIXAdjusted" = 0
WHERE "colVIAdjusted" IS NULL OR "colIXAdjusted" IS NULL;
