/* Shared Android/web reader. Never merge today's analyses into an archived day. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (!root.PlayersHypeHistory) {
    const api = root.PlayersHypeHistory = factory();
    api.ready = fetch(new URL('history/2026-10-05/parx-racing.json', location.href))
      .then(r => { if (!r.ok) throw Error('Historical source HTTP ' + r.status); return r.json(); })
      .then(data => api.addLegacy(data))
      .catch(() => { api.legacyUnavailable = true; })
      .finally(() => root.dispatchEvent(new Event('playershype:history-ready')));
  }
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const legacy = [];
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const days = raw => Array.isArray(raw) ? raw : Array.isArray(raw?.days) ? raw.days : raw ? [raw] : [];
  const usable = day => validDate(day?.date) && Array.isArray(day.races) && day.races.length > 0 && day.status !== 'unpublished';
  function tracks(config) {
    const registered = new Map((config.tracks || []).map(t => [t.id, t]));
    const ids = new Set([...registered.keys(), ...Object.keys(config.raceDays || {}), ...Object.keys(config.raceDayHistory || {})]);
    for (const source of legacy) for (const t of source.tracks || []) {
      ids.add(t.id); if (!registered.has(t.id)) registered.set(t.id, t);
    }
    return [...ids].filter(id => registered.get(id)?.enabled !== false).map(id => clone(registered.get(id) || {
      id, name: id.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), enabled: true
    }));
  }
  function sourceFor(config, track, date) {
    const history = object(config.raceDayHistory?.[track]);
    // Presence of a snapshot is authoritative, even if incomplete. No live fallback.
    if (Object.prototype.hasOwnProperty.call(history, date)) {
      const s = object(history[date]);
      return { day: s.day, analyses: s.analyses, horseData: s.horseData, report: s.report, archived: true };
    }
    const day = days(config.raceDays?.[track]).find(d => d?.date === date);
    if (day) return { day, analyses: config.hypepredict?.analyses, horseData: config.horseData,
      report: config.hypepredict?.reportsByTrack?.[track] || config.reportsByTrack?.[track] || config.hypepredict?.latestReport, archived: false };
    for (const source of legacy) {
      const day = days(source.raceDays?.[track]).find(d => d?.date === date);
      if (day) return { day, analyses: source.hypepredict?.analyses, horseData: source.horseData,
        report: source.hypepredict?.reportsByTrack?.[track] || source.hypepredict?.latestReport, archived: true };
    }
    return null;
  }
  function resolve(config, track, date) {
    if (!validDate(date)) return null;
    const s = sourceFor(config, track, date);
    if (!s || !usable(s.day) || s.day.date !== date) return null;
    const analyses = {}, horseData = {}, sourceAnalyses = object(s.analyses), entries = new Set();
    for (const race of s.day.races) {
      const a = sourceAnalyses[race.id] || Object.values(sourceAnalyses).find(a => a?.raceId === race.id);
      if (a && a.status === 'published' && (!a.trackId || a.trackId === track) && (!a.raceId || a.raceId === race.id)
          && (!a.date || a.date === date) && (!a.raceDate || a.raceDate === date)) {
        analyses[race.id] = clone(a);
        for (const h of a.horses || []) if (h.entryId) entries.add(h.entryId);
      }
      for (const h of race.entries || []) if (h.id) entries.add(h.id);
    }
    for (const id of entries) if (object(s.horseData)[id]) horseData[id] = clone(s.horseData[id]);
    const report = s.report?.trackId === track && s.report?.date === date ? clone(s.report) : null;
    return { day: clone(s.day), analyses, horseData, report, archived: s.archived };
  }
  function datesFor(config, track) {
    const values = [...days(config.raceDays?.[track]).map(d => d?.date), ...Object.keys(config.raceDayHistory?.[track] || {})];
    for (const source of legacy) values.push(...days(source.raceDays?.[track]).map(d => d?.date));
    return [...new Set(values.filter(validDate))].filter(date => Object.keys(resolve(config, track, date)?.analyses || {}).length).sort().reverse();
  }
  function dates(config) { return [...new Set(tracks(config).flatMap(t => datesFor(config, t.id)))].sort().reverse(); }
  function forDate(config, date) {
    const out = { ...config, tracks: [], raceDays: {}, horseData: {}, reportsByTrack: {},
      hypepredict: { ...config.hypepredict, analyses: {}, reportsByTrack: {}, latestReport: {} },
      historyContext: { date, archivedTracks: [] } };
    for (const track of tracks(config)) {
      const s = resolve(config, track.id, date);
      if (!s || !Object.keys(s.analyses).length) continue;
      out.tracks.push({ ...track, races: s.day.races.length, status: s.day.status });
      out.raceDays[track.id] = s.day;
      Object.assign(out.hypepredict.analyses, s.analyses);
      Object.assign(out.horseData, s.horseData);
      if (s.report) out.hypepredict.reportsByTrack[track.id] = s.report;
      if (s.archived) out.historyContext.archivedTracks.push(track.id);
    }
    return out;
  }
  function select(config, date, track) {
    const selectedDate = date || (track ? datesFor(config, track)[0] : dates(config)[0]) || '';
    const selected = forDate(config, selectedDate);
    // An explicit unavailable track must not silently become another track.
    return { date: selectedDate, track: track || selected.tracks[0]?.id || '', config: selected };
  }
  function addLegacy(source) { if (source?.raceDays && source?.hypepredict) legacy.push(clone(source)); }
  return { tracks, dates, datesFor, resolve, forDate, select, addLegacy };
});
