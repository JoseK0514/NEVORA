# The tablet hand-off, one real run in each language

Real app on the owned local server and database, fictional Owner and tablets. Commit under test: the patch's final content except the last recovery-only change. Times are UTC. The setup code itself was never written to this log.

## Run 1 (English, 1024x768)
- 20:17:15 Owner: added a tablet; the page shows "Connect Hand-off tablet" with a QR code
- 20:17:15 Link shape: <origin>/clocker/scan-kiosk#setup=<code> ; query string: (none)
- 20:17:17 Tablet 1024x768 (en): opened the link; heading "Setup code received"; address bar now <origin>/clocker/scan-kiosk
- 20:17:17 Tablet: code in page HTML: false; in localStorage/sessionStorage: false
- 20:17:18 Tablet: tapped Connect tablet; heading "This tablet is connected to Northside Café — Calle Loíza"; band status "Tablet registered Puerto Rico time · Hand-off tablet Powered by VELANI LLC"
- 20:17:24 Tablet: the time clock opened by itself; heading "Enter your Employee ID"
- 20:17:24 Requests that carried the code in a URL: none
- 20:17:25 Second tablet, same link: refused with "This setup code is expired, already used, or for another location. Ask the Owner for a new code."; focus on textarea "" solid 2px
- 20:17:29 Owner: after a reload the row reads "Hand-off tablet Calle Loíza · Connected · Last used Nov 17, 4:17 PM Manage"

## Run 2 (Spanish, 768x1024)
- 20:17:34 Owner: added a tablet; the page shows "Connect Tableta de prueba" with a QR code
- 20:17:34 Link shape: <origin>/clocker/scan-kiosk#setup=<code> ; query string: (none)
- 20:17:36 Tablet 768x1024 (es): opened the link; heading "Código de configuración recibido"; address bar now <origin>/clocker/scan-kiosk
- 20:17:36 Tablet: code in page HTML: false; in localStorage/sessionStorage: false
- 20:17:36 Tablet: tapped Connect tablet; heading "Esta tableta quedó registrada en Northside Café — Calle Loíza"; band status "Tableta registrada Hora de Puerto Rico · Tableta de prueba"
- 20:17:43 Tablet: the time clock opened by itself; heading "Ingresa tu ID de empleado"
- 20:17:43 Requests that carried the code in a URL: none
- 20:17:45 Second tablet, same link: refused with "Este código venció, ya se usó o es de otra ubicación. Pide al dueño un código nuevo."; focus on textarea "" solid 2px
- 20:17:50 Owner: after a reload the row reads "Tableta de prueba Calle Loíza · Connected · Last used Nov 17, 4:17 PM Manage"
