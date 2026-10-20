# 🚀 Publicar a Rádio Costa na internet — passo a passo simples

São **3 cadastros gratuitos** (usando sua conta Google) e cerca de 10 minutos.
Siga na ordem:

---

## PARTE 1 — Conta no GitHub (onde o código fica guardado)

1. Acesse <https://github.com/signup>
2. Preencha seu **e-mail**, crie uma **senha** e um **nome de usuário**
   (ex.: `persiocosta` — esse será parte do seu endereço)
3. Confirme o e-mail que eles mandam para você
4. Pronto, você tem o GitHub

---

## PARTE 2 — Enviar o projeto para o GitHub

Abra o terminal na pasta do projeto e rode os comandos abaixo.
**Troque `SEU-USUARIO` pelo nome de usuário que você criou no GitHub:**

```bash
cd ~/Projetos/radio-online
git remote add origin https://github.com/SEU-USUARIO/radio-costa.git
git push -u origin main
```

> Se pedir login: o GitHub pode pedir um "Personal Access Token" no lugar da
> senha. Mais fácil: instale o `gh` e rode `gh auth login`, ou use o
> GitHub Desktop (gráficamente, sem terminal).

Se der qualquer problema com login, a alternativa sem terminal:
1. Acesse <https://github.com/new>
2. Nome do repositório: `radio-costa` → **Create repository**
3. Na página do repositório clique em **uploading an existing file**
4. Arraste **todos os arquivos da pasta `radio-online`** (exceto a pasta
   `data` e a pasta `musicas` se aparecerem) e clique **Commit**

---

## PARTE 3 — Conta no Render (a hospedagem da rádio)

1. Acesse <https://render.com/signup>
2. Clique em **Sign up with Google** (ou use seu e-mail) — grátis
3. Confirme o e-mail

### Criar a rádio no Render

1. Clique em **New +** → **Web Service**
2. Conecte sua conta do GitHub e escolha o repositório `radio-costa`
3. Preencha exatamente assim:

   | Campo | Valor |
   |-------|-------|
   | Name | `radio-costa` |
   | Region | qualquer (o padrão) |
   | Branch | `main` |
   | Runtime | `Node` |
   | Build Command | *(deixe em branco)* |
   | Start Command | `node server.js` |
   | Instance Type | **Free** |

4. Clique em **Create Web Service**

⚠️ Espere uns 3 minutos — o Render mostra "Deploy in progress" e depois
**"Your service is live 🟢"**.

---

## PARTE 4 — Entrar no painel e configurar

1. Abra `https://radio-costa.onrender.com` — verá o site da rádio
2. Abra `https://radio-costa.onrender.com/admin`
3. Entre com:
   - Usuário: `admin`
   - Senha: `admin123`
4. **Troque a senha** (Configurações → Trocar senha)
5. **Importe suas músicas** (arraste os arquivos .mp3 e clique em Importar)

> Importante: no Render gratuito, as músicas são apagadas a cada atualização
> do código. Guarde sempre os arquivos originais no seu computador!

---

## PARTE 5 (opcional) — Domínio grátis `radiocosta.is-a.dev`

Com o GitHub e a rádio no ar, siga o roteiro da pasta `dominios/pedidos.md`
(caminho 1 — is-a.dev). É só copiar e colar o JSON pronto.

---

## ❓ Problemas comuns

| Problema | Solução |
|----------|---------|
| "Cannot find module" no Render | Confira o Start Command: `node server.js` |
| Deploy falha | Veja os logs no Render (botão Logs) — se diz "push first", rode o passo da Parte 2 |
| Página 404 no Render | O repositório precisa ter o arquivo `server.js` na raiz |
| Esqueci a senha do painel | Apague o arquivo `data/users.json` no Render (via SSH) ou crie um repositório novo — mais fácil: no painel do Render, em Environment, crie `ADMIN_PASSWORD` com uma nova senha e reinicie o serviço |
| Quero ver erros | No Render: botão **Logs** mostra tudo que o servidor escreve |
