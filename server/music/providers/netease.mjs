import { MusicResolverError, fetchWithTimeout, normalizePublicText, readBoundedJson } from '../security.mjs';

export const neteaseAdapter = {
  provider: 'netease',
  async resolve(link, fetcher) {
    const endpoint = `https://music.163.com/api/song/detail/?id=${link.id}&ids=%5B${link.id}%5D`;
    const response = await fetchWithTimeout(fetcher, endpoint, { headers: { accept: 'application/json', referer: 'https://music.163.com/' } });
    const data = await readBoundedJson(response);
    const song = Array.isArray(data?.songs) ? data.songs[0] : null;
    if (!song?.name) throw new MusicResolverError('METADATA_NOT_FOUND', '没有找到这首网易云歌曲的公开信息', 404);
    return {
      provider: 'netease', title: normalizePublicText(song.name, 300, { required: true }),
      artist: normalizePublicText((Array.isArray(song.artists) ? song.artists : []).map((artist) => typeof artist?.name === 'string' ? artist.name : '').filter(Boolean).join(' / '), 1000),
      coverUrl: safeNetEaseCover(song.album?.picUrl), sourceUrl: link.sourceUrl
    };
  }
};

function safeNetEaseCover(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'music.126.net' || url.hostname.endsWith('.music.126.net')) ? url.toString() : '';
  } catch { return ''; }
}
