# Homologação no notebook (Linux Mint)

O notebook roda a mesma imagem que a CI testou. Não compila nada e não precisa de Node.

```
merge na main ─► CI: test + docker build ─► publish: ghcr.io/joaocerqueira-dev/comercial-irroba
                                                     tags :main e :sha-xxxxxxx
                                                                 │
notebook: ./deploy.sh ─► docker compose pull + up ◄──────────────┘
          app (127.0.0.1:3000) + cloudflared ─► Cloudflare (HTTPS) ─► time e clientes
          volumes: app-data (SQLite) e app-captures
```

Tudo o que o notebook usa fica em `deploy/homolog/`:

| Arquivo | Para quê |
|---|---|
| `docker-compose.yml` | app pela imagem do GHCR, túnel `tunnel` (com domínio) ou `quick` (sem domínio) |
| `.env.example` | modelo do `.env` (segredos, versão, túnel) |
| `deploy.sh` | atualiza para a versão do `.env`; se a nova não subir, volta sozinho para a anterior |
| `rollback.sh` | fixa uma versão (`sha-xxxxxxx`) ou volta a acompanhar a `main` |
| `backup.sh` | cópia do banco e das capturas em `~/irroba-backups` |
| `restore.sh` | restaura um backup |

## 1. Uma vez no GitHub

Depois do primeiro push na `main` com o job `publish`, a imagem aparece em **Packages** no perfil do GitHub. Abra o pacote `comercial-irroba` → **Package settings** → **Change visibility** → **Public**. Assim o notebook baixa sem login. A imagem só tem o código, que já é público. Os segredos ficam no `.env` do notebook.

Se preferir manter o pacote privado, crie um token clássico com `read:packages` e rode no notebook `docker login ghcr.io -u <usuário>`.

## 2. Preparar o notebook

### Docker

O script `get.docker.com` não reconhece o Linux Mint. Instale pelo repositório do Ubuntu, usando o codinome do Ubuntu em que o Mint se baseia (`noble` no Mint 22):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker
```

Saia da sessão e entre de novo, para o grupo `docker` valer. Confira com `docker run --rm hello-world`.

### Energia

O notebook não pode suspender, nem com a tampa fechada:

```bash
sudo sed -i -E 's/^#?HandleLidSwitch=.*/HandleLidSwitch=ignore/; s/^#?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/; s/^#?HandleLidSwitchDocked=.*/HandleLidSwitchDocked=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind
```

Em **Configurações do sistema → Gerenciamento de energia**, coloque "Nunca" para suspender e para desligar a tela na tomada. Deixe o notebook sempre na tomada e, se possível, no cabo de rede.

Com `restart: unless-stopped` e o Docker habilitado no boot, o sistema volta sozinho quando o notebook liga. Não precisa fazer login na sessão gráfica.

## 3. Túnel na Cloudflare

**Com domínio (endereço fixo, o recomendado):**

1. O domínio precisa estar na Cloudflare (plano grátis).
2. Em **Zero Trust → Networks → Tunnels → Create a tunnel**, escolha **Cloudflared**, dê um nome (ex.: `irroba-homolog`) e, na tela de instalação, escolha **Docker**. Copie só o token, a parte depois de `--token`.
3. Em **Public Hostname**, crie `homolog.suaempresa.com.br` com serviço `HTTP` e URL `app:3000`.
4. No `.env`: `COMPOSE_PROFILES=tunnel` e `TUNNEL_TOKEN=<token>`.

**Sem domínio (só para os primeiros testes):** use `COMPOSE_PROFILES=quick`. O endereço `*.trycloudflare.com` aparece em `docker compose logs cloudflared-quick` e muda a cada reinício. Os links enviados a clientes param de funcionar quando ele muda, e `PUBLIC_ASSET_BASE_URL` precisa ser atualizado junto.

## 4. Primeiro deploy

```bash
git clone https://github.com/joaocerqueira-dev/comercial-irroba.git ~/comercial-irroba
cd ~/comercial-irroba/deploy/homolog
cp .env.example .env
openssl rand -base64 48   # rode duas vezes: um valor para SESSION_SECRET, outro para AI_KEYS_SECRET
nano .env                 # ADMIN_EMAIL, ADMIN_PASS, os dois segredos, PUBLIC_ASSET_BASE_URL e o túnel
chmod 600 .env
./deploy.sh
```

O clone serve só para ter estes scripts e o perfil seccomp (`docker/seccomp-chromium.json`). Para atualizar os scripts, rode `git pull` na pasta do clone. O sistema em si vem da imagem.

Guarde `AI_KEYS_SECRET` num lugar seguro. Se ele mudar ou se perder, todos os usuários precisam cadastrar a chave de IA de novo.

### Validação

- [ ] `docker compose ps` mostra o `app` como `healthy` e o túnel como `running`.
- [ ] `http://localhost:3000` abre no notebook.
- [ ] O endereço público abre com HTTPS e o login do admin funciona (ele pede para trocar a senha).
- [ ] Em **Minha IA**, cadastrar a chave e gerar um preview de uma loja real. Isso valida o Chromium com sandbox no notebook.
- [ ] Enviar um link de cliente com senha e abrir no celular, fora do Wi-Fi da empresa.
- [ ] Reiniciar o notebook (`sudo reboot`) e conferir que o sistema volta sozinho, com os dados.

Se o preview falhar com erro de sandbox do Chromium, siga "Troubleshooting: sandbox do Chromium" em [`deploy.md`](deploy.md). O Mint 22 usa como base o Ubuntu 24.04, que restringe user namespaces (`kernel.apparmor_restrict_unprivileged_userns`). Para testar só o navegador:

```bash
docker compose exec app node -e "require('playwright').chromium.launch({chromiumSandbox:true}).then(b=>{console.log('ok');return b.close()}).catch(e=>{console.error(e.message);process.exit(1)})"
```

## 5. Rotina

### Deploy

Depois de um merge na `main`, espere a CI ficar verde (o job `publish` leva poucos minutos) e rode:

```bash
cd ~/comercial-irroba/deploy/homolog && ./deploy.sh
```

1. A imagem nova é baixada com a versão antiga no ar.
2. O container é trocado. O sistema fica fora do ar por uns 10 a 30 segundos, e quem acessar nesse intervalo vê um erro 502 da Cloudflare.
3. O script espera o healthcheck. Se a versão nova não ficar saudável em 3 minutos, ele volta sozinho para a anterior e não tenta de novo a mesma imagem. Para insistir, use `./deploy.sh --force`.

Uma geração de preview em andamento é cortada na troca. Faça o deploy quando ninguém estiver gerando.

**Deploy automático (opcional):** quando os deploys manuais estiverem tranquilos, agende o `deploy.sh` em horários combinados com o time. Ele não faz nada se não houver versão nova. Exemplo para dias úteis às 12h e às 19h, com `crontab -e`:

```cron
0 12,19 * * 1-5 $HOME/comercial-irroba/deploy/homolog/deploy.sh >> $HOME/irroba-deploy.log 2>&1
```

### Voltar uma versão

As versões publicadas ficam na página do pacote no GitHub. Cada uma tem a tag `sha-` e os 7 primeiros caracteres do commit.

```bash
./rollback.sh sha-39ceccd   # fixa esse commit
./rollback.sh main          # volta a acompanhar a versão mais nova
./rollback.sh --list        # versões já baixadas neste notebook
```

Enquanto `APP_TAG` estiver fixo num `sha-`, o `deploy.sh` não pega versões novas.

O banco aceita voltar versões enquanto nenhuma coluna tiver sido removida. Se um PR remover colunas, a volta pode exigir restaurar o backup anterior ao deploy.

### Backup e limpeza

Agende com `crontab -e`:

```cron
0 3 * * *  $HOME/comercial-irroba/deploy/homolog/backup.sh >> $HOME/irroba-backup.log 2>&1
30 3 * * 0 cd $HOME/comercial-irroba/deploy/homolog && docker compose exec -T app node scripts/captures-gc.mjs --apply >> $HOME/irroba-gc.log 2>&1
```

O `backup.sh` guarda o banco por 14 dias e as capturas por 7 em `~/irroba-backups`. Para mudar, use `BACKUP_DIR`, `KEEP_DAYS` e `CAPTURES_KEEP_DAYS`. O backup fica no mesmo disco, então copie a pasta para um HD externo ou para a nuvem de vez em quando.

Faça um backup manual (`./backup.sh`) antes da primeira execução do `captures:gc`.

### Restaurar

```bash
./restore.sh ~/irroba-backups/db-2026-12-01_0300.db ~/irroba-backups/captures-2026-12-01_0300.tgz
```

O script pede confirmação, faz um backup do estado atual, para o app, troca os arquivos e sobe de novo. Restaure banco e capturas da mesma data. Ensaie isso uma vez durante a homologação.

### Comandos úteis

```bash
docker compose ps                  # estado dos containers
docker compose logs -f --tail 100 app
docker compose restart app
docker compose down                # para tudo (os volumes continuam)
```

Nunca rode `docker compose down -v`. O `-v` apaga os volumes, ou seja, o banco e as capturas.

## Critérios para sair da homologação

| Critério | Como conferir |
|---|---|
| Estável por 2 semanas | Nenhum reinício inesperado em `docker compose ps` |
| Deploys sem susto | Pelo menos 5 deploys e 1 rollback feitos com sucesso |
| Backup confiável | Uma restauração testada |
| Uso real | O time gerou e enviou propostas para clientes |

Em produção, este mesmo compose roda num VPS. Só mudam o domínio, o token do túnel e o `.env`.
