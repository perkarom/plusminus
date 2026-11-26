# Julias + och −

En liten app (PWA) där barn övar plus och minus upp till 20. Den är gjord för en 6-åring.

**Prova appen:** https://perkarom.github.io/plusminus/

![Skärmbilder: startsidan, ett plustal med bilder, ett visat svar vid minus, tiokompisar, resultat med klistermärke och albumet](docs/skarmbilder.png)

- 8 nivåer: plus/minus upp till 5, 10 och 20, tiokompisar och blandat.
- Bilder att räkna på, i grupper om fem. De visas direkt på de lätta nivåerna och via 💡 annars.
- Två försök per tal. Efter två fel visas svaret med bilder.
- Stjärnor per nivå och ett klistermärke efter varje omgång (album med 40 st).
- 🔈 läser upp talet på svenska med inspelade klipp (`audio/`, rösten sv-SE-SofieNeural via edge-tts). Klippen hämtas när talet visas. Saknas ett klipp används telefonens röst.

Vanlig HTML/CSS/JS utan byggsteg. Höj `CACHE` i `sw.js` vid varje ny version.
