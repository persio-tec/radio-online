# 📻 Rádio Costa

Rádio online **com programação 100% controlada pelo administrador**.
Nenhuma música é tocada automaticamente: só as músicas que **você** importar
no painel aparecem para os ouvintes.

- **Servidor:** Node.js puro — **zero dependências** (não precisa de `npm install`)
- **Painel admin:** login com usuário/senha, upload de MP3, M4A, AAC, OGG, OPUS,
  WAV, FLAC, WEBM e WMA, reordenação, edição e exclusão de faixas
- **Site do ouvinte:** player com visualizador, barra de busca (seek), volume,
  embaralhar e repetir

## ▶ Como rodar no seu computador

```bash
cd radio-online
node server.js
```

- Site dos ouvintes: <http://localhost:3000>
- Painel do administrador: <http://localhost:3000/admin>

### Primeiro acesso
Na primeira execução o terminal mostra:

```
Usuário: admin
Senha:   admin123
```

Entre no `/admin` com esses dados e **troque a senha** em
*Configurações → Trocar senha*.

## 📥 Como importar músicas

1. Entre no painel `/admin`
2. Em **Importar músicas**, arraste os arquivos (ou clique para escolher)
3. Preencha artista e álbum (opcional)
4. Clique em **Importar para a programação**

Pronto: as faixas aparecem na programação do site e começam a tocar na hora.
Use ▲▼ para reordenar, ✏️ para editar e 🗑️ para excluir.

## 🌐 Como publicar de graça na internet (Render)

Como a rádio tem login e envio de arquivos, ela precisa de um **servidor**
(hospedagem estática como Netlify/Cloudflare Pages não serve). O Render tem
plano gratuito para isso:

1. Crie uma conta grátis em <https://render.com> (pode usar sua conta Google)
2. Coloque o projeto no GitHub:
   ```bash
   cd radio-online
   git init
   git add .
   git commit -m "Rádio Costa"
   ```
   Crie um repositório em <https://github.com/new> e:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/radio-costa.git
   git push -u origin main
   ```
3. No Render: **New + → Web Service** → conecte o repositório
4. Configure:
   - **Name:** `radio-costa` (vira o endereço da rádio)
   - **Build Command:** *(deixe vazio)*
   - **Start Command:** `node server.js`
5. Clique **Create Web Service**

Sua rádio fica no ar em **`https://radio-costa.onrender.com`** — endereço
grátis, com HTTPS incluso.

### Definir usuário e senha pelo ambiente (opcional)
No painel do Render, em **Environment**, adicione:

| Variável        | Exemplo        |
|-----------------|----------------|
| `ADMIN_USER`    | `costa`        |
| `ADMIN_PASSWORD`| `sua-senha-forte` |

Assim a conta nasce com seus dados (sem usar o admin123).

## 🌍 Domínio grátis (endereço próprio)

O endereço `radio-costa.onrender.com` **já é grátis e permanente**. Se quiser
algo mais personalizado sem pagar, preparei um guia completo com os dois
melhores caminhos — tudo pronto para copiar e colar:

📄 **`dominios/pedidos.md`** — inclui:
- **is-a.dev** (recomendado): ganha `radiocosta.is-a.dev` apontando direto
  para a rádio no Render — JSON do pedido pronto, é só trocar seu usuário
- **js.org**: ganha `radiocosta.js.org` — inclui o arquivo `dominios/CNAME`
  e o texto do pedido em inglês, já redigido

> Domínio `.com`/`.io` próprio não é grátis em lugar nenhum — custa a partir
> de ~R$ 40/ano em registradoras como Registro.br, Cloudflare ou Namecheap.

## ⚠️ Avisos importantes da hospedagem gratuita

- **Músicas são perdidas a cada novo deploy** no plano gratuito do Render
  (o disco é temporário). Antes de mandar atualizações, baixe as músicas do
  painel ou guarde os arquivos originais para reimportar.
- O plano grátis **dorme após ~15 min sem acesso**; a primeira visita demora
  uns 30 s para acordar.
- Faça backup de `data/` (senhas/programação) e `musicas/` regularmente.

## 🗂 Estrutura do projeto

```
radio-online/
├── server.js        # servidor (Node puro, sem dependências)
├── package.json
├── public/          # site do ouvinte
│   ├── index.html
│   ├── style.css
│   └── app.js
├── admin/           # painel do administrador
│   ├── index.html
│   ├── admin.css
│   └── admin.js
├── data/            # criado automaticamente (senha, programação, config)
└── musicas/         # criado automaticamente (arquivos importados)
```

## 🔐 Segurança

- Senhas guardadas com **scrypt** (mesma família do que usam bancos)
- Sessão por cookie HTTPOnly assinado com HMAC (expira em 7 dias)
- Upload limitado a 150 MB por arquivo e só com extensões de áudio
- Nomes de arquivo protegidos contra path traversal (UUID)
- **Troque a senha padrão assim que publicar!**
