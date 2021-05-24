import Discord from 'discord.js';
import got from 'got';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import httpHeader from './util.js';
import config from './config.js';

const {discordWebhookUrl, discordWebhookID, discordWebhookToken} = config;

dayjs.extend(duration);

// Set the locale for the deadline
dayjs.locale(config.timeLocale);

// Check if either Discord Webhook URL or Discord Webhook ID and token is provided
if (!(discordWebhookUrl || (discordWebhookID !== '' && discordWebhookToken !== ''))) {
    throw new Error('You need to specify either Discord Webhook URL or both Discord Webhook ID and token!');
}

// Ensure a show is provided
if (!config.show) {
    throw new Error('You need to specify show to watch!');
}

// Retrieve the ID and token from the Webhook URL
// This is from the Discord Webhook URL format:
// 'https://discord.com/api/webhooks/<ID_HERE>/<TOKEN_HERE>'
// If the Webhook URL is empty get the values from the provided ID and token
const [webhookID, webhookToken] = discordWebhookUrl ? discordWebhookUrl.split('/').splice(5, 2) : [discordWebhookID, discordWebhookToken];
const discordHookClient = new Discord.WebhookClient(webhookID, webhookToken);

// Wait for a specified time (milliseconds)
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const apiBaseUrl = 'https://feeder.acast.com/api/v1/shows';
const podcastBaseUrl = 'https://play.acast.com/s';
let watchingShow = {
    name: config.show,
    url: `${apiBaseUrl}/${config.show}`,
    publishDate: '',
    initialCheck: true
};

async function checkForNewEpisode(show) {
    const response = await got(show.url, {headers: httpHeader}).json();
    const {publishDate} = response;

    if (publishDate === show.publishDate || response.episodes.length === 0) {
        return show;
    }

    let {initialCheck} = show;
    const newPublishDate = publishDate;
    const newEpisodes = response.episodes.filter(episode => episode.publishDate > show.publishDate);

    for (let i = 0; i < newEpisodes.length; i++) {
        const episode = newEpisodes[i];
        console.log(`Found new episode: "${episode.title}"`);

        if (!initialCheck) {
            const podcastUrl = `${podcastBaseUrl}/${show.name}/${episode.acastId}`;
            const embedMessage = new Discord.MessageEmbed()
                .setTitle('🎙️ **New Podcast** 🎙️')
                .setThumbnail(episode.image)
                .addField('Title', episode.title)
                .addField('Duration', dayjs.duration(new Date(0).setSeconds(episode.duration)).format('HH:mm:ss'))
                .addField('Date', dayjs(episode.publishDate).format(config.timeFormat))
                .addField('URL', `Listen to the podcast [here](${podcastUrl})`);

            // eslint-disable-next-line no-await-in-loop
            await discordHookClient.send(embedMessage);
        }
    }

    if (initialCheck) {
        initialCheck = false;
    }

    // Set the latest episode
    return {
        ...show,
        initialCheck,
        publishDate: newPublishDate
    };
}

(async () => {
    // Make it run forever
    while (true) {
        try {
            console.log('Checking for new podcasts at:', new Date());

            // eslint-disable-next-line no-await-in-loop
            watchingShow = await checkForNewEpisode(watchingShow);
        } catch (error) {
            console.log(error);
        } finally {
            // eslint-disable-next-line no-await-in-loop
            await wait(config.waitTimeout);
        }
    }
})();
