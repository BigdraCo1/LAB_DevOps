# Ansible Docker Deployment with Let's Encrypt + Cloudflare DNS

Automated deployment of a Node.js application with nginx reverse proxy and **wildcard SSL certificates** using Let's Encrypt and Cloudflare DNS.

## Features

- ✅ **Wildcard SSL Certificate** - One cert for all subdomains (`*.baalz3ro.org`)
- ✅ **Cloudflare DNS Automation** - Zero manual DNS configuration
- ✅ **Auto-Renewal** - systemd timer + nginx reload hook
- ✅ **Docker Compose** - nginx + Node.js app
- ✅ **UFW Firewall** - Configured for SSH, HTTP, HTTPS
- ✅ **Zero Downtime** - `nginx -s reload` on renewal

## Architecture

```
Internet
    │
    ▼
Cloudflare DNS (baalz3ro.org)
    │
    ▼
Ubuntu VM (Docker Host)
├── certbot + dns-cloudflare plugin
│   └── /etc/letsencrypt/live/baalz3ro.org/
│       ├── fullchain.pem  (wildcard cert)
│       └── privkey.pem
│
└── Docker Compose
    ├── nginx (port 443/80)
    │   └── Reverse proxy with TLS termination
    └── myapp (port 3000)
        └── Node.js application
```

## Prerequisites

- Ubuntu VM with Docker & Docker Compose
- Cloudflare account with your domain
- Cloudflare API Token (DNS edit permissions)
- Ansible installed on control machine

## Quick Start

### 1. Get Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Edit zone DNS**
4. Select your zone (domain)
5. Copy the token

### 2. Set Environment Variables

```bash
export CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
export LETSENCRYPT_EMAIL="your-email@example.com"
export PASSWORD="your-sudo-password"
```

### 3. Update Inventory

Edit `inventory.ini`:

```ini
[myhosts]
your_host ansible_host=YOUR_VM_IP ansible_user=YOUR_USER ansible_ssh_private_key_file=~/.ssh/your_key ansible_become_password="{{ lookup('env', 'PASSWORD') }}"

[myhosts:vars]
site_domain=your-domain.com
cloudflare_api_token={{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}
letsencrypt_email={{ lookup('env', 'LETSENCRYPT_EMAIL') }}
```

### 4. Deploy

```bash
ansible-playbook -i inventory.ini playbook.yaml -K
```

## What Gets Deployed

### Certificates

```
/etc/letsencrypt/
├── live/baalz3ro.org/
│   ├── fullchain.pem    # Wildcard certificate
│   └── privkey.pem      # Private key
└── renewal-hooks/
    └── deploy/
        └── reload_nginx.sh  # Auto-reload on renewal
```

### Covered Domains (Wildcard!)

- `https://baalz3ro.org`
- `https://www.baalz3ro.org`
- `https://api.baalz3ro.org`
- `https://*.baalz3ro.org` - **ANY subdomain!**

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80, 443 | Reverse proxy with TLS |
| myapp | 3000 | Node.js application |

### Firewall Rules (UFW)

| Port | Protocol | Description |
|------|----------|-------------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS |

## Auto-Renewal

Certbot timer runs **twice daily** and automatically:

1. Checks if certificate expires within 30 days
2. Renews via Cloudflare DNS challenge
3. Runs `/etc/letsencrypt/renewal-hooks/deploy/reload_nginx.sh`
4. nginx reloads with new certificate (zero downtime)

### Check Status

```bash
# Timer status
sudo systemctl status certbot.timer

# Next run time
sudo systemctl list-timers certbot.timer

# Test renewal
sudo certbot renew --dry-run

# View certificates
sudo certbot certificates
```

## Manual Operations

### Request New Certificate

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 120 \
  -d baalz3ro.org \
  -d *.baalz3ro.org
```

### Force Renewal

```bash
sudo certbot renew --force-renewal
```

### Revoke Certificate

```bash
ansible-playbook -i inventory.ini revoke.yaml -K
```

## Project Structure

```
ansible_quickstart/
├── inventory.ini              # Host configuration
├── playbook.yaml              # Main playbook
├── revoke.yaml                # Revoke & reissue certificate
└── roles/
    └── app_deployment/
        ├── files/
        │   ├── docker-compose.yaml
        │   ├── nginx.conf
        │   ├── Dockerfile
        │   ├── index.js
        │   └── package.json
        ├── templates/
        │   └── cloudflare.ini     # Cloudflare API credentials
        └── tasks/
            ├── main.yaml          # Entry point
            ├── docker.yaml        # Build Docker images
            ├── letsencrypt.yaml   # Certificate automation
            ├── firewall.yaml      # UFW configuration
            └── services.yaml      # Start containers
```

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `site_domain` | Your domain name | `baalz3ro.org` |
| `cloudflare_api_token` | Cloudflare API token | `env: CLOUDFLARE_API_TOKEN` |
| `letsencrypt_email` | Email for Let's Encrypt | `env: LETSENCRYPT_EMAIL` |

## Rate Limits

Let's Encrypt has rate limits:
- **5 certificates** per exact set of domains per week
- Use `--staging` flag for testing (no rate limits, but untrusted cert)

```bash
# Staging (for testing)
certbot certonly --staging --dns-cloudflare ...
```

## Troubleshooting

### Check Logs

```bash
# Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# nginx logs
docker logs nginx

# App logs
docker logs myapp
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Rate limit exceeded | Wait until shown date or use `--staging` |
| DNS propagation failed | Increase `--dns-cloudflare-propagation-seconds` |
| nginx not reloading | Check `/etc/letsencrypt/renewal-hooks/deploy/` permissions |
| Certificate not found | Run `sudo certbot certificates` to verify |

## Security Notes

- Cloudflare API token stored in `/root/.secrets/cloudflare.ini` (mode 0600)
- Private key permissions: 0600 (root only)
- UFW allows only necessary ports
- HSTS header enabled in nginx
- TLS 1.2/1.3 only
