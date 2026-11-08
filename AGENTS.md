# Desktop architecture
- Package only the independent remote-site Electron wrapper; never website source, credentials or cloud secrets. Why: desktop packaging must not change business or account rules.
- Allow only the exact configured official HTTPS origin in window/frame navigation; route safe external links to the system browser and expose no preload/IPC bridge. Why: remote pages must not gain local execution capability.
- Use a persistent isolated Electron session without copying cookies or browser profiles. Why: keep account/password login across restarts while retaining server-side authorization.
- Build NSIS x64 installers on Windows GitHub Actions; keep website reloads distinct from future signed executable updates. Why: website deployment does not replace desktop binaries.