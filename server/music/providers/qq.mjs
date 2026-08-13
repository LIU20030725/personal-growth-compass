import { MusicResolverError, fetchWithTimeout, readBoundedJson } from '../security.mjs';

export const qqAdapter = {
  provider: 'qq',
  async resolve(link, fetcher) {
    const endpoint = `https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?songmid=${link.id}&format=json`;
    const response = await fetchWithTimeout(fetcher, endpoint, { headers: { accept: 'application/json', referer: 'https://y.qq.com/' } });
    const data = await readBoundedJson(response);
    const song = Array.isArray(data?.data) ? data.data[0] : null;
    if (!song?.name) throw new MusicResolverError('METADATA_NOT_FOUND', '没有找到这首 QQ 音乐歌曲的公开信息', 404);
    const albumMid = typeof song.album?.mid === 'string' ? song.album.mid : '';
    return {
      provider: 'qq', title: String(song.name),
      artist: (Array.isArray(song.singer) ? song.singer : []).map((artist) => artist?.name).filter(Boolean).join(' / '),
      coverUrl: albumMid ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumMid}.jpg` : '', sourceUrl: link.sourceUrl
    };
  }
};

