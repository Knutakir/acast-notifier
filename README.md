# acast-notifier

> 🎙️ Get notified about new podcast episodes for [Acast](https://acast.com) shows

[![Docker Pulls](https://img.shields.io/docker/pulls/knutkirkhorn/acast-notifier)](https://hub.docker.com/r/knutkirkhorn/acast-notifier) [![Docker Image Size](https://badgen.net/docker/size/knutkirkhorn/acast-notifier)](https://hub.docker.com/r/knutkirkhorn/acast-notifier)

Notifies on Discord if there are new [Acast](https://acast.com) episodes for given show(s). Uses their [Feeder API](https://feeder.acast.com/api/v1) for fetching episodes from shows. It notifies to a Discord channel using [Discord Webhooks](https://discord.com/developers/docs/resources/webhook).

<div align="center">
	<img src="https://raw.githubusercontent.com/knutkirkhorn/acast-notifier/main/media/top-image.png" alt="Acast episode notification example">
</div>

## Usage

### Within a Docker container

#### From Docker Hub Image

This will pull the image from [Docker Hub](https://hub.docker.com/) and run the image with the provided configuration for web hooks as below. One can provide only the Webhook URL or both the Webhook ID and token.

```sh
# Providing a Discord Webhook URL and a single show
$ docker run -d -e DISCORD_WEBHOOK_URL=<URL_HERE> -e SHOWS=krimpodden knutkirkhorn/acast-notifier

# Providing a Discord Webhook URL and multiple shows
$ docker run -d -e DISCORD_WEBHOOK_URL=<URL_HERE> -e SHOWS=krimpodden,verdensgang knutkirkhorn/acast-notifier
```

#### From source code

```sh
# Build container from source
$ docker build -t acast-notifier .

# Providing a single show
$ docker run -d -e DISCORD_WEBHOOK_URL=<URL_HERE> -e SHOWS=krimpodden acast-notifier

# Providing multiple shows
$ docker run -d -e DISCORD_WEBHOOK_URL=<URL_HERE> -e SHOWS=krimpodden,verdensgang acast-notifier
```

### Outside of a Docker container

```sh
# Install
$ npm install

# Run
$ npm start
```

### Environment variables

Provide these with the docker run command or store these in a `.env` file.

- `DISCORD_WEBHOOK_URL`
    - URL to the Discord Webhook containing both the ID and the token
    - Format: `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/<ID_HERE>/<TOKEN_HERE>`
- `DISCORD_WEBHOOK_ID`
    - ID for the Discord Webhook
- `DISCORD_WEBHOOK_TOKEN`
    - Token for the Discord Webhook
- `WAIT_TIMEOUT` ***(optional)***
    - The time interval in milliseconds between each check to the APIs.
    - Default: `3600000` (60 minutes)
- `SHOWS`
    - An array containing the names of the shows to notify about new episodes. The show names can be retrieved from the URL: `https://play.acast.com/s/<show_name>`
