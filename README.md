<p align="center">
  <img src="docs/brand/logo.png" alt="La Fogata" width="160" />
</p>

<h1 align="center">La Fogata</h1>

<p align="center">
  <em>Una fogata para las noches difíciles.</em><br />
  <a href="https://app.lafogata.workers.dev">Sentarte junto al fuego</a> · <a href="README.en.md">English</a>
</p>

---

Hay noches en que lo que pesa no cabe en una conversación. No quieres explicarle nada a nadie, pero tampoco quieres estar solo. La Fogata es un lugar para esas noches.

Te sientas junto a un fuego, de noche, en el bosque. Hay otras personas sentadas contigo, siempre de forma anónima: son animales, no perfiles. Nadie habla. Se acompañan.

## Qué puedes hacer

Solo hay tres gestos, y a propósito no hay más.

- **Echar leña.** El fuego crece con cada tronco y se va apagando solo. Todos los que están contigo lo ven.
- **Entregar una carga.** Escribes lo que te pesa y el fuego lo quema. Lo que escribes nunca sale de tu navegador: no se envía, no se guarda y nadie lo lee, ni siquiera yo.
- **Dejar una petición.** Se eleva con el humo y se vuelve una estrella en el cielo. Puedes dejar una al día. Cuando se cumple, vuelves a tu estrella y lo cuentas.

Y dos cosas más: tocar el fuego para recibir unas palabras breves, y tocar la estrella de otra persona para decirle, con un pez, que estás con ella. Sin saber quién es. Ella sin saber quién eres tú.

## Lo que La Fogata nunca va a tener

Chat. Mensajes directos. Perfiles. «Me gusta». Rachas. Rankings.

No es una red social y no quiere serlo. Nada en ella te pide volver: está ahí cuando la necesites.

## Tu privacidad

- No hay cuentas, ni correo, ni nombre. La aplicación no guarda tu IP.
- Las **cargas** se quedan en tu navegador y desaparecen al quemarse.
- Una **petición** es distinta: es una estrella que otras personas pueden ver. Por eso va a guardarse en el servidor (hoy todavía vive solo en tu navegador, mientras la página está abierta). Será pública y anónima: quien administre el servidor podrá leer su texto, pero no sabrá quién la escribió. Solo se guardará una huella de la llave secreta que tu navegador conserva para reconocer tus estrellas; la llave en sí nunca saldrá de él.
- Todo texto pasa por un filtro antes de mostrarse. Y si lo que escribes muestra señales de que estás en peligro, no se publica nada: aparece una pantalla de ayuda.

## Por qué existe

La hice porque creo que acompañarse no necesita palabras bonitas ni soluciones: a veces basta con saber que no eres la única persona despierta.

No reemplaza a un profesional ni a la gente que te quiere. Si estás pasando por algo muy duro, busca ayuda: en [findahelpline.com](https://findahelpline.com) hay líneas de apoyo en casi cualquier país.

## Cómo está hoy

Es la primera versión. Lo que ya funciona: la fogata, los animales, la leña y las cargas que todos ven, las estrellas, el cielo que gira, la palabra del fuego y el sonido. Cada fogata admite hasta siete personas, y cuando se llena entras a otra: nadie espera.

Lo que viene: que las peticiones queden guardadas, que el cielo sea el mismo para todos (hoy cada quien ve solo el suyo) y que veas, lejos entre los árboles, las otras fogatas del bosque.

## Correrla en tu computador

Necesitas Node 22 o superior y pnpm.

```sh
corepack enable
pnpm install
pnpm dev
```

La web queda en `http://localhost:3000` y el servidor en tiempo real en `http://localhost:8787`. Si abres la web desde tu teléfono, en la misma red, con `http://<la dirección de tu computador>:3000`, verás a las personas de ambos dispositivos en el mismo fuego. No necesitas ninguna cuenta ni credencial.

## Montar tu propia fogata

El código es libre: cualquiera puede levantar la suya, en una cuenta gratuita de Cloudflare. Los pasos, y dónde vive cada secreto, están en [docs/DEPLOY.md](docs/DEPLOY.md).

## Ayudar

Si quieres ayudar, bienvenida. Lee primero la [guía para contribuir](CONTRIBUTING.md) y el [código de conducta](CODE_OF_CONDUCT.md). Si encuentras un problema de seguridad, escríbelo como dice [SECURITY.md](SECURITY.md) y no en un issue público.

Las decisiones importantes están explicadas en [docs/decisions](docs/decisions), y cómo está armado todo, en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Licencia

[MIT](LICENSE). Úsala, cámbiala y compártela.
