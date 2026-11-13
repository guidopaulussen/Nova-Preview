# Nova 2030 — SSH demo

Publieke **demonstratie**, uitsluitend fictieve klantgegevens en adressen. Geen login, geen eBlinqx-koppeling, geen echte klantdata, geen berichten of CRM-wijzigingen. De volledige Nova 2030-broncode blijft in de **privé**-repository.

## Demo op Render plaatsen

[**Publiceer de demo op Render**](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fguidopaulussen%2FNova-Preview)

1. Meld je bij Render aan met je **GitHub-account**.
2. Controleer dat het project `guidopaulussen/Nova-Preview` als bron geselecteerd is.
3. Controleer de Blueprint: één **Static Site**, geen database of backend, geen secrets.
4. Klik op **Deploy Blueprint**.
5. Wacht totdat Render de openbare `onrender.com`-URL toont.

Render gebruikt de meegeleverde `render.yaml` en publiceert **alleen** de expliciet toegestane demo-bestanden naar `dist/`. Publiceer nooit je echte klantdata via deze preview.

## Lokale inhoud

- `index.html`: SSH-layout en fictief hypotheekdossier
- `demo-data.js`: bij openen/reset willekeurige fictieve personen en adres
- `app.js`: demo-interacties
- `packages/mortgage-inventory/domain.js`: pure browserlogica
- `assets/brand/ssh-logo.png`: origineel Schee Scheuller-logo
- `render.yaml`: statische Render-publicatie, zonder backend

## Scope

Dit is een demonstratie van de eerste Nova Mortgage Inventarisatie-interface. De daadwerkelijke Nova 2030-app, authenticatie, veilige eBlinqx-adapter, audit, Advey-verwerking en goedkeuringsbackend worden onafhankelijk ontwikkeld en pas na controles vrijgegeven.
