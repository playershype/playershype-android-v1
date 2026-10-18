#!/usr/bin/env python3
"""Recover day-backed tracks in a build copy; never overwrite the source config."""
import argparse
import json
from pathlib import Path

def prepare(config):
    tracks = config['tracks']
    known = {track['id'] for track in tracks}
    for track_id, day in config.get('raceDays', {}).items():
        if track_id not in known:
            tracks.append({'id': track_id, 'name': track_id.replace('-', ' ').replace('_', ' ').title(),
                           'races': len(day.get('races', [])), 'status': day.get('status', 'unpublished')})
            known.add(track_id)
    return config

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('output')
    args = parser.parse_args()
    source, output = Path(args.source).resolve(), Path(args.output).resolve()
    if source == output:
        parser.error('Build copy must differ from the source')
    data = prepare(json.loads(source.read_text(encoding='utf-8')))
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
