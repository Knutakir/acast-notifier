import {Formatters, MessageEmbed} from 'discord.js';
// eslint-disable-next-line import/no-unresolved
import got from 'got';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import {setTimeout} from 'timers/promises';
import discordWebhookWrapper from 'discord-webhook-wrapper';
import httpHeader from './util.js';
import config from './config.js';

dayjs.extend(duration);

const webhookClient = discordWebhookWrapper(config);

// Ensure a show is provided
if (!config.shows) {
    throw new Error('You need to specify a show to watch!');
}

const apiBaseUrl = 'https://feeder.acast.com/api/v1/shows';
const podcastBaseUrl = 'https://play.acast.com/s';
const shows = config.shows.split(',').map(show => show.trim()).filter(show => show !== '');

// Ensure at least one show is provided
if (shows.length === 0) {
    throw new Error('You need to specify a show to watch!');
}

const watchingShows = shows.map(show => ({
    name: show,
    url: `${apiBaseUrl}/${show}`,
    publishDate: '',
    initialCheck: true
}));

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
            const embedMessage = new MessageEmbed()
                .setTitle('🎙️ **New Podcast** 🎙️')
                .setThumbnail(episode.image)
                .addField('Title', episode.title)
                .addField('Duration', dayjs.duration(new Date(0).setSeconds(episode.duration)).format('HH:mm:ss'))
                .addField('Date', Formatters.time(new Date(episode.publishDate), Formatters.TimestampStyles.RelativeTime))
                .addField('URL', `Listen to the podcast [here](${podcastUrl})`);

            await webhookClient.send({embeds: [embedMessage]});
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

// Make it run forever
while (true) {
    try {
        console.log('Checking for new podcasts at:', new Date());

        for (let i = 0; i < watchingShows.length; i++) {
            const watchingShow = watchingShows[i];
            watchingShows[i] = await checkForNewEpisode(watchingShow);
        }
    } catch (error) {
        console.log(error);
    } finally {
        await setTimeout(config.waitTimeout);
    }
}
