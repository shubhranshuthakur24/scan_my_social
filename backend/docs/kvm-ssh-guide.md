# How to SSH to the ScanMySocial KVM

Use this guide to connect from your Windows machine to the Hostinger KVM used for the Docker staging deployment.

Current staging KVM IPv4:

```text
187.127.189.144
```

Staging domain:

```text
kvm.scanmysocial.com
```

## 1. Pick The Correct Terminal

Use **Git Bash** if your prompt looks like this:

```text
Cypher@DESKTOP-608NN0E MINGW64 ~
$
```

Use **PowerShell** if your prompt looks like this:

```text
PS C:\Users\Cypher>
```

The path syntax is different in each terminal.

## 2. Connect From Git Bash

First remove any old host fingerprint for the current IP:

```bash
ssh-keygen -R 187.127.189.144
```

Then connect with the default key:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.189.144
```

If that key is not the KVM key, use the named KVM key:

```bash
ssh -i ~/.ssh/scanmysocial-kvm root@187.127.189.144
```

When SSH asks whether to continue connecting, type:

```text
yes
```

Do not type the leading `$` from examples. It is only the terminal prompt.

## 3. Connect From PowerShell

First remove any old host fingerprint:

```powershell
ssh-keygen -R 187.127.189.144
```

Then connect with the default key:

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" root@187.127.189.144
```

If that key is not the KVM key, use:

```powershell
ssh -i "$env:USERPROFILE\.ssh\scanmysocial-kvm" root@187.127.189.144
```

Do not use PowerShell syntax inside Git Bash. For example, this is wrong in Git Bash:

```bash
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" root@187.127.189.144
```

## 4. After Login

Go to the application directory:

```bash
cd /var/www/scanmysocial
```

Check the containers:

```bash
docker compose --env-file .env.docker ps
```

Check the internal Docker web response:

```bash
curl -I http://127.0.0.1:8080
```

Check the public staging HTTPS response:

```bash
curl -I https://kvm.scanmysocial.com
```

## 5. Common Errors

### Identity File Not Accessible

Example:

```text
Warning: Identity file :USERPROFILE\.ssh\id_ed25519 not accessible
```

Cause: PowerShell path syntax was used inside Git Bash.

Fix in Git Bash:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.189.144
```

### Connection Timed Out

Example:

```text
ssh: connect to host 187.127.189.144 port 22: Connection timed out
```

Cause: port `22` is blocked, SSH is not running, or the IP is wrong.

Use Hostinger's browser Terminal and run:

```bash
systemctl status ssh --no-pager
systemctl restart ssh
ss -tulpn | grep ':22'
ufw status verbose
```

If `ufw` is active, allow SSH:

```bash
ufw allow 22/tcp
ufw allow OpenSSH
ufw reload
```

Also confirm Hostinger VPS firewall/security allows inbound TCP `22`.

### Permission Denied Publickey

Example:

```text
Permission denied (publickey)
```

Cause: the private key used locally does not match a public key in `/root/.ssh/authorized_keys` on the KVM.

Check local keys from Git Bash:

```bash
ls -la ~/.ssh
```

Then retry with the correct private key:

```bash
ssh -i ~/.ssh/scanmysocial-kvm root@187.127.189.144
```

## 6. Useful KVM Checks

Check Caddy:

```bash
systemctl status caddy --no-pager
journalctl -u caddy --no-pager -n 80
```

Check listening ports:

```bash
ss -tulpn | grep -E ':22|:80|:443|:8080'
```

Check Docker logs:

```bash
docker compose --env-file .env.docker logs --tail=100 web
docker compose --env-file .env.docker logs --tail=150 app
```

Check Horizon:

```bash
docker compose --env-file .env.docker exec horizon php artisan horizon:status
```

## 7. Redeploy From SSH

After a repo change is pushed to `main`, redeploy from the KVM:

```bash
cd /var/www/scanmysocial
git pull origin main
docker compose --env-file .env.docker build app web
docker compose --env-file .env.docker run --rm app php artisan migrate --force
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker exec -T app php artisan optimize:clear
docker compose --env-file .env.docker exec -T app php artisan optimize
docker compose --env-file .env.docker exec -T horizon php artisan horizon:terminate
docker compose --env-file .env.docker up -d app web horizon scheduler
curl -I https://kvm.scanmysocial.com
```

## 8. Security Notes

- Keep private keys only on your local machine.
- Do not paste private keys into chat, GitHub, or `.env` files.
- Keep `.env.docker` on the VPS only.
- Do not commit `.env.docker`.
- Prefer SSH keys over password login.
- After staging is stable, consider disabling password login for SSH.
