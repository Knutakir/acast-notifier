import {Formatters, EmbedBuilder} from 'discord.js';
import got from 'got';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import {setTimeout} from 'node:timers/promises';
import discordWebhookWrapper from 'discord-webhook-wrapper';
import getPackageUserAgent from 'package-user-agent';
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
	const packageUserAgent = await getPackageUserAgent();
	const response = await got(show.url, {headers: packageUserAgent}).json();
	const {publishDate, episodes} = response;

	if (publishDate === show.publishDate || episodes.length === 0) {
		return show;
	}

	let {initialCheck} = show;
	const newPublishDate = publishDate;
	const newEpisodes = episodes.filter(episode => episode.publishDate > show.publishDate);

	// eslint-disable-next-line no-restricted-syntax
	for (const episode of newEpisodes) {
		console.log(`Found new episode: "${episode.title}"`);

		if (!initialCheck) {
			// eslint-disable-next-line unicorn/consistent-destructuring
			const podcastUrl = `${podcastBaseUrl}/${show.name}/${episode.acastId}`;
			const embedMessage = new EmbedBuilder()
				.setTitle('🎙️ **New Podcast** 🎙️')
				.setThumbnail(episode.image)
				.addFields({name: 'Title', value: episode.title})
				.addFields({name: 'Duration', value: dayjs.duration(new Date(0).setSeconds(episode.duration)).format('HH:mm:ss')})
				.addFields({name: 'Date', value: Formatters.time(new Date(episode.publishDate), Formatters.TimestampStyles.RelativeTime)})
				.addFields({name: 'URL', value: `Listen to the podcast [here](${podcastUrl})`});

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

		for (let index = 0; index < watchingShows.length; index++) {
			const watchingShow = watchingShows[index];
			watchingShows[index] = await checkForNewEpisode(watchingShow);
		}
	} catch (error) {
		console.log(error);
	} finally {
		await setTimeout(config.waitTimeout);
	}
}
