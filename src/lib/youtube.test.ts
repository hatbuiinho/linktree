import assert from 'node:assert/strict';
import { test } from 'node:test';
import { youtubeEmbedUrl, youtubeVideoId, youtubeWatchUrl } from './youtube.ts';

const videoId = 'g4qZclf0P1A';
const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

test('shared video URLs work in previews before saving', () => {
	assert.equal(youtubeEmbedUrl(`https://youtu.be/${videoId}?si=YwgtptcCnkm-qMn6`), embedUrl);
});

test('saved embed URLs remain valid when editing and saving again', () => {
	const saved = youtubeEmbedUrl(`https://youtu.be/${videoId}`);
	assert.equal(youtubeEmbedUrl(saved), embedUrl);
});

test('normalizes every supported URL to a regular YouTube watch link', () => {
	assert.equal(youtubeVideoId(embedUrl), videoId);
	assert.equal(
		youtubeWatchUrl(`https://youtu.be/${videoId}?si=shared`),
		`https://www.youtube.com/watch?v=${videoId}`
	);
	assert.equal(youtubeWatchUrl(embedUrl), `https://www.youtube.com/watch?v=${videoId}`);
});

test('accepts watch, mobile, Shorts, live and embed URLs', () => {
	for (const url of [
		`https://www.youtube.com/watch?v=${videoId}&t=30`,
		`https://m.youtube.com/watch?v=${videoId}`,
		`https://youtube.com/shorts/${videoId}?si=shared`,
		`https://youtube.com/live/${videoId}?si=shared`,
		`https://www.youtube.com/embed/${videoId}`,
		`https://youtube-nocookie.com/embed/${videoId}`,
		`  https://youtu.be/${videoId}  `
	]) {
		assert.equal(youtubeEmbedUrl(url), embedUrl, url);
	}
});

test('rejects invalid IDs, non-video links, unrelated hosts and non-HTTP URLs', () => {
	for (const url of [
		null,
		undefined,
		'',
		'not a URL',
		'https://youtu.be/short',
		`https://youtu.be/${videoId}extra`,
		`https://youtu.be/${videoId}/extra`,
		'https://www.youtube.com/watch',
		'https://www.youtube.com/@channel',
		`https://www.youtube.com/playlist?v=${videoId}`,
		`https://example.com/watch?v=${videoId}`,
		`https://youtube.com.example.com/watch?v=${videoId}`,
		`https://youtube-nocookie.com/watch?v=${videoId}`,
		`ftp://youtu.be/${videoId}`,
		`javascript://www.youtube-nocookie.com/embed/${videoId}`
	]) {
		assert.equal(youtubeEmbedUrl(url), null, String(url));
	}
});
