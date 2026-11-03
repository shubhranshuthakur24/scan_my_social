# KVM SSH Guide TODO

## Goal

Document the exact SSH process for connecting from Windows to the ScanMySocial Hostinger KVM and recovering from common SSH errors.

## Current Status

- [x] Documented Git Bash SSH commands.
- [x] Documented PowerShell SSH commands.
- [x] Documented the current staging KVM IP.
- [x] Documented default and named private-key paths.
- [x] Documented common SSH errors and fixes.
- [x] Documented first checks to run after login.
- [x] Documented Docker, Caddy, Horizon, and redeploy commands.
- [ ] Revisit after production cutover and update the IP/domain if the KVM changes.

## Implementation Plan

1. Keep the guide focused on operator commands.
2. Avoid storing secrets, private keys, or passwords.
3. Keep staging-specific values clearly labeled.
4. Update this guide whenever the KVM IP, deploy user, or SSH hardening policy changes.
