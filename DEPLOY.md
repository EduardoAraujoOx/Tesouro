# Guia de Implantação — Ambiente Interno SEFAZ-ES

Este documento é o ponto de partida para um desenvolvedor implantar o sistema **Disponibilidade Financeira Líquida** em infraestrutura interna da Secretaria de Estado da Fazenda do Espírito Santo.

---

## Índice

1. [Visão geral das opções de implantação](#1-visão-geral)
2. [Pré-requisitos de infraestrutura](#2-pré-requisitos)
3. [Opção A — Docker (recomendado)](#3-opção-a--docker)
4. [Opção B — Instalação manual no servidor](#4-opção-b--instalação-manual)
5. [Banco de dados PostgreSQL](#5-banco-de-dados)
6. [Variáveis de ambiente](#6-variáveis-de-ambiente)
7. [Proxy reverso com Nginx](#7-proxy-reverso-nginx)
8. [Primeiro acesso e senhas iniciais](#8-primeiro-acesso)
9. [Checklist de segurança pós-implantação](#9-checklist-de-segurança)
10. [Manutenção e backups](#10-manutenção-e-backups)
11. [Solução de problemas comuns](#11-solução-de-problemas)

---

## 1. Visão Geral

O sistema é uma aplicação **Next.js 16 (Node.js)** com banco de dados **PostgreSQL**. Há duas formas de implantação:

| Opção | Indicada para | Complexidade |
|---|---|---|
| **Docker** (Seção 3) | Infraestrutura com Docker Engine disponível | Baixa |
| **Manual** (Seção 4) | Servidores sem Docker (bare metal, VM) | Média |

Independente da opção, é necessário:
- Servidor Linux (Ubuntu 22.04 LTS, Debian 12 ou RHEL 9) com no mínimo **2 GB RAM** e **10 GB de disco**
- PostgreSQL 15 ou 16 (já existente na infraestrutura ou via Docker)
- Porta **3000** (app) ou **80/443** (com Nginx) acessível na rede interna

---

## 2. Pré-Requisitos

### 2.1 Infraestrutura mínima

| Recurso | Mínimo | Recomendado |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB | 4 GB |
| Disco | 10 GB | 20 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Rede | Acesso interno SEFAZ | Acesso interno SEFAZ |

### 2.2 Softwares necessários

**Para implantação via Docker:**
```bash
# Verificar se Docker está instalado
docker --version       # requer Docker Engine >= 24.x
docker compose version # requer Docker Compose >= 2.20
```

**Para implantação manual:**
```bash
# Verificar Node.js (obrigatório >= 20)
node --version    # deve exibir v20.x.x ou superior
npm --version     # deve exibir 10.x.x ou superior

# Verificar psql (cliente PostgreSQL)
psql --version
```

### 2.3 Obter o código-fonte

```bash
# Clonar o repositório
git clone https://github.com/eduardoaraujoox/tesouro.git tesouro-app
cd tesouro-app

# Verificar que está na branch principal
git checkout main
```

> **Sem acesso à internet?** Copie a pasta do projeto para o servidor (scp, pendrive ou rede interna). O diretório `node_modules` não precisa ser copiado — ele é regenerado na instalação.

---

## 3. Opção A — Docker

Esta é a forma mais simples e recomendada. O Docker isola a aplicação e facilita atualizações.

### 3.1 Configurar variáveis de ambiente

Copie o arquivo de exemplo e edite:

```bash
cp .env.example .env
nano .env   # ou use o editor de sua preferência
```

**Caso A — usar PostgreSQL do próprio Docker Compose** (banco sobe junto com a app):

```env
# Banco de dados: aponta para o serviço "db" do compose (nome interno da rede Docker)
DATABASE_URL="postgresql://tesouro_user:TROQUE_ESTA_SENHA@db:5432/tesouro_db"

# Credenciais do container PostgreSQL (deve coincidir com DB_PASSWORD)
DB_USER=tesouro_user
DB_PASSWORD=TROQUE_ESTA_SENHA
DB_NAME=tesouro_db

# Chave de sessão — gere com: openssl rand -base64 32
NEXTAUTH_SECRET="cole-aqui-o-valor-gerado"

# URL interna do sistema
NEXTAUTH_URL="http://tesouro.sefaz.es.gov.br"
```

**Caso B — usar PostgreSQL já existente na infraestrutura SEFAZ** (banco externo):

```env
# Banco de dados externo (remova o serviço "db" do docker-compose.yml)
DATABASE_URL="postgresql://tesouro_user:SENHA@192.168.1.50:5432/tesouro_db"

# Chave de sessão — gere com: openssl rand -base64 32
NEXTAUTH_SECRET="cole-aqui-o-valor-gerado"

# URL interna do sistema
NEXTAUTH_URL="http://tesouro.sefaz.es.gov.br"
```

> Consulte a [Seção 6](#6-variáveis-de-ambiente) para a descrição completa de cada variável.

### 3.2 Subir os containers

```bash
# Construir a imagem e subir os serviços em background
docker compose up -d --build

# Acompanhar os logs da aplicação
docker compose logs -f app
```

O primeiro `build` pode levar 3–5 minutos. Aguarde a mensagem:
```
app  | ✓ Ready in Xs
```

### 3.3 Inicializar o banco de dados

```bash
# Aplicar o schema (cria as tabelas)
docker compose exec app npx prisma migrate deploy

# Popular com usuários e dados de exemplo
docker compose exec app npx prisma db seed
```

### 3.4 Verificar funcionamento

Acesse `http://IP_DO_SERVIDOR:3000` no navegador. A tela de login deve aparecer.

### 3.5 Parar / reiniciar

```bash
docker compose down          # para os containers (banco de dados preservado)
docker compose up -d         # reinicia sem rebuild
docker compose up -d --build # reinicia com rebuild (após atualizações)
```

### 3.6 Atualizar a aplicação

```bash
git pull origin main
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

---

## 4. Opção B — Instalação Manual

Use esta opção quando Docker não estiver disponível.

### 4.1 Instalar Node.js 20

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# RHEL/CentOS/Rocky
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install nodejs -y

# Verificar
node --version  # v20.x.x
```

### 4.2 Instalar dependências do projeto

```bash
cd /opt/tesouro-app   # ou o diretório onde o código está

npm install
```

### 4.3 Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha as variáveis conforme a [Seção 6](#6-variáveis-de-ambiente).

### 4.4 Gerar o cliente Prisma e fazer o build

```bash
# Gerar cliente do ORM
npx prisma generate

# Aplicar schema no banco de dados
npx prisma migrate deploy

# Seed com usuários iniciais e dados de exemplo
npx prisma db seed

# Compilar a aplicação para produção
npm run build
```

> O comando `npm run build` executa `prisma generate && next build` automaticamente.

### 4.5 Testar antes de configurar como serviço

```bash
npm start   # inicia em http://localhost:3000
```

Acesse `http://localhost:3000` para confirmar que funciona. Pressione `Ctrl+C` para parar.

### 4.6 Configurar como serviço systemd

Crie o arquivo de serviço para que a aplicação inicie automaticamente:

```bash
sudo nano /etc/systemd/system/tesouro-app.service
```

Conteúdo do arquivo:

```ini
[Unit]
Description=Tesouro App — Disponibilidade Financeira Líquida SEFAZ-ES
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/tesouro-app
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tesouro-app

# Variáveis de ambiente (alternativa ao arquivo .env)
EnvironmentFile=/opt/tesouro-app/.env

[Install]
WantedBy=multi-user.target
```

Ativar e iniciar o serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tesouro-app
sudo systemctl start tesouro-app

# Verificar status
sudo systemctl status tesouro-app
sudo journalctl -u tesouro-app -f   # acompanhar logs em tempo real
```

---

## 5. Banco de Dados

### 5.1 Criar banco e usuário no PostgreSQL

Execute no servidor PostgreSQL (ou via pgAdmin/DBeaver):

```sql
-- Conectado como superusuário (postgres)
CREATE USER tesouro_user WITH PASSWORD 'troque-esta-senha';
CREATE DATABASE tesouro_db OWNER tesouro_user;
GRANT ALL PRIVILEGES ON DATABASE tesouro_db TO tesouro_user;
```

### 5.2 String de conexão

Exemplos de `DATABASE_URL` conforme a localização do banco:

```env
# PostgreSQL na mesma máquina (localhost)
DATABASE_URL="postgresql://tesouro_user:SENHA@localhost:5432/tesouro_db"

# PostgreSQL em servidor separado da rede interna
DATABASE_URL="postgresql://tesouro_user:SENHA@192.168.1.50:5432/tesouro_db"

# Com parâmetros de SSL (se o servidor exigir)
DATABASE_URL="postgresql://tesouro_user:SENHA@192.168.1.50:5432/tesouro_db?sslmode=require"

# Connection pooler (PgBouncer) — recomendado para produção
DATABASE_URL="postgresql://tesouro_user:SENHA@192.168.1.50:6432/tesouro_db?pgbouncer=true&connection_limit=1"
```

### 5.3 Aplicar schema e dados iniciais

```bash
# Criar todas as tabelas a partir das migrations
npx prisma migrate deploy

# Popular banco com usuários e dados de demonstração (Abril/2026)
npx prisma db seed
```

### 5.4 Schema do banco de dados

O schema completo está em `prisma/schema.prisma`. As tabelas criadas são:

| Tabela | Propósito |
|---|---|
| `User` | Usuários do sistema com roles de acesso |
| `SigefesUpload` | Registro de cada importação de planilha |
| `FinancialLine` | Linhas financeiras com as 12 colunas do SIGEFES |
| `SubsetInput` | Controle de inputs de Arrecadação (Col VI) |
| `SepInput` | Controle de inputs de Pressões (Col IX) |
| `AuditLog` | Trilha de auditoria completa |
| `PdfExport` | Registro de exportações em PDF |

---

## 6. Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | **Sim** | String de conexão PostgreSQL (ver Seção 5.2) |
| `NEXTAUTH_SECRET` | **Sim** | Chave para assinar tokens JWT de sessão. Gere com: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **Sim** | URL completa de acesso ao sistema. Ex: `http://tesouro.sefaz.es.gov.br` ou `http://192.168.1.100:3000` |

> **Importante:** `NEXTAUTH_URL` deve ser exatamente a URL que os usuários usarão no navegador, incluindo protocolo (`http://` ou `https://`).

### Exemplo completo de `.env` para ambiente interno:

```env
# Banco de dados PostgreSQL interno
DATABASE_URL="postgresql://tesouro_user:MinhasSenha123@192.168.1.50:5432/tesouro_db"

# Chave de sessão JWT (nunca compartilhe este valor)
NEXTAUTH_SECRET="abc123...gere-um-valor-real-com-openssl"

# URL do sistema conforme acessado pelos usuários
NEXTAUTH_URL="http://tesouro.sefaz.es.gov.br"
```

---

## 7. Proxy Reverso Nginx

Configure o Nginx para expor o sistema na porta 80 (e 443 com HTTPS):

### 7.1 Instalar Nginx

```bash
sudo apt install nginx   # Ubuntu/Debian
sudo yum install nginx   # RHEL/CentOS
```

### 7.2 Criar configuração do site

```bash
sudo nano /etc/nginx/sites-available/tesouro-app
```

**Configuração HTTP (sem SSL):**

```nginx
server {
    listen 80;
    server_name tesouro.sefaz.es.gov.br;  # ajuste para o hostname interno

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
}
```

**Configuração HTTPS (com certificado interno):**

```nginx
server {
    listen 80;
    server_name tesouro.sefaz.es.gov.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name tesouro.sefaz.es.gov.br;

    # Ajuste os caminhos para os certificados da CA interna da SEFAZ
    ssl_certificate     /etc/ssl/certs/tesouro-sefaz.crt;
    ssl_certificate_key /etc/ssl/private/tesouro-sefaz.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
}
```

### 7.3 Ativar e testar

```bash
sudo ln -s /etc/nginx/sites-available/tesouro-app /etc/nginx/sites-enabled/
sudo nginx -t          # verificar sintaxe
sudo systemctl reload nginx
```

> Lembre de atualizar `NEXTAUTH_URL` no `.env` para refletir a URL com HTTPS se usar certificado.

---

## 8. Primeiro Acesso

### 8.1 Usuários criados pelo seed

Após executar `npx prisma db seed`, os seguintes usuários são criados com senha padrão `Sistema@2026`:

| E-mail | Role | Permissões |
|---|---|---|
| `admin@sefaz.es.gov.br` | ADMIN | Acesso total: uploads, inputs, exportações, gestão de usuários |
| `subset@sefaz.es.gov.br` | SUBSET | Upload SIGEFES + preenchimento Coluna VI (Arrecadação) |
| `sefaz@sefaz.es.gov.br` | SEFAZ | Upload SIGEFES + visualização/exportação |
| `sep@sefaz.es.gov.br` | SEP | Preenchimento Coluna IX (Pressões) + visualização/exportação |
| `consulta@sefaz.es.gov.br` | CONSULTA | Somente leitura |

### 8.2 Primeiro login

1. Acesse a URL do sistema no navegador
2. Faça login com `admin@sefaz.es.gov.br` / `Sistema@2026`
3. Vá em **Admin → Usuários** para criar os usuários reais e desativar os de exemplo

### 8.3 Trocar senhas imediatamente

> **Segurança:** As senhas do seed são de conhecimento público. Troque-as antes de colocar o sistema em uso.

Via painel admin (`/admin/usuarios`): crie os usuários reais das equipes SUBSET, SEP e SEFAZ, e desative ou exclua os usuários de exemplo.

---

## 9. Checklist de Segurança Pós-Implantação

Execute este checklist antes de liberar o acesso para os usuários:

- [ ] `NEXTAUTH_SECRET` é um valor aleatório único (não o exemplo do `.env.example`)
- [ ] O arquivo `.env` não está no repositório git (`git status` não deve exibi-lo)
- [ ] Senhas do seed foram trocadas ou usuários de exemplo foram desativados
- [ ] O banco PostgreSQL aceita conexões apenas da máquina da aplicação (firewall)
- [ ] A porta 3000 (Node.js) não está exposta diretamente — apenas via Nginx
- [ ] Certificado SSL instalado se o acesso for pela rede corporativa (recomendado)
- [ ] HTTPS configurado e `NEXTAUTH_URL` atualizado para `https://...`
- [ ] Remover a diretiva `upgrade-insecure-requests` do CSP em `next.config.mjs` se o ambiente não usar HTTPS (ver Seção 11.2)
- [ ] Backup automático do banco configurado (ver Seção 10)
- [ ] Logs centralizados ou monitoramento configurado

---

## 10. Manutenção e Backups

### 10.1 Backup do banco de dados

**Script de backup diário (PostgreSQL):**

```bash
#!/bin/bash
# Salve em: /opt/scripts/backup-tesouro.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/tesouro"
mkdir -p $BACKUP_DIR

pg_dump -U tesouro_user -h localhost tesouro_db | gzip > "$BACKUP_DIR/tesouro_$DATE.sql.gz"

# Manter apenas os últimos 30 dias
find $BACKUP_DIR -name "tesouro_*.sql.gz" -mtime +30 -delete
```

Agendar no cron:
```bash
# Backup diário às 2h
crontab -e
0 2 * * * /opt/scripts/backup-tesouro.sh
```

### 10.2 Restaurar backup

```bash
gunzip -c /opt/backups/tesouro/tesouro_20260501_020000.sql.gz | psql -U tesouro_user -h localhost tesouro_db
```

### 10.3 Atualizar a aplicação

```bash
# Via Docker
cd /opt/tesouro-app
git pull origin main
docker compose up -d --build
docker compose exec app npx prisma migrate deploy

# Via instalação manual
cd /opt/tesouro-app
git pull origin main
npm install
npm run build
npx prisma migrate deploy
sudo systemctl restart tesouro-app
```

### 10.4 Verificar logs

```bash
# Docker
docker compose logs -f app

# Systemd
journalctl -u tesouro-app -f --since "1 hour ago"
```

---

## 11. Solução de Problemas

### 11.1 Erro de conexão com banco de dados

**Sintoma:** `PrismaClientInitializationError: Can't reach database server`

**Verificar:**
```bash
# Testar conexão direta com o banco
psql "postgresql://tesouro_user:SENHA@HOST:5432/tesouro_db"

# Verificar se o PostgreSQL está aceitando conexões externas
# em /etc/postgresql/16/main/pg_hba.conf, adicionar:
# host    tesouro_db    tesouro_user    IP_APP/32    md5

# Recarregar PostgreSQL após mudança
sudo systemctl reload postgresql
```

### 11.2 Erro de HTTPS / CSP com ambiente sem SSL

**Sintoma:** Recursos não carregam, erros de CSP no console do navegador.

Se o ambiente interno não usar HTTPS, remova `"upgrade-insecure-requests"` do CSP em `next.config.mjs`:

```diff
- "upgrade-insecure-requests",
```

Também remova a entrada `Strict-Transport-Security` se não usar HTTPS.

### 11.3 Sessão expira imediatamente após login

**Sintoma:** Login funciona mas redireciona de volta para `/login`.

**Causas e soluções:**
1. `NEXTAUTH_URL` incorreto — deve ser exatamente a URL que aparece no navegador
2. `NEXTAUTH_SECRET` não definido ou com espaços
3. Relógio do servidor dessincronizado — JWT tem tolerância de 5 minutos: `sudo timedatectl set-ntp true`

### 11.4 Upload de planilha falha

**Sintoma:** Erro ao enviar arquivo `.xlsx` do SIGEFES.

**Verificar:**
1. O arquivo deve ser `.xlsx` (não `.xls` nem `.csv`)
2. O arquivo deve ter exatamente 29 linhas de dados na aba correta
3. Verificar logs do servidor para a mensagem de erro específica do validador

### 11.5 Porta 3000 em uso

```bash
# Encontrar processo usando a porta
sudo lsof -i :3000
# Encerrar o processo antigo e reiniciar
sudo systemctl restart tesouro-app
```

### 11.6 Permissões de arquivo (instalação manual)

```bash
# Ajustar proprietário do diretório
sudo chown -R www-data:www-data /opt/tesouro-app
sudo chmod -R 755 /opt/tesouro-app
```

---

## Contato e Suporte

Em caso de dúvidas técnicas sobre a implantação, consultar:

- **Repositório:** `https://github.com/eduardoaraujoox/tesouro`
- **Especificação técnica:** `SPEC.md` (no repositório)
- **Notas de manutenção:** `MAINTENANCE.md` (no repositório)
- **Desenvolvedor original:** Eduardo Araújo — economista.araujo@gmail.com
