# 🌍 Pedidos de domínio grátis para a Rádio Costa

Preparei dois caminhos. Leia a comparação e escolha um:

| | **is-a.dev** (recomendado) | **js.org** |
|---|---|---|
| Endereço | `radiocosta.is-a.dev` | `radiocosta.js.org` |
| Aponta para | o Render direto ✅ | GitHub Pages (não o Render) |
| Exige | conta no GitHub | conta no GitHub |
| Aprovação | dias (revisão manual) | dias (revisão manual) |

> **Atenção:** o js.org só permite apontar para sites no GitHub Pages, que é
> hospedagem estática — **não roda o servidor da rádio**. Por isso o caminho
> recomendado é o **is-a.dev**.

---

## ✅ CAMINHO 1 — is-a.dev (aponta direto para a Rádio Costa no Render)

### Passo 1 — tenha o projeto no GitHub
Se ainda não publicou:
```bash
cd radio-online
git init
git add .
git commit -m "Rádio Costa"
```
Crie um repositório em <https://github.com/new> (pode ser público ou privado)
e rode:
```bash
git remote add origin https://github.com/SEU-USUARIO/radio-costa.git
git push -u origin main
```

### Passo 2 — tenha a rádio no ar no Render
Siga o passo a passo do `README.md` (seção "Como publicar de graça na
internet"). No final você terá o endereço `https://radio-costa.onrender.com`.

### Passo 3 — faça o pedido
1. Crie uma conta no GitHub (se ainda não tem) — é gratuita
2. Abra <https://github.com/is-a-dev/register/fork> e dê **Fork**
   (isso copia o projeto deles para a sua conta)
3. No seu fork, crie o arquivo:
   **`subdomains/radiocosta.json`**
4. Cole este conteúdo (troque `SEU-USUARIO` pelo seu usuário do GitHub):

```json
{
  "description": "Rádio Costa — rádio online com programação própria",
  "owner": {
    "github": "SEU-USUARIO",
    "email": "SEU-EMAIL@exemplo.com"
  },
  "repo": "https://github.com/SEU-USUARIO/radio-costa",
  "records": {
    "CNAME": "radio-costa.onrender.com"
  },
  "proxied": true
}
```

5. Salve com a mensagem: `Add radiocosta subdomain`
6. Clique em **Create pull request** e aguarde a revisão (dias úteis)

Quando aprovado, sua rádio passa a funcionar em:
**`https://radiocosta.is-a.dev`** 🎉

> Dica: deixe no `SEU-EMAIL` um e-mail real que você tenha — eles usam só
> para contato. O `"proxied": true` deixa o endereço com HTTPS automático.

---

## 🅰️ CAMINHO 2 — js.org (só se você quiser o endereço .js.org)

O js.org exige que exista um site no GitHub Pages apontado para
`radiocosta.js.org`. Como a rádio roda no Render, a forma de usar o js.org é
criar uma "página de desvio" no GitHub Pages que redirecione os ouvintes
para o Render. É mais trabalhoso — siga só se quiser muito o .js.org.

### Passo 1 — adicione o arquivo CNAME ao repositório
O arquivo `CNAME` (sem extensão) com uma única linha:
```
radiocosta.js.org
```
Coloque na raiz do repositório GitHub que vai servir o GitHub Pages.

### Passo 2 — ative o GitHub Pages
No repositório no GitHub: **Settings → Pages → Source: Deploy from a branch**
→ Branch: `main` / pasta `/ (raiz)`.

### Passo 3 — faça o pedido
1. Dê fork em <https://github.com/js-org/dns.js.org>
2. Crie o arquivo **`repositories/radiocosta.json`**:

```json
{
  "domain": "js.org",
  "subdomain": "radiocosta",
  "owner": {
    "github": "SEU-USUARIO"
  },
  "target": {
    "githubPages": true
  }
}
```

3. Abra o Pull Request com este texto (está em inglês, como eles exigem):

```
Hi! I would like the radiocosta subdomain for my online radio project
"Rádio Costa" (https://github.com/SEU-USUARIO/radio-costa).

The CNAME file has been added to the repository and the GitHub Pages
site is already working at https://SEU-USUARIO.github.io/radio-costa/.

Thank you!
```

4. Aguarde a revisão deles (pode levar alguns dias)

---

## 🚫 O que NÃO fazer

- **Nunca** digite sua senha do GitHub em sites de "domínio grátis" duvidosos
- Desconfie de promessas de `.com`/`.com.br` grátis para sempre — na prática
  é grátis só o 1º ano
- O Freenom (`.tk`, `.ml`, `.ga`) **fechou** — qualquer site imitando ele é
  golpe
